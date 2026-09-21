from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from apps.api.routes.auth import current_user, UserResponse
from apps.api.routes.media import delete_media
from starlette.concurrency import run_in_threadpool
from jungle_market.infrastructure.database.session import get_db
from jungle_market.infrastructure.database.models.workflow import FeatureRecord, MediaAsset
from jungle_market.infrastructure.database.models.product import Product
from jungle_market.infrastructure.database.models.user import ArtisanProfile
from jungle_market.domain.enums.product import ProductStatus

router = APIRouter(prefix="/v1/consent", tags=["consent"])


class Consent(BaseModel):
    processing: bool
    publish_images: bool = False
    publish_audio: bool = False


@router.post("")
async def save_consent(payload: Consent, user: UserResponse = Depends(current_user), db: AsyncSession = Depends(get_db)):
    products = (await db.execute(select(Product).join(ArtisanProfile).where(
        ArtisanProfile.user_id == user.id).with_for_update(of=Product))).scalars().all()
    for product in products:
        if product.status == ProductStatus.ARCHIVED:
            continue
        record = dict(product.record_data or {})
        for flag, allowed in [("processing_consent", payload.processing),
                              ("image_public_consent", payload.publish_images),
                              ("audio_public_consent", payload.publish_audio)]:
            if not allowed:
                record[flag] = False
        record["version"] = record.get("version", 0) + 1
        product.record_data = record
        if not payload.processing or not payload.publish_images:
            product.status = ProductStatus.DRAFT
            product.needs_ambassador_review = True
    if not payload.processing:
        assets = (await db.execute(select(MediaAsset).where(MediaAsset.owner_id == user.id))).scalars().all()
        for asset in assets:
            asset.metadata_record = {**(asset.metadata_record or {}), "processing_consent": False}
    row = FeatureRecord(owner_id=user.id, kind="consent", payload=payload.model_dump())
    db.add(row)
    await db.commit()
    return {"id": str(row.id), **row.payload}


@router.get("")
async def get_consent(user: UserResponse = Depends(current_user), db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(FeatureRecord).where(FeatureRecord.owner_id == user.id,
        FeatureRecord.kind == "consent").order_by(FeatureRecord.created_at.desc()).limit(1))).scalar_one_or_none()
    return row.payload if row else {"processing": False, "publish_images": False, "publish_audio": False}


@router.post("/delete-data")
async def delete_data(user: UserResponse = Depends(current_user), db: AsyncSession = Depends(get_db)):
    products = (await db.execute(select(Product).join(ArtisanProfile).where(
        ArtisanProfile.user_id == user.id).with_for_update(of=Product))).scalars().all()
    for product in products:
        product.status = ProductStatus.ARCHIVED
        product.title = "Withdrawn craft"
        product.description = ""
        product.record_data = {}
    # Revoke public access first. Retain order/settlement records for transaction integrity.
    await db.commit()
    assets = (await db.execute(select(MediaAsset).where(MediaAsset.owner_id == user.id))).scalars().all()
    for asset in assets:
        try:
            await run_in_threadpool(delete_media,asset)
        except OSError:
            raise HTTPException(503, "Listings withdrawn. Some media could not be removed; retry deletion.") from None
        await db.delete(asset)
    await db.execute(delete(FeatureRecord).where(FeatureRecord.owner_id == user.id))
    profiles = (await db.execute(select(ArtisanProfile).where(ArtisanProfile.user_id == user.id))).scalars().all()
    for profile in profiles:
        profile.full_name, profile.bio, profile.region = "Deleted maker", None, None
    await db.commit()
    return {"status": "COMPLETED", "deleted_media": len(assets),
            "retained": "Transaction records and Supabase sign-in account. Account closure requires a separate request."}

