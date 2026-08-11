from fastapi import APIRouter, UploadFile, File, HTTPException
from backend_python.services.cloudinary_service import upload_file_to_cloudinary

router = APIRouter(prefix="/api/v1/upload", tags=["Upload"])

@router.post("")
async def upload_file(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        resource_type = "video" if file.content_type and "video" in file.content_type else "auto"
        secure_url = upload_file_to_cloudinary(contents, resource_type=resource_type)
        return {
            "success": True,
            "data": {
                "url": secure_url,
                "secure_url": secure_url
            },
            "secure_url": secure_url,
            "message": "File uploaded successfully."
        }
    except Exception as e:
        print(f"Error handling upload: {e}")
        raise HTTPException(status_code=500, detail=str(e))
