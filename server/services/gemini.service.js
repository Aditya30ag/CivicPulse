import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

const cleanAndParseJson = (text, context) => {
    let cleanedText = text.trim();

    // Extract content from markdown code fences if present
    const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
    const match = codeBlockRegex.exec(cleanedText);

    if (match) {
        cleanedText = match[1].trim();
    } else {
        const firstBrace = cleanedText.indexOf("{");
        const lastBrace = cleanedText.lastIndexOf("}");
        const firstBracket = cleanedText.indexOf("[");
        const lastBracket = cleanedText.lastIndexOf("]");

        let startIdx = -1;
        let endIdx = -1;

        if (
            firstBrace !== -1 &&
            lastBrace !== -1 &&
            (firstBracket === -1 || firstBrace < firstBracket)
        ) {
            startIdx = firstBrace;
            endIdx = lastBrace;
        } else if (firstBracket !== -1 && lastBracket !== -1) {
            startIdx = firstBracket;
            endIdx = lastBracket;
        }

        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
            cleanedText = cleanedText
                .substring(startIdx, endIdx + 1)
                .trim();
        }
    }

    cleanedText = cleanedText.replace(/^[`'\s]+|[`'\s]+$/g, "").trim();

    try {
        return JSON.parse(cleanedText);
    } catch (error) {
        console.error(
            `JSON parsing failed for ${context}`,
            error
        );

        throw new Error(
            `Failed to parse Gemini response for ${context}`
        );
    }
};

export const analyzeIssueImage = async (imageUrl) => {

    const response = await fetch(imageUrl);

    if (!response.ok) {
        throw new Error("Failed to fetch the uploaded image for analysis.");
    }

    // Convert image -> ArrayBuffer -> Base64
    const arrayBuffer = await response.arrayBuffer();

    const base64Image = Buffer.from(arrayBuffer).toString("base64");

    // Read MIME type from response header
    let mimeType = response.headers.get("content-type");

    if (!mimeType) {
        if (imageUrl.includes(".mp4")) {
            mimeType = "video/mp4";
        } else if (imageUrl.includes(".png")) {
            mimeType = "image/png";
        } else {
            mimeType = "image/jpeg";
        }
    }

    const prompt = `You are a civic issue classifier. Analyze the image and respond with ONLY valid JSON, no markdown formatting, no code fences, no extra text. Schema: 
    {"category": one of ["Pothole","Garbage","Streetlight","Water Leakage","Other"], "severity": integer 1-10, "title": short string max 8 words, "description": string max 30 words,"reasoning": string max 20 words explaining the severity score}`;

    try {
        const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
            {
                role: "user",
                parts: [
                    { text: prompt },
                    {
                        inlineData: {
                            data: base64Image,
                            mimeType
                        }
                    }
                ]
            }
        ]});

        return cleanAndParseJson(result.text || "", "issue image analysis");

    } catch (error) {
        throw new Error(`Gemini analysis failed: ${error.message}`);
    }
};

export const checkDuplicateIssue = async (newDescription, existingDescription) => {

    const prompt = `Compare these two civic issue descriptions. Respond with ONLY valid JSON:
{"similarity": float 0 to 1, "isDuplicate": boolean (true if similarity > 0.8)}

Description 1: ${newDescription}
Description 2: ${existingDescription}`;

    try {
        const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
            {
                role: "user",
                parts: [
                    {
                        text: prompt
                    }
                ]
            }
        ]});

        return cleanAndParseJson(result.text || "", "duplicate issue check");

    } catch (error) {
        throw new Error(`Gemini duplicate issue check failed: ${error.message}`);
    }
};

export const predictWardTrend = async (recentReports) => {

    const reportDataStr = JSON.stringify(recentReports);

    const prompt = `Based on these recent civic issue reports, predict which issue category is likely to increase in this area over the next 14 days and explain why in one sentence.

Respond with ONLY valid JSON:

{
"category": string,
"trend":"increasing"|"stable"|"decreasing",
"confidence":"low"|"medium"|"high",
"reasoning": string max 25 words
}

Reports Data:
${reportDataStr}`;

    try {
        const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
            {
                role: "user",
                parts: [
                    {
                        text: prompt
                    }
                ]
            }
        ]});

        return cleanAndParseJson(result.text || "", "ward trend prediction");

    } catch (error) {
        throw new Error(`Gemini ward trend prediction failed: ${error.message}`);
    }

};
