from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from apps.api.dependencies import get_db, settings_dependency
from jungle_market.core.config import Settings
from jungle_market.infrastructure.redis.client import get_redis_client

router = APIRouter()


@router.get("/health")
def health() -> dict:
    return {"status": "ok"}


@router.get("/ready")
def ready(
    db: Session = Depends(get_db),
    settings: Settings = Depends(settings_dependency),
) -> dict:
    checks: dict[str, bool] = {}
    try:
        db.execute(text("SELECT 1"))
        checks["database"] = True
    except Exception:
        checks["database"] = False
    try:
        checks["redis"] = bool(get_redis_client().ping())
    except Exception:
        checks["redis"] = False

    detector_path = settings.rt_detr_model_path
    checks["detector_model"] = detector_path is not None and detector_path.is_dir()
    for name, path in {
        "category_model": settings.category_model_path,
        "material_model": settings.material_model_path,
    }.items():
        checks[name] = path is not None and path.is_file() and path.stat().st_size > 0
    if not all(checks.values()):
        raise HTTPException(status_code=503, detail={"status": "not_ready", "checks": checks})
    return {"status": "ready", "checks": checks}
