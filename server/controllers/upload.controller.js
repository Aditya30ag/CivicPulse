import { uploadOnCloudinary } from "../config/cloudinary.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

export const uploadImage = asyncHandler(async (req, res) => {

    if (!req.file) {
        throw new ApiError(400, "No file uploaded");
    }

    const result = await uploadOnCloudinary(req.file.buffer);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                secure_url: result.secure_url,
            },
            "Image uploaded successfully"
        )
    );
});