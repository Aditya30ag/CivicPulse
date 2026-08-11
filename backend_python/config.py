import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent

load_dotenv(BASE_DIR / ".env")


class Settings:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip('"').strip("'")

    CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME", "").strip('"').strip("'")
    CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY", "").strip('"').strip("'")
    CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET", "").strip('"').strip("'")

    PORT = int(os.getenv("PORT", "8000"))
    HOST = os.getenv("HOST", "0.0.0.0")


settings = Settings()