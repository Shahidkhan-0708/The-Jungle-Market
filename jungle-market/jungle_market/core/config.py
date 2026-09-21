from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # API Settings
    API_ENV: str = "development"
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    DEBUG: bool = False
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    SUPABASE_URL: str = ""
    SUPABASE_PUBLISHABLE_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    MEDIA_STORAGE: str = "local"
    SUPABASE_MEDIA_BUCKET: str = "jungle-market-private"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://jungle_user:jungle_password@localhost:5432/jungle_market_db"
    API_CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    PUBLIC_API_URL: str = "http://localhost:8000"
    PUBLIC_SITE_URL: str = "http://localhost:5173"
    DATABASE_SSL_ROOT_CERT: str = ""
    FACTORY_API_KEY: str = ""
    FACTORY_API_BASE_URL: str = "https://openrouter.ai/api/v1"
    TRANSLATION_MODEL: str = ""
    VISION_MODEL: str = "google/gemini-2.5-flash"
    
    # Redis / Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"
    
    # Storage
    STORAGE_ENDPOINT: str = "http://localhost:9000"
    STORAGE_ACCESS_KEY: str = "minioadmin"
    STORAGE_SECRET_KEY: str = "minioadmin"
    STORAGE_BUCKET_MEDIA: str = "jungle-market-media"
    STORAGE_BUCKET_AUDIO: str = "jungle-market-audio"
    
    # ML Models
    MODEL_DIR: str = "./models"
    COLAB_ML_URL: str = ""
    COLAB_ML_API_KEY: str = ""
    COLAB_ML_TIMEOUT_SECONDS: float = 120.0
    COLAB_ML_HEALTH_TIMEOUT_SECONDS: float = 10.0
    ML_LOCAL_FALLBACK: bool = False
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()
