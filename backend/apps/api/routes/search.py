from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from apps.api.dependencies import get_db
from jungle_market.domain.models.catalog import CatalogEntry

router = APIRouter(prefix="/v1", tags=["search"])


@router.get("/catalog/search")
def search_catalog(
    q: str | None = None,
    category: str | None = None,
    material: str | None = None,
    min_price: float | None = Query(default=None, ge=0),
    max_price: float | None = Query(default=None, ge=0),
    available: bool | None = True,
    region: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> list[dict]:
    query = select(CatalogEntry)
    if q:
        query = query.where(CatalogEntry.search_vector_text.ilike(f"%{q}%"))
    if category:
        query = query.where(CatalogEntry.category == category)
    if material:
        query = query.where(CatalogEntry.dominant_material == material)
    if min_price is not None:
        query = query.where(CatalogEntry.price >= min_price)
    if max_price is not None:
        query = query.where(CatalogEntry.price <= max_price)
    if available is not None:
        query = query.where(CatalogEntry.available == available)
    if region:
        query = query.where(CatalogEntry.region == region)
    rows = db.scalars(
        query.order_by(CatalogEntry.created_at.desc()).offset(offset).limit(limit)
    ).all()
    return [
        {
            "product_id": row.product_id,
            "status": row.status,
            "title": row.title,
            "category": row.category,
            "dominant_material": row.dominant_material,
            "region": row.region,
            "price": row.price,
            "currency": row.currency,
            "available": row.available,
        }
        for row in rows
    ]
