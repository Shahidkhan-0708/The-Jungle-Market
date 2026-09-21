import asyncio
from apps.worker.celery_app import celery_app
from typing import Dict, Any

from jungle_market.services.voice.transcriber import voice_transcriber
from jungle_market.services.fusion.engine import fusion_engine
from jungle_market.services.seo.generator import seo_generator
from jungle_market.services.pricing.engine import pricing_engine

@celery_app.task(name="process_audio")
def process_audio_task(audio_uri: str) -> dict:
    """Async wrapper for the heavy faster-whisper inference"""
    # Read bytes from storage synchronously for the worker
    with open(audio_uri, "rb") as f:
        audio_bytes = f.read()
    
    return voice_transcriber.transcribe(audio_bytes)

@celery_app.task(name="fuse_and_price_product")
def fuse_and_price_product_task(raw_facts: Dict[str, Any]) -> dict:
    """Async pipeline for fusion, pricing, and SEO"""
    
    # 1. Fact Fusion
    fused_product = fusion_engine.fuse(raw_facts)
    
    # 2. Fair Pricing
    pricing = pricing_engine.estimate_price(fused_product)
    fused_product["pricing_estimate"] = pricing
    
    # 3. SEO Generation
    seo_copy = seo_generator.generate_copy(fused_product)
    fused_product["seo"] = seo_copy
    
    # 4. Save to DB (mocked for now, handled via SQLAlchemy session)
    # db.save(fused_product)
    
    return fused_product
