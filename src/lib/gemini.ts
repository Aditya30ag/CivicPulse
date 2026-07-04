import { GoogleGenAI } from '@google/genai';

interface AnalysisResult {
  category: string;
  severity: number;
  title: string;
  description: string;
  reasoning: string;
}

const cleanAndParseJson = <T>(text: string, context: string): T => {
  let cleanedText = text.trim();

  // Extract content from markdown code fences if present (e.g. ```json ... ```)
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
  const match = codeBlockRegex.exec(cleanedText);
  if (match) {
    cleanedText = match[1].trim();
  } else {
    // If not in standard code fences, check for starting object/array syntax to strip stray wrapper text
    const firstBrace = cleanedText.indexOf('{');
    const lastBrace = cleanedText.lastIndexOf('}');
    const firstBracket = cleanedText.indexOf('[');
    const lastBracket = cleanedText.lastIndexOf(']');
    
    let startIdx = -1;
    let endIdx = -1;
    
    if (firstBrace !== -1 && lastBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      startIdx = firstBrace;
      endIdx = lastBrace;
    } else if (firstBracket !== -1 && lastBracket !== -1) {
      startIdx = firstBracket;
      endIdx = lastBracket;
    }
    
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      cleanedText = cleanedText.substring(startIdx, endIdx + 1).trim();
    }
  }

  // Strip common leading/trailing characters (like backticks or stray single quotes/whitespace)
  cleanedText = cleanedText.replace(/^[`'\s]+|[`'\s]+$/g, '').trim();

  try {
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error(`JSON parsing failed for ${context}. Raw:`, text, `Cleaned:`, cleanedText, `Error:`, error);
    throw new Error(`Failed to parse the Gemini response for ${context}. The AI response was not in a valid JSON format.`);
  }
};

export const analyzeIssueImage = async (imageUrl: string): Promise<AnalysisResult> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined. Please check your environment variables.");
  }

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error("Failed to fetch the uploaded image for analysis.");
  }
  const blob = await response.blob();
  
  const base64Image = await new Promise<string>((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onloadend = () => {
      if (fileReader.result) {
        const base64 = (fileReader.result as string).split(',')[1];
        resolve(base64);
      } else {
        reject(new Error("Failed to read file as base64"));
      }
    };
    fileReader.onerror = reject;
    fileReader.readAsDataURL(blob);
  });

  let mimeType = blob.type;
  if (!mimeType) {
    if (imageUrl.includes('.mp4')) mimeType = 'video/mp4';
    else if (imageUrl.includes('.png')) mimeType = 'image/png';
    else mimeType = 'image/jpeg';
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `You are a civic issue classifier. Analyze the image and respond with ONLY valid JSON, no markdown formatting, no code fences, no extra text. Schema: 
{"category": one of ["Pothole","Garbage","Streetlight","Water Leakage","Other"], "severity": integer 1-10, "title": short string max 8 words, "description": string max 30 words, "reasoning": string max 20 words explaining the severity score}`;

  const result = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { data: base64Image, mimeType } }
        ]
      }
    ]
  });

  let rawText = result.text || "";
  return cleanAndParseJson<AnalysisResult>(rawText, "issue image analysis");
};

export const checkDuplicateIssue = async (newDescription: string, existingDescription: string): Promise<{similarity: number, isDuplicate: boolean}> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Compare these two civic issue descriptions. Respond with ONLY valid JSON: {"similarity": float 0 to 1, "isDuplicate": boolean (true if similarity > 0.8)}

Description 1: ${newDescription}
Description 2: ${existingDescription}`;

  const result = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt }
        ]
      }
    ]
  });

  let rawText = result.text || "";
  return cleanAndParseJson<{similarity: number, isDuplicate: boolean}>(rawText, "duplicate issue check");
};

export const predictWardTrend = async (recentReports: {category: string, severityScore: number}[]): Promise<{category: string, trend: "increasing"|"stable"|"decreasing", confidence: "low"|"medium"|"high", reasoning: string}> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const reportDataStr = JSON.stringify(recentReports);
  
  const prompt = `Based on these recent civic issue reports, predict which issue category is likely to increase in this area over the next 14 days and explain why in one sentence. Respond with ONLY valid JSON: {"category": string, "trend": "increasing"|"stable"|"decreasing", "confidence": "low"|"medium"|"high", "reasoning": string max 25 words}
  
  Reports Data:
  ${reportDataStr}`;

  const result = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ]
  });

  let rawText = result.text || "";
  return cleanAndParseJson<{category: string, trend: "increasing"|"stable"|"decreasing", confidence: "low"|"medium"|"high", reasoning: string}>(rawText, "ward trend prediction");
};
