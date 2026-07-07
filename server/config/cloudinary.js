import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

export const uploadOnCloudinary = (buffer) => {
    return new Promise((resolve, reject) => {

        // destination define
        const cloudinaryUploadStream  = cloudinary.uploader.upload_stream(
            {
                resource_type: "auto",
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );

        streamifier
            .createReadStream(buffer)  
            .pipe(cloudinaryUploadStream );     // pipe readable stream to this destination  
    });
};

export default cloudinary;