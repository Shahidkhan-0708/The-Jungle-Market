import io
import tempfile
from typing import Literal
from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, RedirectResponse
from pydantic import BaseModel, Field, ConfigDict
from starlette.concurrency import run_in_threadpool
from PIL import Image, ImageOps, UnidentifiedImageError
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from apps.api.routes.auth import current_user, UserResponse
from jungle_market.infrastructure.database.session import get_db
from jungle_market.infrastructure.database.models.workflow import MediaAsset
from jungle_market.infrastructure.database.models.product import Product
from jungle_market.infrastructure.database.models.user import ArtisanProfile
from jungle_market.core.config import settings
from jungle_market.services.vision.autofill import identify_craft
from jungle_market.infrastructure.ml.colab_client import colab_ml, ColabMLUnavailable
from jungle_market.domain.enums.product import ProductStatus
from jungle_market.infrastructure.media_storage import cloud_media, read_object, write_object, delete_object, signed_upload, signed_read

router = APIRouter(prefix="/v1/media", tags=["media"])
MEDIA_ROOT = (Path(tempfile.gettempdir()) / "jungle-market-media" if cloud_media() else Path("data/private-media")).resolve()
AUDIO_TYPES = {"audio/webm": "webm", "audio/ogg": "ogg", "audio/wav": "wav", "audio/x-wav": "wav",
               "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/flac": "flac", "audio/aac": "aac"}


def media_path(asset, download=True):
    path = (MEDIA_ROOT / asset.path).resolve()
    if path.parent != MEDIA_ROOT:
        raise HTTPException(400, "Invalid media path.")
    if download and cloud_media() and not path.is_file():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(read_object(asset.path))
    return path


def store_media(asset, data):
    if cloud_media():
        write_object(asset.path,data,asset.content_type)
    path=media_path(asset,download=False)
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_bytes(data)


def delete_media(asset):
    if cloud_media():
        delete_object(asset.path)
        delete_object(f'incoming/{asset.owner_id}/{asset.id}')
    media_path(asset,download=False).unlink(missing_ok=True)


def normalize_upload(data, content_type, kind):
    limit = 15 * 1024 * 1024 if kind == "image" else 25 * 1024 * 1024
    if not data or len(data) > limit:
        raise HTTPException(413, f"Choose a nonempty file smaller than {limit // 1024 // 1024} MB.")
    if kind == "image":
        if content_type not in {"image/png", "image/jpeg", "image/webp"}:
            raise HTTPException(415, "Use JPEG, PNG, or WebP.")
        try:
            with Image.open(io.BytesIO(data)) as image:
                if image.width * image.height > 25000000:
                    raise HTTPException(413, "Image exceeds 25 megapixels.")
                output = io.BytesIO()
                ImageOps.exif_transpose(image).convert("RGB").save(output, "JPEG", quality=92)
                data = output.getvalue()
        except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
            raise HTTPException(400, "Image could not be decoded.") from None
        content_type, extension = "image/jpeg", "jpg"
    else:
        extension = AUDIO_TYPES.get(content_type)
        if not extension:
            raise HTTPException(415, "Use WebM, Ogg, WAV, MP3, M4A, AAC, or FLAC audio.")
    return data, content_type, extension


async def save_asset(file, user, db, consent, kind):
    if not consent:
        raise HTTPException(422, "Permission to store and process this recording/photo is required.")
    content_type = (file.content_type or "").split(";")[0]
    limit = 15 * 1024 * 1024 if kind == "image" else 25 * 1024 * 1024
    data = await file.read(limit + 1)
    data, content_type, extension = normalize_upload(data, content_type, kind)
    asset = MediaAsset(id=uuid4(), owner_id=user.id, path=f"{uuid4().hex}.{extension}",
                       content_type=content_type, size=len(data),
                       metadata_record={"processing_consent": True})
    MEDIA_ROOT.mkdir(parents=True, exist_ok=True)
    await run_in_threadpool(store_media,asset,data)
    try:
        db.add(asset)
        await db.commit()
    except Exception:
        await run_in_threadpool(delete_media,asset)
        raise
    return asset


def asset_data(asset):
    return {"id": str(asset.id), "content_type": asset.content_type, "size": asset.size,
            "url": f"/v1/media/{asset.id}", **(asset.metadata_record or {})}


class UploadRequest(BaseModel):
    kind: Literal["image", "audio"]
    content_type: str = Field(max_length=100)
    size: int = Field(gt=0, le=25*1024*1024)
    processing_consent: bool = False


@router.post("/upload-url")
async def upload_url(payload: UploadRequest, user: UserResponse = Depends(current_user), db: AsyncSession = Depends(get_db)):
    if not payload.processing_consent:
        raise HTTPException(422,"Give processing permission before uploading.")
    if not cloud_media():
        return {"mode":"local"}
    content_type=payload.content_type.split(';')[0]
    if payload.kind == 'image':
        if content_type not in {'image/jpeg','image/png','image/webp'} or payload.size>15*1024*1024:
            raise HTTPException(422,"Use JPEG, PNG or WebP smaller than 15 MB.")
        extension='jpg'
    else:
        extension=AUDIO_TYPES.get(content_type)
        if not extension: raise HTTPException(422,"Unsupported audio type.")
    asset=MediaAsset(id=uuid4(),owner_id=user.id,path=f'{uuid4().hex}.{extension}',content_type=content_type,
        size=payload.size,metadata_record={'processing_consent':True,'upload_pending':True,'kind':payload.kind})
    url=await run_in_threadpool(signed_upload,f'incoming/{user.id}/{asset.id}')
    db.add(asset);await db.commit()
    return {'mode':'supabase','id':str(asset.id),'upload_url':url}


@router.post("/{asset_id}/complete-upload")
async def complete_upload(asset_id: UUID, user: UserResponse = Depends(current_user), db: AsyncSession = Depends(get_db)):
    asset=(await db.execute(select(MediaAsset).where(MediaAsset.id==asset_id,MediaAsset.owner_id==user.id).with_for_update())).scalar_one_or_none()
    if not asset: raise HTTPException(404,"Upload not found.")
    metadata=asset.metadata_record or {}
    if not metadata.get('processing_consent'): raise HTTPException(403,"Processing permission was withdrawn.")
    if not metadata.get('upload_pending'): return asset_data(asset)
    key=f'incoming/{user.id}/{asset.id}'
    raw=await run_in_threadpool(read_object,key)
    data, content_type, _=await run_in_threadpool(normalize_upload,raw,asset.content_type,metadata['kind'])
    asset.content_type=content_type;asset.size=len(data)
    await run_in_threadpool(store_media,asset,data)
    asset.metadata_record={'processing_consent':True}
    await db.commit()
    await run_in_threadpool(delete_object,key)
    return asset_data(asset)


@router.post("/image", status_code=201)
async def image_upload(file: UploadFile = File(...), processing_consent: bool = Form(False),
                       user: UserResponse = Depends(current_user), db: AsyncSession = Depends(get_db)):
    return asset_data(await save_asset(file, user, db, processing_consent, "image"))


@router.post("/audio", status_code=201)
async def audio_upload(file: UploadFile = File(...), processing_consent: bool = Form(False),
                       user: UserResponse = Depends(current_user), db: AsyncSession = Depends(get_db)):
    return asset_data(await save_asset(file, user, db, processing_consent, "audio"))


async def owned_asset(asset_id, user, db):
    asset = await db.get(MediaAsset, asset_id)
    if not asset or asset.owner_id != user.id:
        raise HTTPException(404, "Media not found.")
    if (asset.metadata_record or {}).get("upload_pending"):
        raise HTTPException(409,"Finish uploading this media first.")
    if not (asset.metadata_record or {}).get("processing_consent"):
        raise HTTPException(403, "Processing consent was withdrawn. Upload again with renewed permission to process this media.")
    return asset


@router.get("/{asset_id}")
async def private_media(asset_id: UUID, user: UserResponse = Depends(current_user), db: AsyncSession = Depends(get_db)):
    asset = await db.get(MediaAsset, asset_id)
    if not asset:
        raise HTTPException(404, "Media not found.")
    if (asset.metadata_record or {}).get('upload_pending'):
        raise HTTPException(409,"Finish uploading this media first.")
    permitted = asset.owner_id == user.id
    if not permitted and user.role == "AMBASSADOR":
        permitted = bool((await db.execute(select(Product.id).where(
            Product.status == ProductStatus.NEEDS_REVIEW,
            or_(Product.record_data["image_id"].as_string() == str(asset_id),
                Product.record_data["audio_id"].as_string() == str(asset_id))))).first())
    if not permitted:
        raise HTTPException(404, "Media not found.")
    if cloud_media():
        return RedirectResponse(await run_in_threadpool(signed_read,asset.path),headers={"Cache-Control":"private, no-store"})
    if not media_path(asset).is_file():
        raise HTTPException(404, "Media file unavailable.")
    return FileResponse(media_path(asset), media_type=asset.content_type,
                        headers={"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"})


@router.get("/{asset_id}/public")
async def public_media(asset_id: UUID, db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Product).where(Product.status == ProductStatus.PUBLISHED,
        or_(Product.record_data["image_id"].as_string() == str(asset_id),
            Product.record_data["audio_id"].as_string() == str(asset_id))))).scalars().all()
    permitted = any((r.record_data.get("image_id") == str(asset_id) and r.record_data.get("image_public_consent")) or
                    (r.record_data.get("audio_id") == str(asset_id) and r.record_data.get("audio_public_consent")) for r in rows)
    if not permitted:
        raise HTTPException(404, "Media is not public.")
    asset = await db.get(MediaAsset, asset_id)
    if not asset:
        raise HTTPException(404, "Media file unavailable.")
    if cloud_media():
        return RedirectResponse(await run_in_threadpool(signed_read,asset.path),headers={"Cache-Control":"no-store"})
    if not media_path(asset).is_file():
        raise HTTPException(404, "Media file unavailable.")
    return FileResponse(media_path(asset), media_type=asset.content_type,
                        headers={"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"})


@router.post("/{asset_id}/transcribe")
async def transcribe(asset_id: UUID, source_language: str = Form("hi"),
                     user: UserResponse = Depends(current_user), db: AsyncSession = Depends(get_db)):
    asset = await owned_asset(asset_id, user, db)
    if not asset.content_type.startswith("audio/"):
        raise HTTPException(422, "Choose an audio recording.")
    try:
        result = await colab_ml.transcribe(media_path(asset).read_bytes(), asset.path, asset.content_type, source_language)
    except ColabMLUnavailable:
        raise HTTPException(503, "Recording saved. Colab transcription is unavailable; retry when it reconnects.") from None
    transcript = result.get("transcript")
    if not isinstance(transcript, str) or not transcript.strip():
        raise HTTPException(422, "No speech was detected. Play the recording and try a clearer take.")
    asset.metadata_record = {**asset.metadata_record, "transcript": transcript,
                             "language": result.get("language", source_language)}
    await db.commit()
    return asset_data(asset)


@router.post("/{asset_id}/remove-background")
async def remove_background(asset_id: UUID, user: UserResponse = Depends(current_user), db: AsyncSession = Depends(get_db)):
    asset = await owned_asset(asset_id, user, db)
    if not asset.content_type.startswith("image/"):
        raise HTTPException(422, "Choose a photo.")
    try:
        data = await colab_ml.remove_background(media_path(asset).read_bytes(), asset.path, asset.content_type)
        with Image.open(io.BytesIO(data)) as image:
            output = io.BytesIO()
            image.convert("RGBA").save(output, "PNG")
            data = output.getvalue()
    except (ColabMLUnavailable, OSError):
        raise HTTPException(503, "Original photo saved. Background removal is unavailable; retry later.") from None
    processed = MediaAsset(id=uuid4(), owner_id=user.id, path=f"{uuid4().hex}.png", content_type="image/png",
                           size=len(data), metadata_record={"processing_consent": True, "background_removed": True,
                               "source_image_id": (asset.metadata_record or {}).get("source_image_id", str(asset.id))})
    await run_in_threadpool(store_media,processed,data)
    try:
        db.add(processed)
        await db.commit()
    except Exception:
        await run_in_threadpool(delete_media,processed)
        raise
    return asset_data(processed)


async def measurement_photo(asset_id, user, db):
    asset = await owned_asset(asset_id, user, db)
    if not asset.content_type.startswith("image/"):
        raise HTTPException(422, "Choose a photo.")
    source = (asset.metadata_record or {}).get("source_image_id")
    if source:
        asset = await owned_asset(UUID(source), user, db)
    if not media_path(asset).is_file():
        raise HTTPException(404, "Original photo is unavailable. Upload a new photo with its marker.")
    return asset


@router.get("/{asset_id}/measurement-source")
async def measurement_source(asset_id: UUID, user: UserResponse = Depends(current_user), db: AsyncSession = Depends(get_db)):
    return asset_data(await measurement_photo(asset_id, user, db))


@router.post("/{asset_id}/identify")
async def identify_photo(asset_id: UUID, user: UserResponse = Depends(current_user), db: AsyncSession = Depends(get_db)):
    asset = await measurement_photo(asset_id, user, db)
    stored = (asset.metadata_record or {}).get("craft_suggestions")
    if not stored or stored.get("model") != settings.VISION_MODEL:
        try:
            suggestions = await identify_craft(media_path(asset))
        except ValueError:
            raise HTTPException(422, "The photo could not be identified reliably. Try a clearer photo or enter the details.") from None
        except Exception:
            raise HTTPException(503, "Photo analysis is temporarily unavailable. Your photo and existing details are saved; retry shortly.") from None
        stored = {**suggestions, "model": settings.VISION_MODEL, "source":"photo_ai",
                  "requires_review":True, "identified_at":datetime.now(timezone.utc).isoformat()}
        asset.metadata_record = {**(asset.metadata_record or {}), "craft_suggestions": stored}
        await db.commit()
    profile = (await db.execute(select(ArtisanProfile).where(ArtisanProfile.user_id == user.id))).scalars().first()
    return {**stored, "region": profile.region if profile and profile.region else "",
            "region_source": "artisan_profile" if profile and profile.region else None}


class MeasurementInput(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    marker_size_cm: float = Field(ge=0.5, le=50)
    x: float = Field(ge=0, lt=1)
    y: float = Field(ge=0, lt=1)
    width: float = Field(gt=0, le=1)
    height: float = Field(gt=0, le=1)


class AutomaticMeasurementInput(BaseModel):
    marker_size_cm: float = Field(default=5, ge=0.5, le=50, allow_inf_nan=False)


@router.post("/{asset_id}/auto-dimensions")
async def auto_dimensions(asset_id: UUID, measurement: AutomaticMeasurementInput,
                          user: UserResponse = Depends(current_user), db: AsyncSession = Depends(get_db)):
    selected = await owned_asset(asset_id, user, db)
    asset = await measurement_photo(asset_id, user, db)
    try:
        if (selected.metadata_record or {}).get("background_removed"):
            data = media_path(selected).read_bytes()
        else:
            data = await colab_ml.remove_background(media_path(asset).read_bytes(), asset.path, asset.content_type)
        def detect():
            import numpy as np
            from jungle_market.services.geometry.dimensions import dimension_service
            with Image.open(media_path(asset)) as photo, Image.open(io.BytesIO(data)) as cutout:
                rgb = np.asarray(photo.convert("RGB"))
                bounds = dimension_service.product_bounds(rgb, np.asarray(cutout.convert("RGBA")))
                result = {"bounds": bounds, "image_id": str(asset.id), "requires_review": True}
                try:
                    result.update(dimension_service.verify_dimensions_from_marker(rgb, bounds, measurement.marker_size_cm))
                    result["source"] = "aruco_segmented_bounds"
                except ValueError as error:
                    result["measurement_error"] = str(error)
                return result
        result = await run_in_threadpool(detect)
    except ValueError as error:
        raise HTTPException(422, str(error)) from None
    except (ColabMLUnavailable, OSError, ImportError, RuntimeError):
        raise HTTPException(503, "Automatic framing is unavailable. Retry or adjust the box manually.") from None
    if "width_cm" in result:
        result["measured_at"] = datetime.now(timezone.utc).isoformat()
        asset.metadata_record = {**(asset.metadata_record or {}), "dimension_measurement": result}
        await db.commit()
    return result


@router.post("/{asset_id}/dimensions")
async def measure_dimensions(asset_id: UUID, measurement: MeasurementInput,
                             user: UserResponse = Depends(current_user), db: AsyncSession = Depends(get_db)):
    asset = await measurement_photo(asset_id, user, db)
    def estimate():
        import numpy as np
        from jungle_market.services.geometry.dimensions import dimension_service
        with Image.open(media_path(asset)) as photo:
            return dimension_service.verify_dimensions_from_marker(np.asarray(photo.convert("RGB")),
                (measurement.x, measurement.y, measurement.width, measurement.height), measurement.marker_size_cm)
    try:
        result = await run_in_threadpool(estimate)
    except ValueError as error:
        raise HTTPException(422, str(error)) from None
    except (ImportError, RuntimeError):
        raise HTTPException(503, "Local ArUco measurement is unavailable.") from None
    except OSError:
        raise HTTPException(422, "Photo could not be read. Upload it again.") from None
    result = {**result, "image_id": str(asset.id), "measured_at": datetime.now(timezone.utc).isoformat()}
    asset.metadata_record = {**(asset.metadata_record or {}), "dimension_measurement": result}
    await db.commit()
    return result


@router.post("/{asset_id}/translate")
async def translate_audio(asset_id: UUID, source_language: str = Form("hi"),
                          user: UserResponse = Depends(current_user), db: AsyncSession = Depends(get_db)):
    asset = await owned_asset(asset_id, user, db)
    if not asset.content_type.startswith("audio/"):
        raise HTTPException(422, "Choose an audio recording.")
    try:
        result = await colab_ml.translate_audio(media_path(asset).read_bytes(), asset.path, asset.content_type, source_language)
    except ColabMLUnavailable as error:
        raise HTTPException(503, str(error)) from None
    asset.metadata_record = {**asset.metadata_record, "translation": result["translated_text"]}
    await db.commit()
    return {**result, "used_in_listing": False}

