from apps.worker.celery_app import celery_app


@celery_app.task(name="market.collect_observations")
def collect_market_observations_task(source_name: str) -> dict:
    return {
        "source": source_name,
        "status": "scheduled",
        "note": "request-time scraping is intentionally not part of the live product flow",
    }
