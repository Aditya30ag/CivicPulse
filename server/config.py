import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent

load_dotenv(BASE_DIR / ".env")


def _resolve_model_path(value: str) -> str:
    """
    Resolve YOLO_MODEL_PATH so that relative paths work regardless of CWD.

    Relative paths are tried against the server/ directory first, then the
    project root, and the first existing file wins.
    """
    value = value.strip('"').strip("'")
    path = Path(value) if value else None
    if path is None:
        return str(BASE_DIR / "models" / "best.pt")
    if path.is_absolute():
        return str(path)
    for candidate in (BASE_DIR / path, PROJECT_ROOT / path):
        if candidate.exists():
            return str(candidate)
    return str(BASE_DIR / path)


class Settings:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip('"').strip("'")

    # Path to the custom-trained YOLO26 model checkpoint (best.pt)
    YOLO_MODEL_PATH = _resolve_model_path(os.getenv("YOLO_MODEL_PATH", "models/best.pt"))
    # Whether PerceptionAgent should run the optional Gemini enrichment stage
    # (generates severity/title/description/reasoning). When disabled, those fields are null.
    PERCEPTION_ENABLE_LLM_STAGE = os.getenv("PERCEPTION_ENABLE_LLM_STAGE", "true").strip().lower() in ("1", "true", "yes")
    # Minimum confidence (0-1) for a YOLO detection to be accepted. Lower it if the
    # model misses real detections; raise it if you get too many false positives.
    YOLO_CONF_THRESHOLD = float(os.getenv("YOLO_CONF_THRESHOLD", "0.25"))

    CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME", "").strip('"').strip("'")
    CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY", "").strip('"').strip("'")
    CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET", "").strip('"').strip("'")

    PORT = int(os.getenv("PORT", "8000"))
    HOST = os.getenv("HOST", "0.0.0.0")


settings = Settings()