from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from haversine import haversine, Unit
from backend_python.agents.base import BaseAgent
from backend_python.services.gemini_service import generate_text_content, clean_and_parse_json

class DuplicateCheckResult(BaseModel):
    similarity: float = Field(..., description="Similarity score between 0.0 and 1.0")
    isDuplicate: bool = Field(..., description="True if similarity > 0.8")

class DeduplicationAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="Deduplication",
            role="Evaluates spatial distance and semantic similarity to prevent duplicate civic reports."
        )

    def check_spatial_proximity(
        self,
        new_coords: tuple[float, float],
        existing_coords: tuple[float, float],
        max_radius_meters: float = 100.0
    ) -> tuple[bool, float]:
        distance_meters = haversine(new_coords, existing_coords, unit=Unit.METERS)
        return (distance_meters <= max_radius_meters, distance_meters)

    def compare_descriptions(self, new_description: str, existing_description: str) -> Dict[str, Any]:
        prompt = (
            "Compare these two civic issue descriptions. Respond with ONLY valid JSON:\n"
            '{"similarity": float 0 to 1, "isDuplicate": boolean (true if similarity > 0.8)}\n\n'
            f"Description 1: {new_description}\n"
            f"Description 2: {existing_description}"
        )

        raw_response = generate_text_content(prompt)
        parsed_json = clean_and_parse_json(raw_response, "DeduplicationAgent similarity check")
        validated_result = DuplicateCheckResult(**parsed_json)
        return validated_result.model_dump()

    def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        new_description = inputs.get("new_description", "")
        candidates: List[Dict[str, Any]] = inputs.get("candidates", [])
        new_location = inputs.get("new_location")  # tuple (lat, lng)

        found_duplicate: Optional[Dict[str, Any]] = None
        highest_similarity = 0.0

        for candidate in candidates:
            # Check spatial distance if coordinates available
            if new_location and "lat" in candidate and "lng" in candidate:
                candidate_coords = (candidate["lat"], candidate["lng"])
                is_near, dist = self.check_spatial_proximity(new_location, candidate_coords)
                if not is_near:
                    continue

            # Check semantic similarity via Gemini
            sim_result = self.compare_descriptions(new_description, candidate.get("description", ""))
            if sim_result["similarity"] > highest_similarity:
                highest_similarity = sim_result["similarity"]

            if sim_result["isDuplicate"]:
                found_duplicate = {
                    "candidate_id": candidate.get("id"),
                    "candidate_description": candidate.get("description"),
                    "existing_severity": candidate.get("severityScore", 5),
                    "similarity": sim_result["similarity"]
                }
                break

        return {
            "is_duplicate": found_duplicate is not None,
            "duplicate_info": found_duplicate,
            "highest_similarity": highest_similarity,
            "trace_entry": self.create_trace_entry(
                "Found highly similar existing report in same area" if found_duplicate else "No duplicate reports detected within spatial threshold"
            )
        }
