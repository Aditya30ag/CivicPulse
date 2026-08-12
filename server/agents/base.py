from abc import ABC, abstractmethod
from typing import Any, Dict
from datetime import datetime

class BaseAgent(ABC):
    def __init__(self, name: str, role: str):
        self.name = name
        self.role = role

    @abstractmethod
    def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        pass

    def create_trace_entry(self, reasoning: str) -> Dict[str, str]:
        return {
            "agent": self.name,
            "reasoning": reasoning,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
