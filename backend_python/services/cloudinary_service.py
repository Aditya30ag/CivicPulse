import cloudinary
import cloudinary.uploader
from backend_python.config import settings

def init_cloudinary():
    if settings.CLOUDINARY_CLOUD_NAME:
        cloudinary.config(
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            api_key=settings.CLOUDINARY_API_KEY,
            api_secret=settings.CLOUDINARY_API_SECRET,
            secure=True
        )

def upload_file_to_cloudinary(file_bytes: bytes, resource_type: str = "auto") -> str:
    if not settings.CLOUDINARY_CLOUD_NAME:
        raise ValueError("Cloudinary credentials are not configured in settings.")
        
    init_cloudinary()
    
    response = cloudinary.uploader.upload(
        file_bytes,
        resource_type=resource_type,
        folder="civic-pulse"
    )
    return response.get("secure_url") or response.get("url") or ""
