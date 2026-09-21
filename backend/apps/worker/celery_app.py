from celery import Celery

from jungle_market.core.config import get_settings

settings = get_settings()
celery_app = Celery(
    "jungle_market",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["apps.worker.tasks.processing", "apps.worker.tasks.market"],
)
celery_app.conf.task_track_started = True
celery_app.conf.worker_prefetch_multiplier = 1
