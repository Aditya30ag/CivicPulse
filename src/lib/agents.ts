export interface BBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface PerceptionResult {
  /** false when the model found no civic issue in the image (not an error) */
  detected?: boolean;
  category: string | null;
  confidence: number | null;
  bbox?: BBox | null;
  severity: number | null;
  title: string | null;
  description: string | null;
  reasoning: string | null;
}

export interface DuplicateResult {
  similarity: number;
  isDuplicate: boolean;
}

export interface AgentTraceEntry {
  agent: string;
  reasoning: string;
  timestamp: string;
}

export interface PipelineResult {
  perception: PerceptionResult;
  deduplication: {
    is_duplicate: boolean;
    duplicate_info?: {
      candidate_id?: string;
      candidate_description?: string;
      existing_severity?: number;
      similarity?: number;
    };
    highest_similarity: number;
    trace_entry: AgentTraceEntry;
  };
  severity: {
    initial_severity: number | null;
    final_severity: number | null;
    is_escalation: boolean;
    reasoning: string;
    trace_entry: AgentTraceEntry;
  };
  orchestration: {
    action: "MERGE" | "CREATE";
    is_duplicate: boolean;
    duplicate_candidate_id?: string;
    final_severity: number | null;
    orchestrator_reasoning: string;
    agent_trace: AgentTraceEntry[];
  };
  category: string | null;
  title: string | null;
  description: string | null;
  final_severity: number | null;
  is_duplicate: boolean;
  duplicate_candidate_id?: string | null;
  agent_trace: AgentTraceEntry[];
}

export interface TrendPrediction {
  category: string;
  trend: "increasing" | "stable" | "decreasing";
  confidence: "low" | "medium" | "high";
  reasoning: string;
}

export interface RecentReportItem {
  category: string;
  severityScore?: number;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

export const processReportPipeline = async (
  imageUrl: string,
  location?: { lat: number; lng: number },
  candidates: any[] = []
): Promise<PipelineResult> => {
  const response = await fetch(`${API_BASE_URL}/agents/process-report`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      imageUrl,
      location,
      candidates,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || data.message || "Failed to execute multi-agent report pipeline.");
  }
  return data.data;
};

export const analyzeIssueImage = async (imageUrl: string): Promise<PerceptionResult> => {
  const response = await fetch(`${API_BASE_URL}/agents/perceive`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      imageUrl,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || data.message || "Failed to perceive image.");
  }
  return data.data;
};

export const checkDuplicateIssue = async (
  newDescription: string,
  existingDescription: string
): Promise<DuplicateResult> => {
  const response = await fetch(`${API_BASE_URL}/agents/deduplicate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      newDescription,
      existingDescription,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || data.message || "Duplicate check failed.");
  }
  return data.data;
};

export const predictWardTrend = async (recentReports: RecentReportItem[]): Promise<TrendPrediction> => {
  const response = await fetch(`${API_BASE_URL}/agents/forecast`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recentReports,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || data.message || "Failed to predict ward trend.");
  }
  return data.data;
};
