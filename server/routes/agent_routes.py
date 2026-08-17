import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

from server.agents.perception_agent import ImageLoadError, get_perception_agent
from server.agents.deduplication_agent import DeduplicationAgent
from server.agents.forecasting_agent import ForecastingAgent
from server.workflows.report_processing_workflow import ReportProcessingWorkflow
from server.workflows.ward_forecasting_workflow import WardForecastingWorkflow

router = APIRouter(prefix="/api/v1/agents", tags=["Agents"])

# Pydantic Schemas
class DeduplicateRequest(BaseModel):
    newDescription: str = Field(..., description="New report description")
    existingDescription: str = Field(..., description="Existing candidate report description")

class ProcessReportRequest(BaseModel):
    imageUrl: str = Field(..., description="Image URL of the reported issue")
    location: Optional[Dict[str, float]] = Field(None, description="Report location coordinates {lat, lng}")
    candidates: Optional[List[Dict[str, Any]]] = Field(default=[], description="Candidate reports within 100m radius")

class RecentReportItem(BaseModel):
    category: str
    severityScore: Optional[int] = 5

class ForecastRequest(BaseModel):
    recentReports: List[RecentReportItem]

# Endpoints
@router.post("/process-report")
async def process_report_pipeline(request: ProcessReportRequest):
    try:
        workflow = ReportProcessingWorkflow()
        result = workflow.run(
            image_url=request.imageUrl,
            location=request.location,
            candidates=request.candidates
        )
        return {"success": True, "data": result, "message": "Multi-agent report pipeline completed successfully."}
    except Exception as e:
        logger.exception("process-report pipeline failed")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/perceive")
async def perceive_image(request: Request):
    """
    Perceive a civic issue from an image.

    Accepts either:
    - multipart/form-data with an image file in a field named ``image`` (or ``file``),
    - application/octet-stream with the raw image bytes as the request body, or
    - JSON body: {"imageUrl": "https://..."}
    """
    try:
        # Shared agent instance so the YOLO model is loaded once per process.
        agent = get_perception_agent()
        content_type = request.headers.get("content-type", "").lower()

        if "multipart/form-data" in content_type:
            form = await request.form()
            upload = form.get("image") or form.get("file")
            if upload is None or not hasattr(upload, "read"):
                raise HTTPException(
                    status_code=400,
                    detail="No image file uploaded. Send the image in a form field named 'image'.",
                )
            image_bytes = await upload.read()
            result = agent.execute({"image_bytes": image_bytes})
        elif "application/octet-stream" in content_type:
            image_bytes = await request.body()
            result = agent.execute({"image_bytes": image_bytes})
        elif "application/json" in content_type or not content_type:
            try:
                body = await request.json()
            except Exception:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid JSON body. Expected {\"imageUrl\": \"https://...\"}.",
                )
            image_url = body.get("imageUrl")
            if not image_url:
                raise HTTPException(status_code=400, detail="imageUrl is required in the JSON body.")
            result = agent.execute({"image_url": image_url})
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported content type '{content_type}'. Send multipart/form-data, "
                       "application/octet-stream, or JSON with an 'imageUrl' field.",
            )

        return {"success": True, "data": result, "message": "Image perceived successfully."}
    except HTTPException:
        raise
    except ImageLoadError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("perceive failed")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/deduplicate")
async def check_duplicate(request: DeduplicateRequest):
    try:
        agent = DeduplicationAgent()
        result = agent.compare_descriptions(request.newDescription, request.existingDescription)
        return {"success": True, "data": result, "message": "Duplicate check completed."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/forecast")
async def predict_ward_trend(request: ForecastRequest):
    try:
        workflow = WardForecastingWorkflow()
        reports_data = [item.model_dump() for item in request.recentReports]
        result = workflow.run(recent_reports=reports_data)
        return {"success": True, "data": result, "message": "Ward trend forecast generated successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
