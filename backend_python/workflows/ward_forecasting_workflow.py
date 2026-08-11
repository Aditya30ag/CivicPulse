from typing import Any, Dict, List
from backend_python.agents.forecasting_agent import ForecastingAgent

class WardForecastingWorkflow:
    def __init__(self):
        self.forecasting_agent = ForecastingAgent()

    def run(self, recent_reports: List[Dict[str, Any]]) -> Dict[str, Any]:
        return self.forecasting_agent.execute({"recent_reports": recent_reports})
