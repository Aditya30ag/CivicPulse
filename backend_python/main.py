import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend_python.config import settings
from backend_python.routes import agent_router, upload_router

app = FastAPI(
    title="Civic Pulse Python Multi-Agent Workflow Backend",
    description="Dedicated Python Multi-Agent Architecture for Civic Issue Perception, Spatial/Semantic Deduplication, Severity Escalation, and Ward Forecasting.",
    version="2.0.0"
)

# Enable CORS for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(agent_router)
app.include_router(upload_router)

@app.get("/")
async def root():
    return {
        "success": True,
        "message": "Civic Pulse Python Multi-Agent API is active",
        "version": "2.0.0"
    }

if __name__ == "__main__":
    uvicorn.run("backend_python.main:app", host=settings.HOST, port=settings.PORT, reload=True)
