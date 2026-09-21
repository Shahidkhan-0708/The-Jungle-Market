from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        enable_decoding=False,
    )

    environment: str = "local"
    log_level: str = "INFO"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_cors_origins: list[str] = Field(default_factory=list)

    supabase_url: str | None = None
    supabase_publishable_key: str | None = None

    database_url: str = "sqlite:///./jungle_market.db"
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"

    local_storage_root: Path = Path("./.local_media")
    max_image_bytes: int = 12_582_912
    max_image_pixels: int = 24_000_000
    max_image_long_edge: int = 1600
    max_audio_bytes: int = 26_214_400
    allowed_audio_types: list[str] = Field(
        default_factory=lambda: [
            "audio/mpeg",
            "audio/mp4",
            "audio/ogg",
            "audio/wav",
            "audio/webm",
        ]
    )
    enable_uneven_light_normalization: bool = False
    min_mask_area_ratio: float = 0.02

    category_labels: list[str] = Field(
        default_factory=lambda: [
            "basket",
            "pottery",
            "textile",
            "jewellery",
            "woodcraft",
            "bamboo_craft",
            "decor",
            "bag",
            "accessory",
        ]
    )
    material_labels: list[str] = Field(
        default_factory=lambda: ["bamboo", "wood", "clay", "cotton", "jute", "metal", "leather"]
    )

    rt_detr_model_path: Path | None = Path("./models/rtdetr_model.pth")
    category_model_path: Path | None = Path("./models/category_model.pth")
    material_model_path: Path | None = Path("./models/material_model.pth")
    whisper_model_size: str = "tiny"
    whisper_device: str = "cpu"
    whisper_compute_type: str = "int8"
    whisper_min_transcript_confidence: float = 0.62
    gemini_api_key: str | None = None
    catboost_pricing_model_path: Path | None = Path("./models/pricing_model.cbm")

    max_pricing_model_staleness_days: int = 90
    default_currency: str = "INR"
    minimum_margin_rate: float = 0.22

    @field_validator(
        "api_cors_origins",
        "allowed_audio_types",
        "category_labels",
        "material_labels",
        mode="before",
    )
    @classmethod
    def split_csv(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @field_validator(
        "rt_detr_model_path",
        "category_model_path",
        "material_model_path",
        "catboost_pricing_model_path",
        mode="before",
    )
    @classmethod
    def empty_path_to_none(cls, value: str | Path | None) -> Path | None:
        if value in ("", None):
            return None
        return Path(value)


@lru_cache
def get_settings() -> Settings:
    return Settings()
