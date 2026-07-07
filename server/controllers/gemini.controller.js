import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { analyzeIssueImage, checkDuplicateIssue, predictWardTrend } from "../services/gemini.service.js";

export const analyzeImage = asyncHandler(async (req, res) => {

    const { imageUrl } = req.body;

    if (!imageUrl) {
        throw new ApiError(400, "Image URL is required.");
    }

    const analysis = await analyzeIssueImage(imageUrl);

    return res.status(200).json(
        new ApiResponse(
            200,
            analysis,
            "Image analyzed successfully."
        )
    );
});

export const checkDuplicate = asyncHandler(async (req, res) => {

    const {newDescription, existingDescription} = req.body;

    if (!newDescription || !existingDescription) {
        throw new ApiError(
            400,
            "Both descriptions are required."
        );
    }

    const result = await checkDuplicateIssue(newDescription, existingDescription);

    return res.status(200).json(
        new ApiResponse(
            200,
            result,
            "Duplicate check completed."
        )
    );
});

export const predictTrend = asyncHandler(async (req, res) => {

    const { recentReports } = req.body;

    if (!recentReports) {
        throw new ApiError(
            400,
            "Recent reports are required."
        );
    }

    const result = await predictWardTrend(recentReports);

    return res.status(200).json(
        new ApiResponse(
            200,
            result,
            "Prediction generated successfully."
        )
    );
});