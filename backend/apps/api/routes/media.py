from pathlib import Path
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from apps.api.dependencies import (
    ensure_user,
    get_db,
    owned_product,
    require_roles,
    settings_dependency,
    storage_dependency,
)
from jungle_market.core.config import Settings
from jungle_market.core.errors import ConsentRequired
from jungle_market.core.security import Principal
from jungle_market.domain.enums import ConsentType
from jungle_market.domain.models.consent import ConsentRecord
from jungle_market.domain.models.products import ProductMedia
from jungle_market.domain.schemas.media import MediaUploadResponse
from jungle_market.infrastructure.storage.object_storage import ObjectStorage
from jungle_market.services.image_ingest.service import ImageIngestService

router = APIRouter(prefix="/v1/media", tags=["media"])


async def _read_limited(file: UploadFile, limit: int) -> bytes:
    chunks: list[bytes] = []
    size = 0
    while chunk := await file.read(1024 * 1024):
        size += len(chunk)
        if size > limit:
            raise HTTPException(status_code=413, detail="upload exceeds configured byte limit")
        chunks.append(chunk)
    return b"".join(chunks)


def _consent(db: Session, user_id: UUID, consent_type: ConsentType) -> ConsentRecord:
    record = db.scalar(
        select(ConsentRecord)
        .where(
            ConsentRecord.subject_user_id == user_id,
            ConsentRecord.consent_type == consent_type,
        )
        .order_by(ConsentRecord.created_at.desc())
    )
    if record is None or not record.granted:
        raise ConsentRequired(f"{consent_type.value} consent is required")
    return record


@router.post("/image", response_model=MediaUploadResponse)
async def upload_image(
    file: UploadFile = File(...),
    uploader_user_id: UUID = Form(...),
    product_id: UUID | None = Form(default=None),
    principal: Principal = Depends(require_roles("ARTISAN")),
    db: Session = Depends(get_db),
    settings: Settings = Depends(settings_dependency),
    storage: ObjectStorage = Depends(storage_dependency),
) -> MediaUploadResponse:
    if uploader_user_id != principal.user_id:
        raise HTTPException(status_code=403, detail="Cannot upload media for another user")
    ensure_user(db, principal)
    if product_id is not None:
        owned_product(db, product_id, principal)
    consent = _consent(db, principal.user_id, ConsentType.MEDIA)
    payload = await _read_limited(file, settings.max_image_bytes)
    ingested = ImageIngestService(settings).open_image(payload)
    filename = Path(file.filename or "upload.jpg").name
    stored = storage.put_bytes(
        f"images/{uuid4()}-{filename}", payload, file.content_type or "image/jpeg"
    )
    media = ProductMedia(
        product_id=product_id,
        uploader_user_id=principal.user_id,
        media_type="image",
        storage_uri=stored.uri,
        checksum_sha256=stored.checksum_sha256,
        consent_record_id=consent.id,
        byte_size=stored.byte_size,
        width_px=ingested.width,
        height_px=ingested.height,
    )
    db.add(media)
    db.commit()
    return MediaUploadResponse(
        media_id=media.id,
        product_id=product_id,
        storage_uri=stored.uri,
        media_type="image",
        width=ingested.width,
        height=ingested.height,
    )


@router.post("/audio", response_model=MediaUploadResponse)
async def upload_audio(
    file: UploadFile = File(...),
    uploader_user_id: UUID = Form(...),
    product_id: UUID | None = Form(default=None),
    principal: Principal = Depends(require_roles("ARTISAN")),
    db: Session = Depends(get_db),
    settings: Settings = Depends(settings_dependency),
    storage: ObjectStorage = Depends(storage_dependency),
) -> MediaUploadResponse:
    if uploader_user_id != principal.user_id:
        raise HTTPException(status_code=403, detail="Cannot upload media for another user")
    if file.content_type not in settings.allowed_audio_types:
        raise HTTPException(status_code=415, detail="unsupported audio type")
    ensure_user(db, principal)
    if product_id is not None:
        owned_product(db, product_id, principal)
    consent = _consent(db, principal.user_id, ConsentType.VOICE)
    payload = await _read_limited(file, settings.max_audio_bytes)
    filename = Path(file.filename or "upload.webm").name
    stored = storage.put_bytes(
        f"audio/{uuid4()}-{filename}", payload, file.content_type or "audio/webm"
    )
    media = ProductMedia(
        product_id=product_id,
        uploader_user_id=principal.user_id,
        media_type="audio",
        storage_uri=stored.uri,
        checksum_sha256=stored.checksum_sha256,
        consent_record_id=consent.id,
        byte_size=stored.byte_size,
    )
    db.add(media)
    db.commit()
    return MediaUploadResponse(
        media_id=media.id,
        product_id=product_id,
        storage_uri=stored.uri,
        media_type="audio",
    )
