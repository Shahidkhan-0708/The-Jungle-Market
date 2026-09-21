from typing import Literal
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from apps.api.routes.auth import current_user, UserResponse, require_role
from jungle_market.infrastructure.database.session import get_db
from jungle_market.infrastructure.database.models.product import Product
from jungle_market.infrastructure.database.models.user import ArtisanProfile
from jungle_market.infrastructure.database.models.workflow import MediaAsset, ProductReview
from jungle_market.domain.enums.product import ProductStatus
from jungle_market.services.pricing.costs import CostItem
from jungle_market.services.vision.autofill import assess_listing
from jungle_market.core.config import settings
from datetime import datetime, timezone

router = APIRouter(prefix="/v1/products", tags=["products"])


class Draft(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    title: str = Field(default="", max_length=200)
    description: str = Field(default="", max_length=8000)
    category: str = Field(default="", max_length=100)
    materials: str = Field(default="", max_length=500)
    region: str = Field(default="", max_length=200)
    length_cm: float | None = Field(default=None, gt=0, le=1000, allow_inf_nan=False)
    width_cm: float | None = Field(default=None, gt=0, le=1000, allow_inf_nan=False)
    height_cm: float | None = Field(default=None, gt=0, le=1000, allow_inf_nan=False)
    price: float = Field(default=0, ge=0, le=1000000, allow_inf_nan=False)
    stock: int = Field(default=1, ge=0, le=10000)
    image_id: UUID | None = None
    audio_id: UUID | None = None
    transcript: str = Field(default="", max_length=8000)
    translation: str = Field(default="", max_length=8000)
    language: str = Field(default="hi", pattern=r"^[a-z]{2,3}$")
    translation_approved: bool = False
    processing_consent: bool = False
    image_public_consent: bool = False
    audio_public_consent: bool = False
    version: int = Field(default=0, ge=0)
    cost_items: list[CostItem] = Field(default_factory=list, max_length=30)
    cost_notes: str = Field(default="", max_length=8000)
    cost_markup_percent: float = Field(default=20, ge=0, le=200, allow_inf_nan=False)


async def artisan_profile(db, user):
    profile = (await db.execute(select(ArtisanProfile).where(ArtisanProfile.user_id == user.id))).scalars().first()
    if profile is None:
        # One deterministic profile per Supabase account.
        profile = ArtisanProfile(id=user.id, user_id=user.id, full_name=user.full_name)
        db.add(profile)
        await db.flush()
    return profile


async def owned_product(db, product_id, user, lock=False):
    query = select(Product).join(ArtisanProfile).where(Product.id == product_id, ArtisanProfile.user_id == user.id)
    if lock:
        query = query.with_for_update(of=Product)
    product = (await db.execute(query)).scalar_one_or_none()
    if product is None:
        raise HTTPException(404, "Craft not found.")
    return product


def product_data(product):
    record = product.record_data or {}
    return {"id": str(product.id), "status": product.status.value, "title": product.title or "",
            "price": product.final_price or 0, "stock": product.stock_quantity,
            "draft": {**{k:v for k,v in record.items() if k in Draft.model_fields}, "stock": product.stock_quantity, "price": product.final_price or 0},
            "ai_assessment": record.get("ai_assessment"),
            "updated_at": product.updated_at.isoformat() if product.updated_at else None}


async def validate_media(db, draft, user):
    for asset_id, kind in [(draft.image_id, "image/"), (draft.audio_id, "audio/")]:
        if asset_id:
            asset = await db.get(MediaAsset, asset_id)
            if not asset or asset.owner_id != user.id or not asset.content_type.startswith(kind):
                raise HTTPException(422, "Choose media uploaded by your own account.")
            if (asset.metadata_record or {}).get("upload_pending"):
                raise HTTPException(422,"Finish uploading the media before saving this craft.")


@router.get("")
async def my_products(user: UserResponse = Depends(current_user), db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Product).join(ArtisanProfile).where(
        ArtisanProfile.user_id == user.id).order_by(Product.updated_at.desc()))).scalars().all()
    latest = {}
    if rows:
        reviews = (await db.execute(select(ProductReview).where(ProductReview.product_id.in_([row.id for row in rows]))
                                   .order_by(ProductReview.created_at.desc()))).scalars().all()
        for review in reviews:
            latest.setdefault(review.product_id, {"decision": review.decision, **review.evidence})
    return {"data": [{**product_data(row), "last_review": latest.get(row.id)} for row in rows]}


@router.post("", status_code=201)
async def create_draft(draft: Draft, user: UserResponse = Depends(current_user), db: AsyncSession = Depends(get_db)):
    require_role(user, "ARTISAN")
    await validate_media(db, draft, user)
    profile = await artisan_profile(db, user)
    record = draft.model_dump(mode="json")
    record["version"] = 1
    product = Product(id=uuid4(), artisan_id=profile.id, title=draft.title, description=draft.description,
                      status=ProductStatus.DRAFT, final_price=draft.price, stock_quantity=draft.stock, record_data=record)
    db.add(product)
    await db.commit()
    return product_data(product)


@router.put("/{product_id}")
async def save_draft(product_id: UUID, draft: Draft, user: UserResponse = Depends(current_user), db: AsyncSession = Depends(get_db)):
    require_role(user, "ARTISAN")
    product = await owned_product(db, product_id, user, lock=True)
    if product.status in {ProductStatus.NEEDS_REVIEW, ProductStatus.PUBLISHED, ProductStatus.ARCHIVED}:
        raise HTTPException(409, "Withdraw this listing before editing it.")
    if draft.version != (product.record_data or {}).get("version", 0):
        raise HTTPException(409, "This draft changed in another session. Reload it before saving.")
    await validate_media(db, draft, user)
    product.title, product.description = draft.title, draft.description
    product.final_price, product.stock_quantity = draft.price, draft.stock
    product.record_data = {**draft.model_dump(mode="json"), "version": draft.version + 1}
    product.status = ProductStatus.DRAFT
    product.needs_ambassador_review = True
    await db.commit()
    return product_data(product)


def publication_errors(record):
    missing = [name for name in ["title", "category", "materials", "region", "description", "image_id",
                                "length_cm", "width_cm", "height_cm", "processing_consent", "image_public_consent"]
               if not record.get(name)]
    if record.get("price", 0) <= 113:
        missing.append("price above the ₹113 delivery/network allowance")
    if record.get("stock", 0) < 1:
        missing.append("stock")
    if record.get("translation") and not record.get("translation_approved"):
        missing.append("approved translation")
    return missing


@router.post("/{product_id}/submit")
async def submit_review(product_id: UUID, user: UserResponse = Depends(current_user), db: AsyncSession = Depends(get_db)):
    product = await owned_product(db, product_id, user, lock=True)
    if product.status != ProductStatus.DRAFT:
        raise HTTPException(409, "Only a draft can be submitted.")
    missing = publication_errors(product.record_data or {})
    if missing:
        raise HTTPException(422, "Complete: " + ", ".join(missing))
    from apps.api.routes.media import measurement_photo, media_path
    asset = await measurement_photo(UUID(product.record_data["image_id"]), user, db)
    try:
        assessment = await assess_listing(media_path(asset), product.record_data)
    except Exception:
        raise HTTPException(503, "AI assessment is unavailable. Your draft is saved; retry before publishing.") from None
    assessment = {**assessment, "version": product.record_data["version"], "model": settings.VISION_MODEL,
                  "assessed_at": datetime.now(timezone.utc).isoformat()}
    product.record_data = {**product.record_data, "ai_assessment": assessment}
    product.needs_ambassador_review = assessment["score"] < 75
    product.status = ProductStatus.NEEDS_REVIEW if product.needs_ambassador_review else ProductStatus.DRAFT
    await db.commit()
    return product_data(product)


@router.post("/{product_id}/publish")
async def publish_listing(product_id: UUID, user: UserResponse = Depends(current_user), db: AsyncSession = Depends(get_db)):
    product = await owned_product(db, product_id, user, lock=True)
    assessment = (product.record_data or {}).get("ai_assessment") or {}
    ai_ready = (product.status == ProductStatus.DRAFT and assessment.get("version") == product.record_data.get("version")
                and isinstance(assessment.get("score"), int) and 75 <= assessment["score"] <= 100)
    if product.status != ProductStatus.VERIFIED and not ai_ready:
        raise HTTPException(409, "Run AI assessment first. Scores below 75 require ambassador approval.")
    if publication_errors(product.record_data or {}):
        raise HTTPException(422, "Listing requirements are incomplete.")
    product.record_data = {**product.record_data, "publication_review": "AI" if ai_ready else "AMBASSADOR"}
    product.needs_ambassador_review = False
    product.status = ProductStatus.PUBLISHED
    await db.commit()
    return product_data(product)


@router.post("/{product_id}/withdraw")
async def withdraw(product_id: UUID, user: UserResponse = Depends(current_user), db: AsyncSession = Depends(get_db)):
    product = await owned_product(db, product_id, user, lock=True)
    if product.status == ProductStatus.ARCHIVED:
        raise HTTPException(409, "An archived listing cannot be restored. Create a new draft.")
    product.status = ProductStatus.DRAFT
    product.needs_ambassador_review = True
    product.record_data = {**{k:v for k,v in (product.record_data or {}).items() if k in Draft.model_fields}, "version": (product.record_data or {}).get("version", 0) + 1}
    await db.commit()
    return product_data(product)

