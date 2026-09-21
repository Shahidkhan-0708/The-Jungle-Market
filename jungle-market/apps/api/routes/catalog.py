from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from jungle_market.infrastructure.database.session import get_db
from jungle_market.infrastructure.database.models.product import Product
from jungle_market.infrastructure.database.models.user import ArtisanProfile
from jungle_market.infrastructure.database.models.workflow import ProductReview
from jungle_market.domain.enums.product import ProductStatus
from jungle_market.core.config import settings

router = APIRouter(prefix="/v1/catalog", tags=["catalog"])


def public_product(product, maker):
    r = product.record_data or {}
    media = settings.PUBLIC_API_URL.rstrip("/") + "/v1/media/"
    return {"id": str(product.id), "title": product.title, "description": product.description,
            "price": product.final_price, "stock": product.stock_quantity, "artisan_id": str(maker.user_id),
            "artisan": maker.full_name, "region": r.get("region", ""), "category": r.get("category", ""),
            "materials": r.get("materials", ""), "dimensions": {k: r.get(k) for k in ["length_cm", "width_cm", "height_cm"]},
            "dimension_source": "Maker supplied; AI listing review" if r.get("publication_review") == "AI" else "Maker supplied; field reviewed",
            "verification_state": "AI_REVIEWED" if r.get("publication_review") == "AI" else "VERIFIED_HUMAN",
            "image_uri": media + str(r["image_id"]) + "/public" if r.get("image_id") else None,
            "audio_uri": media + str(r["audio_id"]) + "/public" if r.get("audio_id") and r.get("audio_public_consent") else None,
            "transcript": r.get("transcript", ""), "translation": r.get("translation", "") if r.get("translation_approved") else "",
            "language": r.get("language", ""), "maker_share": round(max(0, (product.final_price or 0) - 113), 2),
            "logistics_allowance": 80, "network_allowance": 33,
            "provenance_url": settings.PUBLIC_SITE_URL.rstrip("/") + "/?craft=" + str(product.id)}


@router.get("/search")
async def search_catalog(q: str = "", category: str = "", min_price: float = Query(0, ge=0),
                         max_price: float | None = Query(None, ge=0), limit: int = Query(30, ge=1, le=100),
                         offset: int = Query(0, ge=0), db: AsyncSession = Depends(get_db)):
    query = select(Product, ArtisanProfile).join(ArtisanProfile).where(
        Product.status == ProductStatus.PUBLISHED, Product.final_price >= min_price)
    if q.strip():
        value = "%" + q.strip().replace("%", "\\%").replace("_", "\\_") + "%"
        query = query.where(or_(Product.title.ilike(value, escape="\\"), Product.description.ilike(value, escape="\\")))
    if category:
        query = query.where(Product.record_data["category"].as_string() == category)
    if max_price is not None:
        query = query.where(Product.final_price <= max_price)
    rows = (await db.execute(query.order_by(Product.created_at.desc()).offset(offset).limit(limit))).all()
    data = [public_product(p, maker) for p, maker in rows]
    return {"data": data, "count": len(data)}


@router.get("/product/{product_id}")
async def get_product(product_id: UUID, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(Product, ArtisanProfile).join(ArtisanProfile).where(
        Product.id == product_id, Product.status == ProductStatus.PUBLISHED))).first()
    if not row:
        raise HTTPException(404, "This craft is not published.")
    data = public_product(*row)
    reviews = (await db.execute(select(ProductReview).where(ProductReview.product_id == product_id,
        ProductReview.decision == "APPROVE").order_by(ProductReview.created_at.desc()).limit(1))).scalars().all()
    data["evidence"] = [{"checked_at": r.created_at.isoformat(), "notes": r.evidence.get("notes"),
                         "checks": r.evidence.get("checks")} for r in reviews]
    return data

