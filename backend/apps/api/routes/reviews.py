from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from apps.api.dependencies import ensure_user, get_db, require_roles
from jungle_market.core.errors import NotFound
from jungle_market.core.security import Principal
from jungle_market.domain.enums import ProductStatus, ReviewStatus
from jungle_market.domain.models.products import Product
from jungle_market.domain.models.reviews import AmbassadorCorrection, AmbassadorReview
from jungle_market.domain.schemas.product_record import ProductRecord

router = APIRouter(prefix="/v1/reviews/ambassador", tags=["ambassador-reviews"])


class CorrectionRequest(BaseModel):
    field_name: str
    value: dict
    note: str | None = None


@router.get("/queue")
def review_queue(
    principal: Principal = Depends(require_roles("AMBASSADOR")),
    db: Session = Depends(get_db),
) -> list[dict]:
    ensure_user(db, principal)
    reviews = db.scalars(
        select(AmbassadorReview)
        .where(AmbassadorReview.status == ReviewStatus.OPEN)
        .order_by(AmbassadorReview.created_at)
    ).all()
    return [
        {
            "id": review.id,
            "product_id": review.product_id,
            "reason": review.reason,
            "payload": review.payload,
            "status": review.status,
        }
        for review in reviews
    ]


@router.post("/{review_id}/approve")
def approve_review(
    review_id: UUID,
    principal: Principal = Depends(require_roles("AMBASSADOR")),
    db: Session = Depends(get_db),
) -> dict:
    ensure_user(db, principal)
    review = db.get(AmbassadorReview, review_id)
    if review is None:
        raise NotFound("review not found")
    product = db.get(Product, review.product_id)
    if product is None or product.product_record is None:
        raise NotFound("product record not found")
    record = ProductRecord.model_validate(product.product_record)
    record.requires_review = False
    record.conflicts = []
    product.product_record = record.model_dump(mode="json")
    product.status = ProductStatus.VERIFIED
    review.status = ReviewStatus.APPROVED
    review.assigned_to_user_id = principal.user_id
    db.commit()
    return {"id": review_id, "status": review.status}


@router.post("/{review_id}/correct")
def correct_review(
    review_id: UUID,
    payload: CorrectionRequest,
    principal: Principal = Depends(require_roles("AMBASSADOR")),
    db: Session = Depends(get_db),
) -> dict:
    ensure_user(db, principal)
    review = db.get(AmbassadorReview, review_id)
    if review is None:
        raise NotFound("review not found")
    product = db.get(Product, review.product_id)
    if product is None or product.product_record is None:
        raise NotFound("product record not found")
    record = ProductRecord.model_validate(product.product_record)
    old_value: dict | None
    value = payload.value.get("value")
    if not isinstance(value, str) or not value.strip():
        raise HTTPException(status_code=422, detail="Correction value must be a non-empty string")
    if payload.field_name == "category" and record.category:
        old_value = {"value": record.category.value}
        record.category.value = value.strip()
    elif payload.field_name == "dominant_material" and value in {m.value for m in record.materials}:
        old_value = {"value": record.dominant_material}
        record.dominant_material = value
    elif payload.field_name == "artisan_story" and record.artisan_story:
        old_value = {"value": record.artisan_story.value}
        record.artisan_story.value = value.strip()
    else:
        raise HTTPException(status_code=422, detail="Unsupported correction")

    record.requires_review = False
    record.conflicts = []
    product.product_record = record.model_dump(mode="json")
    product.status = ProductStatus.VERIFIED
    review.status = ReviewStatus.CORRECTED
    review.assigned_to_user_id = principal.user_id
    db.add(
        AmbassadorCorrection(
            review_id=review.id,
            product_id=product.id,
            corrected_by_user_id=principal.user_id,
            field_name=payload.field_name,
            old_value=old_value,
            new_value={"value": value.strip()},
            note=payload.note,
        )
    )
    db.commit()
    return {"id": review_id, "status": review.status, "corrected_field": payload.field_name}
