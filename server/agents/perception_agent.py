import io
import logging
import os
import threading
from typing import Any, Dict, Optional

import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError
from pydantic import BaseModel, Field

from server.agents.base import BaseAgent
from server.config import settings
from server.services.gemini_service import clean_and_parse_json, generate_content_with_image_bytes

logger = logging.getLogger(__name__)

# Canonical category names matching the custom-trained YOLO26 model.
# Used as a fallback when the loaded checkpoint does not expose class names.
YOLO_CLASS_NAMES: Dict[int, str] = {
    0: "fallen_tree",
    1: "garbage",
    2: "pothole",
    3: "streetlight",
    4: "water_leak",
}


class PerceptionError(Exception):
    """Base error for perception failures."""


class ImageLoadError(PerceptionError):
    """Raised when the provided image bytes cannot be decoded into an image."""


class NoDetectionError(PerceptionError):
    """Raised when YOLO finds no objects of interest in the image."""


class ModelLoadError(PerceptionError):
    """Raised when the YOLO model cannot be loaded."""


class BBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float


class PerceptionResult(BaseModel):
    detected: bool = Field(True, description="Whether a civic issue was detected in the image")
    category: Optional[str] = Field(None, description="Detected issue category (YOLO class name)")
    confidence: Optional[float] = Field(None, description="Detection confidence score between 0 and 1")
    bbox: Optional[BBox] = Field(None, description="Bounding box of the detection in pixel coordinates (xyxy)")
    severity: Optional[int] = Field(None, description="Severity score integer 1-10 (LLM stage)")
    title: Optional[str] = Field(None, description="Short title max 8 words (LLM stage)")
    description: Optional[str] = Field(None, description="Concise description max 30 words (LLM stage)")
    reasoning: Optional[str] = Field(None, description="Reasoning for the severity score max 20 words (LLM stage)")


# Process-wide shared agent instance so the YOLO model is loaded once per
# application process and reused across requests, instead of being reloaded on
# every /perceive call. Kept private to the module; access via
# get_perception_agent().
_perception_lock = threading.Lock()
_shared_agent: Optional["PerceptionAgent"] = None


def get_perception_agent() -> "PerceptionAgent":
    """Return the process-wide shared PerceptionAgent, creating it lazily.

    The agent is created on first use (so the YOLO model is not loaded at
    application startup) and reused afterwards. Thread-safe via double-checked
    locking.
    """
    global _shared_agent
    if _shared_agent is None:
        with _perception_lock:
            if _shared_agent is None:
                _shared_agent = PerceptionAgent()
    return _shared_agent


class PerceptionAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="Perception",
            role="Detects civic issues in images with a custom-trained YOLO26 model and optionally enriches them with an LLM stage."
        )
        self._model = None

    def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        image_bytes = inputs.get("image_bytes")
        if image_bytes is None:
            image_url = inputs.get("image_url")
            if not image_url:
                raise ValueError("image_bytes (or image_url) is required for PerceptionAgent execution.")
            image_bytes = self._download_image(image_url)

        image = self._decode_image(image_bytes)

        # No civic issue found is a normal outcome, not an error: return a
        # detected=False result so callers (and the frontend manual fallback)
        # can handle it gracefully instead of surfacing 404/500 errors.
        try:
            detection = self._run_yolo(image)
        except NoDetectionError:
            logger.info("No civic issue detected in image; returning no-detection result")
            return PerceptionResult(detected=False).model_dump()

        result: Dict[str, Any] = {
            "detected": True,
            "category": detection["category"],
            "confidence": detection["confidence"],
            "bbox": detection["bbox"],
            "severity": None,
            "title": None,
            "description": None,
            "reasoning": None,
        }

        if settings.PERCEPTION_ENABLE_LLM_STAGE:
            result.update(self._generate_llm_fields(image, detection))

        return PerceptionResult(**result).model_dump()

    # -- YOLO inference ------------------------------------------------------

    def _get_model(self):
        """Lazily load (and cache) the custom-trained YOLO26 model."""
        if self._model is None:
            # Guard first-time loading so concurrent requests do not create
            # multiple model instances. Loading is kept lazy: nothing is loaded
            # until the first request that needs a detection.
            with _perception_lock:
                if self._model is None:
                    model_path = settings.YOLO_MODEL_PATH
                    # Explicit check: ultralytics silently downloads a default model
                    # (e.g. yolov8n.pt) when the given path does not exist.
                    if not os.path.exists(model_path):
                        raise ModelLoadError(
                            f"YOLO model file not found at '{model_path}'. "
                            f"Place best.pt there or set YOLO_MODEL_PATH in server/.env."
                        )
                    try:
                        from ultralytics import YOLO

                        self._model = YOLO(model_path)
                        logger.info("Loaded YOLO model from %s", model_path)
                    except Exception as e:
                        raise ModelLoadError(
                            f"Failed to load YOLO model from '{model_path}': {e}"
                        ) from e
        return self._model

    def _run_yolo(self, image: Image.Image) -> Dict[str, Any]:
        model = self._get_model()

        try:
            results = model.predict(np.array(image), verbose=False, conf=settings.YOLO_CONF_THRESHOLD)
        except Exception as e:
            raise PerceptionError(f"YOLO inference failed: {e}") from e

        if not results or len(results[0].boxes) == 0:
            raise NoDetectionError(
                "No civic issue detected in the image. Try a clearer photo of a fallen tree, "
                "garbage, pothole, streetlight, or water leak."
            )

        boxes = results[0].boxes
        best_idx = int(boxes.conf.argmax().item())

        class_id = int(boxes.cls[best_idx].item())
        confidence = float(boxes.conf[best_idx].item())
        x1, y1, x2, y2 = (float(v) for v in boxes.xyxy[best_idx].tolist())

        names = getattr(model, "names", None) or YOLO_CLASS_NAMES
        category = str(names.get(class_id, YOLO_CLASS_NAMES.get(class_id, "unknown")))

        return {
            "category": category,
            "confidence": confidence,
            "bbox": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
        }

    # -- Optional LLM enrichment stage ---------------------------------------

    def _generate_llm_fields(self, image: Image.Image, detection: Dict[str, Any]) -> Dict[str, Any]:
        prompt = (
            "You are a civic issue reporter. A YOLO model has already detected and classified "
            "the issue in the image; your job is enrichment only, do NOT reclassify the issue.\n"
            "YOLO detection (treat as ground truth):\n"
            f"- category: {detection['category']}\n"
            f"- confidence: {detection['confidence']:.2f}\n"
            f"- bounding box (pixels): {detection['bbox']}\n"
            "Analyze the image and respond with ONLY valid JSON, no markdown code blocks.\n"
            "Schema:\n"
            '{"severity": integer 1-10, '
            '"title": short string max 8 words, '
            '"description": string max 30 words, '
            '"reasoning": string max 20 words explaining the severity score}'
        )

        buffer = io.BytesIO()
        image.save(buffer, format="JPEG")
        raw_response = generate_content_with_image_bytes(buffer.getvalue(), "image/jpeg", prompt)
        parsed_json = clean_and_parse_json(raw_response, "PerceptionAgent LLM enrichment")

        # Invalid or missing Gemini severity becomes None (never an invented
        # score). Only genuinely numeric values are clamped into the 1-10 range.
        severity_value = None
        severity = parsed_json.get("severity")
        if severity is not None:
            try:
                severity_value = int(severity)
            except (TypeError, ValueError):
                logger.warning(
                    "LLM stage returned invalid severity %r; setting severity to null", severity
                )
                severity_value = None
        if severity_value is not None:
            severity_value = max(1, min(10, severity_value))

        return {
            "severity": severity_value,
            "title": parsed_json.get("title"),
            "description": parsed_json.get("description"),
            "reasoning": parsed_json.get("reasoning"),
        }

    # -- Helpers -------------------------------------------------------------

    def _download_image(self, image_url: str) -> bytes:
        import requests

        try:
            response = requests.get(image_url, timeout=30)
            response.raise_for_status()
        except requests.RequestException as e:
            raise ImageLoadError(f"Failed to fetch image from URL {image_url}: {e}") from e
        return response.content

    def _decode_image(self, image_bytes: bytes) -> Image.Image:
        try:
            image = Image.open(io.BytesIO(image_bytes))
            # Phone photos store rotation in EXIF; without this, portrait uploads
            # are fed to YOLO sideways and detections fail.
            image = ImageOps.exif_transpose(image)
            image.load()
        except (UnidentifiedImageError, OSError, ValueError) as e:
            raise ImageLoadError(f"Invalid image data provided: {e}") from e
        return image.convert("RGB")
