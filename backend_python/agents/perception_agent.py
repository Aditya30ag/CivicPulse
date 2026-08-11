from typing import Any, Dict
from pydantic import BaseModel, Field
from backend_python.agents.base import BaseAgent
from backend_python.services.gemini_service import generate_content_with_image, clean_and_parse_json

class PerceptionResult(BaseModel):
    category: str = Field(..., description="Issue category: Pothole, Garbage, Streetlight, Water Leakage, Other")
    severity: int = Field(..., description="Severity score integer 1-10")
    title: str = Field(..., description="Short title max 8 words")
    description: str = Field(..., description="Concise description max 30 words")
    reasoning: str = Field(..., description="Reasoning for severity score max 20 words")

class PerceptionAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="Perception",
            role="Extracts category, title, description, and severity score from issue images."
        )

    def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        image_url = inputs.get("image_url")
        if not image_url:
            raise ValueError("image_url is required for PerceptionAgent execution.")

        prompt = (
            "You are a civic issue classifier. Analyze the image and respond with ONLY valid JSON, no markdown code blocks.\n"
            "Schema:\n"
            '{"category": one of ["Pothole","Garbage","Streetlight","Water Leakage","Other"], '
            '"severity": integer 1-10, '
            '"title": short string max 8 words, '
            '"description": string max 30 words, '
            '"reasoning": string max 20 words explaining the severity score}'
        )

        raw_response = generate_content_with_image(image_url, prompt)
        parsed_json = clean_and_parse_json(raw_response, "PerceptionAgent image analysis")
        validated_result = PerceptionResult(**parsed_json)
        
        return validated_result.model_dump()
