"""
Tests for the YOLO26 + Gemini perception changes.

Covers:
- process-wide shared PerceptionAgent / YOLO model caching
- /perceive content-type handling (multipart, octet-stream, JSON, unsupported)
- invalid Gemini severity -> null (no invented score)
- no detection returns detected=false (200), not an error
- error mapping (400 invalid image, 500 missing model)
- /process-report pipeline wiring to PerceptionAgent and graceful no-detection short-circuit

Run from the project root with:
    python -m unittest discover -s server/tests -p "test_*.py" -v
or:
    python server/tests/test_perception.py
"""
import io
import json
import sys
import unittest
from pathlib import Path
from unittest import mock

SERVER_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = SERVER_DIR.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import numpy as np
from fastapi import FastAPI
from fastapi.testclient import TestClient
from PIL import Image

from server.config import settings
from server.routes.agent_routes import router as agent_router
from server.agents import perception_agent as perception_module
from server.agents.perception_agent import (
    PerceptionAgent,
    ModelLoadError,
    get_perception_agent,
)
from server.agents.deduplication_agent import DeduplicationAgent
from server.agents.severity_agent import SeverityAgent
from server.agents.orchestrator_agent import OrchestratorAgent
from server.workflows.report_processing_workflow import ReportProcessingWorkflow

PERCEIVE_URL = "/api/v1/agents/perceive"
GEMINI_PAYLOAD = json.dumps(
    {
        "severity": 7,
        "title": "Deep pothole",
        "description": "Large pothole on the main road near the junction.",
        "reasoning": "Deep and wide, dangerous for vehicles.",
    }
)


def make_test_image_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (64, 64), color=(120, 90, 40)).save(buf, format="JPEG")
    return buf.getvalue()


def make_client():
    app = FastAPI()
    app.include_router(agent_router)
    return TestClient(app)


# -- YOLO fakes --------------------------------------------------------------


class FakeBoxes:
    """Mimics the subset of the ultralytics Boxes API used by _run_yolo."""

    def __init__(self, cls_ids, confs, xyxy):
        self.cls = np.array(cls_ids, dtype=np.float32)
        self.conf = np.array(confs, dtype=np.float32)
        self.xyxy = np.array(xyxy, dtype=np.float32)

    def __len__(self):
        return len(self.conf)


class FakePredictResult:
    def __init__(self, boxes):
        self.boxes = boxes


class FakeYOLO:
    names = {0: "pothole", 1: "garbage", 2: "streetlight"}
    instances = []

    def __init__(self, path):
        self.path = str(path)
        self._detections = [FakePredictResult(FakeBoxes([0], [0.92], [[2.0, 3.0, 60.0, 61.0]]))]

    @classmethod
    def create(cls, path):
        inst = cls(path)
        cls.instances.append(inst)
        return inst

    def predict(self, *args, **kwargs):
        return self._detections


class EmptyYOLO(FakeYOLO):
    """Fake model that never detects anything."""

    def __init__(self, path):
        super().__init__(path)
        self._detections = [FakePredictResult(FakeBoxes([], [], np.empty((0, 4))))]


# -- Tests -------------------------------------------------------------------


class PerceptionAgentUnitTests(unittest.TestCase):
    def test_shared_agent_is_singleton(self):
        a = get_perception_agent()
        b = get_perception_agent()
        self.assertIs(a, b)

    def test_model_loaded_once_and_cached_on_instance(self):
        agent = PerceptionAgent()
        FakeYOLO.instances.clear()
        with mock.patch("ultralytics.YOLO", side_effect=FakeYOLO.create) as yolo_mock:
            model1 = agent._get_model()
            model2 = agent._get_model()
        self.assertIs(model1, model2)
        yolo_mock.assert_called_once()
        self.assertEqual(len(FakeYOLO.instances), 1)
        self.assertIsNotNone(agent._model)

    def test_model_not_loaded_until_requested(self):
        agent = PerceptionAgent()
        self.assertIsNone(agent._model)  # lazy: nothing loaded at construction

    def test_missing_model_raises_model_load_error(self):
        agent = PerceptionAgent()
        with mock.patch.object(settings, "YOLO_MODEL_PATH", "/no/such/dir/best.pt"):
            with self.assertRaises(ModelLoadError):
                agent._get_model()

    def test_invalid_gemini_severity_becomes_none(self):
        agent = PerceptionAgent()
        image = Image.new("RGB", (16, 16))
        detection = {
            "category": "pothole",
            "confidence": 0.92,
            "bbox": {"x1": 1.0, "y1": 2.0, "x2": 3.0, "y2": 4.0},
        }
        raw = json.dumps({"severity": "banana", "title": "T", "description": "D", "reasoning": "R"})
        with mock.patch.object(perception_module, "generate_content_with_image_bytes", return_value=raw):
            out = agent._generate_llm_fields(image, detection)
        self.assertIsNone(out["severity"])
        self.assertEqual(out["title"], "T")

    def test_missing_gemini_severity_becomes_none(self):
        agent = PerceptionAgent()
        image = Image.new("RGB", (16, 16))
        detection = {"category": "pothole", "confidence": 0.9, "bbox": {"x1": 1, "y1": 2, "x2": 3, "y2": 4}}
        raw = json.dumps({"title": "T", "description": "D", "reasoning": "R"})
        with mock.patch.object(perception_module, "generate_content_with_image_bytes", return_value=raw):
            out = agent._generate_llm_fields(image, detection)
        self.assertIsNone(out["severity"])

    def test_severity_clamped_to_valid_range(self):
        agent = PerceptionAgent()
        image = Image.new("RGB", (16, 16))
        detection = {"category": "pothole", "confidence": 0.9, "bbox": {"x1": 1, "y1": 2, "x2": 3, "y2": 4}}
        for raw_severity, expected in (("12", 10), ("0", 1), ("7", 7)):
            raw = json.dumps({"severity": raw_severity, "title": "T", "description": "D", "reasoning": "R"})
            with mock.patch.object(perception_module, "generate_content_with_image_bytes", return_value=raw):
                out = agent._generate_llm_fields(image, detection)
            self.assertEqual(out["severity"], expected, f"severity={raw_severity!r}")

    def test_gemini_prompt_says_yolo_classifies_and_gemini_enriches(self):
        agent = PerceptionAgent()
        image = Image.new("RGB", (16, 16))
        detection = {"category": "pothole", "confidence": 0.92, "bbox": {"x1": 1, "y1": 2, "x2": 3, "y2": 4}}
        with mock.patch.object(
            perception_module,
            "generate_content_with_image_bytes",
            return_value='{"severity": 7, "title": "T", "description": "D", "reasoning": "R"}',
        ) as gemini_mock:
            agent._generate_llm_fields(image, detection)
        prompt = gemini_mock.call_args[0][2]
        self.assertIn("do NOT reclassify", prompt)
        self.assertIn("enrichment", prompt)
        self.assertIn("category: pothole", prompt)

    def test_execute_with_llm_disabled_returns_null_fields(self):
        agent = PerceptionAgent()
        FakeYOLO.instances.clear()
        with mock.patch("ultralytics.YOLO", side_effect=FakeYOLO.create), \
                mock.patch.object(settings, "PERCEPTION_ENABLE_LLM_STAGE", False):
            out = agent.execute({"image_bytes": make_test_image_bytes()})
        self.assertEqual(out["category"], "pothole")
        self.assertAlmostEqual(out["confidence"], 0.92)
        self.assertIsNone(out["severity"])
        self.assertIsNone(out["title"])
        self.assertIsNone(out["description"])
        self.assertIsNone(out["reasoning"])
        self.assertEqual(out["bbox"], {"x1": 2.0, "y1": 3.0, "x2": 60.0, "y2": 61.0})


class PerceiveRouteTests(unittest.TestCase):
    def test_multipart_image_field(self):
        agent = PerceptionAgent()
        with mock.patch("server.routes.agent_routes.get_perception_agent", return_value=agent), \
                mock.patch("ultralytics.YOLO", side_effect=FakeYOLO.create), \
                mock.patch.object(perception_module, "generate_content_with_image_bytes", return_value=GEMINI_PAYLOAD):
            resp = make_client().post(
                PERCEIVE_URL,
                files={"image": ("photo.jpg", make_test_image_bytes(), "image/jpeg")},
            )
        self.assertEqual(resp.status_code, 200, resp.text)
        data = resp.json()["data"]
        self.assertEqual(data["category"], "pothole")
        self.assertEqual(data["severity"], 7)
        self.assertEqual(data["title"], "Deep pothole")

    def test_multipart_legacy_file_field(self):
        agent = PerceptionAgent()
        with mock.patch("server.routes.agent_routes.get_perception_agent", return_value=agent), \
                mock.patch("ultralytics.YOLO", side_effect=FakeYOLO.create), \
                mock.patch.object(perception_module, "generate_content_with_image_bytes", return_value=GEMINI_PAYLOAD):
            resp = make_client().post(
                PERCEIVE_URL,
                files={"file": ("photo.jpg", make_test_image_bytes(), "image/jpeg")},
            )
        self.assertEqual(resp.status_code, 200, resp.text)

    def test_multipart_without_image_field_returns_400(self):
        agent = PerceptionAgent()
        with mock.patch("server.routes.agent_routes.get_perception_agent", return_value=agent):
            resp = make_client().post(PERCEIVE_URL, files={"other": ("x.txt", b"hello", "text/plain")})
        self.assertEqual(resp.status_code, 400)

    def test_octet_stream_raw_body(self):
        agent = PerceptionAgent()
        with mock.patch("server.routes.agent_routes.get_perception_agent", return_value=agent), \
                mock.patch("ultralytics.YOLO", side_effect=FakeYOLO.create), \
                mock.patch.object(perception_module, "generate_content_with_image_bytes", return_value=GEMINI_PAYLOAD):
            resp = make_client().post(
                PERCEIVE_URL,
                content=make_test_image_bytes(),
                headers={"Content-Type": "application/octet-stream"},
            )
        self.assertEqual(resp.status_code, 200, resp.text)
        self.assertEqual(resp.json()["data"]["category"], "pothole")

    def test_json_image_url(self):
        agent = PerceptionAgent()
        with mock.patch.object(PerceptionAgent, "_download_image", return_value=make_test_image_bytes()), \
                mock.patch("server.routes.agent_routes.get_perception_agent", return_value=agent), \
                mock.patch("ultralytics.YOLO", side_effect=FakeYOLO.create), \
                mock.patch.object(perception_module, "generate_content_with_image_bytes", return_value=GEMINI_PAYLOAD):
            resp = make_client().post(
                PERCEIVE_URL,
                json={"imageUrl": "https://example.com/photo.jpg"},
            )
        self.assertEqual(resp.status_code, 200, resp.text)
        self.assertEqual(resp.json()["data"]["category"], "pothole")

    def test_json_missing_image_url_returns_400(self):
        agent = PerceptionAgent()
        with mock.patch("server.routes.agent_routes.get_perception_agent", return_value=agent):
            resp = make_client().post(PERCEIVE_URL, json={})
        self.assertEqual(resp.status_code, 400)
        self.assertIn("imageUrl", resp.json()["detail"])

    def test_unsupported_content_type_returns_400(self):
        agent = PerceptionAgent()
        with mock.patch("server.routes.agent_routes.get_perception_agent", return_value=agent):
            resp = make_client().post(
                PERCEIVE_URL,
                content=b"whatever",
                headers={"Content-Type": "text/plain"},
            )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Unsupported content type", resp.json()["detail"])

    def test_invalid_image_returns_400(self):
        agent = PerceptionAgent()
        with mock.patch("server.routes.agent_routes.get_perception_agent", return_value=agent):
            resp = make_client().post(
                PERCEIVE_URL,
                content=b"this is definitely not an image",
                headers={"Content-Type": "application/octet-stream"},
            )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Invalid image data", resp.json()["detail"])

    def test_no_detection_returns_200_with_detected_false(self):
        agent = PerceptionAgent()
        with mock.patch("server.routes.agent_routes.get_perception_agent", return_value=agent), \
                mock.patch("ultralytics.YOLO", side_effect=EmptyYOLO.create):
            resp = make_client().post(
                PERCEIVE_URL,
                content=make_test_image_bytes(),
                headers={"Content-Type": "application/octet-stream"},
            )
        self.assertEqual(resp.status_code, 200, resp.text)
        data = resp.json()["data"]
        self.assertFalse(data["detected"])
        self.assertIsNone(data["category"])
        self.assertIsNone(data["confidence"])
        self.assertIsNone(data["bbox"])
        self.assertIsNone(data["severity"])
        self.assertIsNone(data["title"])
        self.assertIsNone(data["description"])
        self.assertIsNone(data["reasoning"])

    def test_missing_yolo_model_returns_500(self):
        agent = PerceptionAgent()
        with mock.patch("server.routes.agent_routes.get_perception_agent", return_value=agent), \
                mock.patch.object(settings, "YOLO_MODEL_PATH", "/no/such/dir/best.pt"):
            resp = make_client().post(
                PERCEIVE_URL,
                content=make_test_image_bytes(),
                headers={"Content-Type": "application/octet-stream"},
            )
        self.assertEqual(resp.status_code, 500)
        self.assertIn("YOLO model file not found", resp.json()["detail"])

    def test_yolo_model_loaded_once_across_requests(self):
        """Two /perceive requests must reuse one process-wide model instance."""
        shared = get_perception_agent()
        shared._model = None
        FakeYOLO.instances.clear()
        # No patch on get_perception_agent: the route must resolve the shared agent.
        with mock.patch("ultralytics.YOLO", side_effect=FakeYOLO.create), \
                mock.patch.object(perception_module, "generate_content_with_image_bytes", return_value=GEMINI_PAYLOAD):
            client = make_client()
            r1 = client.post(
                PERCEIVE_URL,
                files={"image": ("a.jpg", make_test_image_bytes(), "image/jpeg")},
            )
            r2 = client.post(
                PERCEIVE_URL,
                files={"image": ("b.jpg", make_test_image_bytes(), "image/jpeg")},
            )
        self.assertEqual(r1.status_code, 200, r1.text)
        self.assertEqual(r2.status_code, 200, r2.text)
        self.assertEqual(len(FakeYOLO.instances), 1)
        self.assertIsNotNone(shared._model)


class PipelineWiringTests(unittest.TestCase):
    def test_process_report_still_uses_perception_agent(self):
        workflow = ReportProcessingWorkflow()
        self.assertIsInstance(workflow.perception_agent, PerceptionAgent)
        # The workflow still invokes the real PerceptionAgent.execute (unchanged wiring).
        self.assertIs(workflow.perception_agent.execute.__func__, PerceptionAgent.execute)

    def test_process_report_no_detection_returns_graceful_result(self):
        """When YOLO finds nothing, the pipeline must not raise a 500."""
        workflow = ReportProcessingWorkflow()
        no_detection = {
            "detected": False,
            "category": None,
            "confidence": None,
            "bbox": None,
            "severity": None,
            "title": None,
            "description": None,
            "reasoning": None,
        }
        with mock.patch.object(PerceptionAgent, "execute", return_value=no_detection):
            result = workflow.run(image_url="https://example.com/x.jpg", location={"lat": 1.0, "lng": 2.0})
        self.assertFalse(result["is_duplicate"])
        self.assertIsNone(result["category"])
        self.assertIsNone(result["final_severity"])
        self.assertFalse(result["deduplication"]["is_duplicate"])
        self.assertEqual(result["orchestration"]["action"], "CREATE")

    def test_process_report_no_detection_route_returns_200(self):
        """End-to-end: /process-report with an undetected image is 200, not 500."""
        workflow = ReportProcessingWorkflow()
        no_detection = {
            "detected": False,
            "category": None,
            "confidence": None,
            "bbox": None,
            "severity": None,
            "title": None,
            "description": None,
            "reasoning": None,
        }
        with mock.patch.object(PerceptionAgent, "execute", return_value=no_detection), \
                mock.patch.object(ReportProcessingWorkflow, "run", wraps=workflow.run):
            resp = make_client().post(
                "/api/v1/agents/process-report",
                json={"imageUrl": "https://example.com/x.jpg", "location": {"lat": 1.0, "lng": 2.0}},
            )
        self.assertEqual(resp.status_code, 200, resp.text)
        self.assertFalse(resp.json()["data"]["is_duplicate"])

    def test_process_report_runs_with_perception_output(self):
        workflow = ReportProcessingWorkflow()
        perception = {
            "category": "pothole",
            "confidence": 0.92,
            "bbox": {"x1": 2.0, "y1": 3.0, "x2": 60.0, "y2": 61.0},
            "severity": 7,
            "title": "Deep pothole",
            "description": "Large pothole on the main road.",
            "reasoning": "Deep and wide.",
        }
        dedup = {
            "is_duplicate": False,
            "duplicate_info": None,
            "highest_similarity": 0.2,
            "trace_entry": {"agent": "Deduplication", "reasoning": "none", "timestamp": "t"},
        }
        severity = {
            "initial_severity": 7,
            "final_severity": 7,
            "is_escalation": False,
            "reasoning": "confirmed",
            "trace_entry": {"agent": "Severity", "reasoning": "confirmed", "timestamp": "t"},
        }
        orchestration = {
            "action": "CREATE",
            "is_duplicate": False,
            "duplicate_candidate_id": None,
            "final_severity": 7,
            "orchestrator_reasoning": "ok",
            "agent_trace": [{"agent": "Perception", "reasoning": "ok", "timestamp": "t"}],
        }
        with mock.patch.object(PerceptionAgent, "execute", return_value=perception), \
                mock.patch.object(DeduplicationAgent, "execute", return_value=dedup), \
                mock.patch.object(SeverityAgent, "execute", return_value=severity), \
                mock.patch.object(OrchestratorAgent, "execute", return_value=orchestration):
            result = workflow.run(image_url="https://example.com/x.jpg", location={"lat": 1.0, "lng": 2.0})
        self.assertEqual(result["category"], "pothole")
        self.assertEqual(result["title"], "Deep pothole")
        self.assertEqual(result["description"], "Large pothole on the main road.")
        self.assertEqual(result["final_severity"], 7)
        self.assertFalse(result["is_duplicate"])


class ImportTests(unittest.TestCase):
    def test_changed_modules_import(self):
        import server.agents.perception_agent
        import server.routes.agent_routes
        import server.config
        import server.services.gemini_service
        for mod in (
            server.agents.perception_agent,
            server.routes.agent_routes,
            server.config,
            server.services.gemini_service,
        ):
            self.assertIsNotNone(mod)
        self.assertTrue(hasattr(server.agents.perception_agent, "get_perception_agent"))
        self.assertTrue(hasattr(server.config.settings, "YOLO_MODEL_PATH"))
        self.assertTrue(hasattr(server.config.settings, "PERCEPTION_ENABLE_LLM_STAGE"))
        self.assertTrue(hasattr(server.config.settings, "YOLO_CONF_THRESHOLD"))


if __name__ == "__main__":
    unittest.main(verbosity=2)
