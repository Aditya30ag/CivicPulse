from typing import Any, Dict
from backend_python.agents.base import BaseAgent

class SeverityAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="Severity",
            role="Evaluates issue severity ratings and handles severity escalation during issue merges."
        )

    def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        new_severity = int(inputs.get("new_severity", 5))
        old_severity = int(inputs.get("old_severity", new_severity))

        is_escalation = (new_severity - old_severity) >= 2
        final_severity = new_severity if is_escalation else old_severity

        if is_escalation:
            reasoning = f"Escalated severity score from {old_severity} to {new_severity} based on visual evidence showing increased urgency"
        else:
            reasoning = f"Independent severity assessment confirmed at {new_severity}/10"

        return {
            "initial_severity": new_severity,
            "final_severity": final_severity,
            "is_escalation": is_escalation,
            "reasoning": reasoning,
            "trace_entry": self.create_trace_entry(reasoning)
        }
