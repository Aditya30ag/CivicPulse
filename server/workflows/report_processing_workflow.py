from typing import Any, Dict, List
from server.agents.perception_agent import PerceptionAgent
from server.agents.deduplication_agent import DeduplicationAgent
from server.agents.severity_agent import SeverityAgent
from server.agents.orchestrator_agent import OrchestratorAgent

class ReportProcessingWorkflow:
    def __init__(self):
        self.perception_agent = PerceptionAgent()
        self.deduplication_agent = DeduplicationAgent()
        self.severity_agent = SeverityAgent()
        self.orchestrator_agent = OrchestratorAgent()

    def run(self, image_url: str, location: Dict[str, float] = None, candidates: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        # Step 1: Perception Agent Execution
        perception_output = self.perception_agent.execute({"image_url": image_url})

        # Step 2: Deduplication Agent Execution
        new_location = (location["lat"], location["lng"]) if location and "lat" in location and "lng" in location else None
        dedup_inputs = {
            "new_description": perception_output["description"],
            "candidates": candidates or [],
            "new_location": new_location
        }
        dedup_output = self.deduplication_agent.execute(dedup_inputs)

        # Step 3: Severity & Escalation Agent Execution
        existing_severity = (
            dedup_output["duplicate_info"]["existing_severity"]
            if dedup_output["is_duplicate"] and dedup_output["duplicate_info"]
            else perception_output["severity"]
        )
        severity_inputs = {
            "new_severity": perception_output["severity"],
            "old_severity": existing_severity
        }
        severity_output = self.severity_agent.execute(severity_inputs)

        # Step 4: Orchestrator Agent Execution & Trace Synthesis
        orchestrator_inputs = {
            "perception": perception_output,
            "deduplication": dedup_output,
            "severity": severity_output
        }
        orchestrator_output = self.orchestrator_agent.execute(orchestrator_inputs)

        return {
            "perception": perception_output,
            "deduplication": dedup_output,
            "severity": severity_output,
            "orchestration": orchestrator_output,
            "category": perception_output["category"],
            "title": perception_output["title"],
            "description": perception_output["description"],
            "final_severity": orchestrator_output["final_severity"],
            "is_duplicate": orchestrator_output["is_duplicate"],
            "duplicate_candidate_id": orchestrator_output["duplicate_candidate_id"],
            "agent_trace": orchestrator_output["agent_trace"]
        }
