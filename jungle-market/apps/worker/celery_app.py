from celery import Celery
from jungle_market.core.config import settings

celery_app = Celery(
    "jungle_market_worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    # Example task routing can go here
)

@celery_app.task
def dummy_task():
    return {"status": "success"}
