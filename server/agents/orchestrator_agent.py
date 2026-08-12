from typing import Any, Dict, List
from server.agents.base import BaseAgent

class OrchestratorAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="Orchestrator",
            role="Synthesizes multi-agent decisions and generates immutable agentTrace logs."
        )

    def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        perception_data = inputs.get("perception", {})
        deduplication_data = inputs.get("deduplication", {})
        severity_data = inputs.get("severity", {})

        is_duplicate = deduplication_data.get("is_duplicate", False)
        is_escalation = severity_data.get("is_escalation", False)

        if is_duplicate:
            if is_escalation:
                reasoning = f"Merged duplicate report into ID {deduplication_data['duplicate_info']['candidate_id']}. Escalated severity score from {severity_data['initial_severity']} to {severity_data['final_severity']} due to verified visual deterioration."
            else:
                reasoning = f"Merged duplicate report into ID {deduplication_data['duplicate_info']['candidate_id']}. Maintained existing severity score of {severity_data['final_severity']}."
        else:
            reasoning = f"Created new verified report under category '{perception_data.get('category', 'Other')}' with severity score {severity_data.get('final_severity', 5)}/10."

        orchestrator_trace = self.create_trace_entry(reasoning)

        # Assemble unified agent trace
        trace_logs: List[Dict[str, str]] = []
        
        # 1. Perception Trace
        trace_logs.append({
            "agent": "Perception",
            "reasoning": perception_data.get("reasoning", f"Analyzed issue visual details with severity score {perception_data.get('severity', 5)}/10"),
            "timestamp": orchestrator_trace["timestamp"]
        })

        # 2. Deduplication Trace
        if "trace_entry" in deduplication_data:
            trace_logs.append(deduplication_data["trace_entry"])

        # 3. Severity Trace
        if "trace_entry" in severity_data:
            trace_logs.append(severity_data["trace_entry"])

        # 4. Orchestrator Trace
        trace_logs.append(orchestrator_trace)

        return {
            "action": "MERGE" if is_duplicate else "CREATE",
            "is_duplicate": is_duplicate,
            "duplicate_candidate_id": deduplication_data.get("duplicate_info", {}).get("candidate_id") if is_duplicate else None,
            "final_severity": severity_data.get("final_severity", perception_data.get("severity", 5)),
            "orchestrator_reasoning": reasoning,
            "agent_trace": trace_logs
        }
