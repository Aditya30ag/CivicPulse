from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from server.agents.perception_agent import PerceptionAgent
from server.agents.deduplication_agent import DeduplicationAgent
from server.agents.forecasting_agent import ForecastingAgent
from server.workflows.report_processing_workflow import ReportProcessingWorkflow
from server.workflows.ward_forecasting_workflow import WardForecastingWorkflow

router = APIRouter(prefix="/api/v1/agents", tags=["Agents"])

# Pydantic Schemas
class PerceiveRequest(BaseModel):
    imageUrl: str = Field(..., description="Uploaded image URL to analyze")

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
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/perceive")
async def perceive_image(request: PerceiveRequest):
    try:
        agent = PerceptionAgent()
        result = agent.execute({"image_url": request.imageUrl})
        return {"success": True, "data": result, "message": "Image perceived successfully."}
    except Exception as e:
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
