import os
import tempfile
from pathlib import Path
from uuid import UUID

from sqlalchemy import select

from apps.worker.celery_app import celery_app
from jungle_market.core.config import Settings, get_settings
from jungle_market.domain.enums import ProductStatus, ReviewStatus
from jungle_market.domain.models.products import ProcessingJob, Product, ProductMedia
from jungle_market.domain.models.reviews import AmbassadorReview
from jungle_market.infrastructure.database.session import SessionLocal
from jungle_market.infrastructure.storage.local import LocalFilesystemStorage
from jungle_market.ml.adapters.base import CategoryClassifier, MaterialClassifier, ProductDetector
from jungle_market.ml.adapters.mock import (
    MockCategoryClassifier,
    MockMaterialClassifier,
    MockProductDetector,
)
from jungle_market.ml.adapters.rtdetr import RTDETRv2ProductDetector
from jungle_market.ml.adapters.torchvision import (
    TorchVisionMobileNetCategoryClassifier,
    TorchVisionMultiLabelMaterialClassifier,
)
from jungle_market.services.fusion.service import VoiceFacts
from jungle_market.services.image_ingest.service import ImageIngestService
from jungle_market.services.processing.orchestrator import ProductProcessingOrchestrator
from jungle_market.services.speech.service import FasterWhisperTranscriber


def _category_adapter(settings: Settings, review_reasons: list[str]) -> CategoryClassifier:
    try:
        adapter = TorchVisionMobileNetCategoryClassifier(
            settings.category_model_path,
            settings.category_labels,
            "local-category-artifact",
        )
        review_reasons.append("category model has not passed registry promotion")
        return adapter
    except Exception:
        review_reasons.append("category model unavailable; mock adapter used")
        return MockCategoryClassifier(settings)


def _material_adapter(settings: Settings, review_reasons: list[str]) -> MaterialClassifier:
    try:
        adapter = TorchVisionMultiLabelMaterialClassifier(
            settings.material_model_path,
            settings.material_labels,
            "local-material-artifact",
        )
        review_reasons.append("material model has not passed registry promotion")
        return adapter
    except Exception:
        review_reasons.append("material model unavailable; mock adapter used")
        return MockMaterialClassifier(settings)


def _detector_adapter(settings: Settings, review_reasons: list[str]) -> ProductDetector:
    try:
        adapter = RTDETRv2ProductDetector(settings.rt_detr_model_path, "local-rtdetr-artifact")
        review_reasons.append("detector model has not passed registry promotion")
        return adapter
    except Exception:
        review_reasons.append("detector model unavailable; mock adapter used")
        return MockProductDetector()


@celery_app.task(name="products.process")
def process_product_task(product_id: str, job_id: str) -> dict:
    settings = get_settings()
    storage = LocalFilesystemStorage(settings.local_storage_root)
    db = SessionLocal()
    job = db.get(ProcessingJob, UUID(job_id))
    product = db.get(Product, UUID(product_id))
    if job is None or product is None:
        db.close()
        raise ValueError("processing job or product not found")

    job.status = "STARTED"
    db.commit()
    try:
        image_media = db.scalar(
            select(ProductMedia)
            .where(
                ProductMedia.product_id == product.id,
                ProductMedia.media_type == "image",
                ProductMedia.deleted_or_anonymized.is_(False),
            )
            .order_by(ProductMedia.created_at.desc())
        )
        if image_media is None:
            raise ValueError("product has no image media")
        image = ImageIngestService(settings).open_image(storage.get_bytes(image_media.storage_uri))

        review_reasons: list[str] = []
        voice = None
        audio_media = db.scalar(
            select(ProductMedia)
            .where(
                ProductMedia.product_id == product.id,
                ProductMedia.media_type == "audio",
                ProductMedia.deleted_or_anonymized.is_(False),
            )
            .order_by(ProductMedia.created_at.desc())
        )
        if audio_media:
            suffix = Path(audio_media.storage_uri).suffix or ".webm"
            handle, temp_path = tempfile.mkstemp(suffix=suffix)
            try:
                with os.fdopen(handle, "wb") as stream:
                    stream.write(storage.get_bytes(audio_media.storage_uri))
                transcript = FasterWhisperTranscriber(settings).transcribe(Path(temp_path))
                voice = VoiceFacts(
                    artisan_story=transcript.transcript,
                    confidence=transcript.confidence,
                    model_version=transcript.model_version,
                )
            except Exception as exc:
                review_reasons.append(f"voice transcription requires review: {exc}")
            finally:
                Path(temp_path).unlink(missing_ok=True)

        orchestrator = ProductProcessingOrchestrator(
            _detector_adapter(settings, review_reasons),
            _category_adapter(settings, review_reasons),
            _material_adapter(settings, review_reasons),
        )
        result = orchestrator.process_visuals(product.id, image.rgb_array, voice)
        review_reasons.extend(result.review_reasons)
        result.record.requires_review = True
        product.product_record = result.record.model_dump(mode="json")
        product.status = ProductStatus.NEEDS_REVIEW
        review = AmbassadorReview(
            product_id=product.id,
            status=ReviewStatus.OPEN,
            reason="; ".join(dict.fromkeys(review_reasons)),
            payload=result.record.model_dump(mode="json"),
        )
        db.add(review)
        db.flush()
        job.status = "SUCCESS"
        result_payload = {"review_id": str(review.id), "requires_review": True}
        job.result = result_payload
        db.commit()
        return {"product_id": product_id, **result_payload}
    except Exception as exc:
        db.rollback()
        job = db.get(ProcessingJob, UUID(job_id))
        product = db.get(Product, UUID(product_id))
        if job:
            job.status = "FAILED"
            job.error = str(exc)[:1000]
        if product:
            product.status = ProductStatus.NEEDS_REVIEW
        db.commit()
        raise
    finally:
        db.close()
