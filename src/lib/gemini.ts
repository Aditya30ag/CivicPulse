interface AnalysisResult {
  category: string;
  severity: number;
  title: string;
  description: string;
  reasoning: string;
}

interface DuplicateResult {
  similarity: number;
  isDuplicate: boolean;
}

interface TrendPrediction {
  category: string;
  trend: "increasing" | "stable" | "decreasing";
  confidence: "low" | "medium" | "high";
  reasoning: string;
}

interface RecentReport {
  category: string;
  severityScore: number;
}

const API_URL = import.meta.env.VITE_API_URL;

export const analyzeIssueImage = async (imageUrl: string): Promise<AnalysisResult> => {

  const response = await fetch(
    `${API_URL}/gemini/analyze`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        imageUrl
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to analyze image.");
  }

  return data.data;
};

export const checkDuplicateIssue = async (newDescription: string, existingDescription: string): Promise<DuplicateResult> => {

  const response = await fetch(
    `${API_URL}/gemini/duplicate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        newDescription,
        existingDescription
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Duplicate check failed.");
  }

  return data.data;
};

export const predictWardTrend = async (recentReports: RecentReport[]): Promise<TrendPrediction> => {

  const response = await fetch(
    `${API_URL}/gemini/predict`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        recentReports
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to predict ward trend.");
  }

  return data.data;
};