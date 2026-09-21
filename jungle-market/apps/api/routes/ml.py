from fastapi import APIRouter

from jungle_market.infrastructure.ml.colab_client import ColabMLUnavailable, colab_ml


router = APIRouter(prefix="/v1/ml", tags=["ml"])


@router.get("/status")
async def ml_status() -> dict[str, object]:
    if not colab_ml.configured:
        return {
            "configured": False,
            "reachable": False,
            "detail": "Set COLAB_ML_URL after starting the Colab notebook.",
        }
    try:
        health = await colab_ml.health()
        return {"configured": True, "reachable": True, "remote": health}
    except ColabMLUnavailable as error:
        return {"configured": True, "reachable": False, "detail": str(error)}
