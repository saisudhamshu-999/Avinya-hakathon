import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Readout Medical Intelligence API"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://readout_user:readout_secure_password@localhost:5432/readout_db"
    )
    
    JWT_SECRET: str = os.getenv("JWT_SECRET", "readout_medical_jwt_secret_dev_key_change_in_prod")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    UPLOAD_DIRECTORY: str = os.getenv("UPLOAD_DIRECTORY", "./uploads")
    MAX_UPLOAD_SIZE: int = int(os.getenv("MAX_UPLOAD_SIZE", 20 * 1024 * 1024))  # 20 MB
    OCR_ENGINE: str = os.getenv("OCR_ENGINE", "tesseract")
    
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "google_gemini")
    AI_API_KEY: str = os.getenv("AI_API_KEY", "")

    class Config:
        case_sensitive = True

settings = Settings()
