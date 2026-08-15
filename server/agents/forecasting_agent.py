import json
from typing import Any, Dict, List, Literal
from pydantic import BaseModel, Field
from server.agents.base import BaseAgent
from server.services.gemini_service import generate_text_content, clean_and_parse_json

class TrendPrediction(BaseModel):
    category: str = Field(..., description="Target issue category")
    trend: Literal["increasing", "stable", "decreasing"] = Field(..., description="Directional trend")
    confidence: Literal["low", "medium", "high"] = Field(..., description="AI confidence score")
    reasoning: str = Field(..., description="Reasoning max 25 words")

class ForecastingAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="Forecasting",
            role="Predicts ward-level infrastructure risk trends over 14 days using historical reporting data."
        )

    def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        recent_reports: List[Dict[str, Any]] = inputs.get("recent_reports", [])
        if not recent_reports:
            return {
                "category": "General Infrastructure",
                "trend": "stable",
                "confidence": "low",
                "reasoning": "Insufficient recent report data to generate trend forecast.",
                "trace_entry": self.create_trace_entry("Ward forecast completed with default stable baseline due to low report volume.")
            }

        reports_str = json.dumps(recent_reports)
        prompt = (
            "Based on these recent civic issue reports, predict which issue category is likely to increase in this area over the next 14 days and explain why in one sentence.\n\n"
            "Respond with ONLY valid JSON:\n"
            "{\n"
            '"category": string,\n'
            '"trend":"increasing"|"stable"|"decreasing",\n'
            '"confidence":"low"|"medium"|"high",\n'
            '"reasoning": string max 25 words\n'
            "}\n\n"
            f"Reports Data:\n{reports_str}"
        )

        raw_response = generate_text_content(prompt)
        parsed_json = clean_and_parse_json(raw_response, "ForecastingAgent ward trend prediction")
        validated_result = TrendPrediction(**parsed_json)
        
        result_dict = validated_result.model_dump()
        result_dict["trace_entry"] = self.create_trace_entry(
            f"Forecasted {result_dict['category']} risk trend as '{result_dict['trend']}' with {result_dict['confidence']} confidence."
        )
        return result_dict
