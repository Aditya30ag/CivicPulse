import os
import sys
from pathlib import Path

# Add project root directory to sys.path so 'server.*' package imports work
# regardless of whether main.py is run from root or inside server/ directory
SERVER_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SERVER_DIR.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from server.config import settings
from server.routes import agent_router, upload_router

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
    uvicorn.run("server.main:app", host=settings.HOST, port=settings.PORT, reload=True)
