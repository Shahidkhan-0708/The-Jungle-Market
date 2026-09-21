from typing import Literal
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from apps.api.routes.auth import current_user, UserResponse, require_role
from apps.api.routes.products import product_data, publication_errors
from jungle_market.infrastructure.database.session import get_db
from jungle_market.infrastructure.database.models.product import Product
from jungle_market.infrastructure.database.models.user import ArtisanProfile
from jungle_market.infrastructure.database.models.workflow import ProductReview
from jungle_market.domain.enums.product import ProductStatus

router = APIRouter(prefix="/v1/ambassador", tags=["ambassador"])


class ReviewAction(BaseModel):
    product_id: UUID
    action: Literal["APPROVE", "REJECT", "REQUEST_REVISION"]
    notes: str = Field(min_length=10, max_length=3000)
    checks: list[Literal["materials", "dimensions", "origin", "story"]] = Field(default_factory=list)
    version: int = Field(ge=1)


@router.get("/queue")
async def get_review_queue(user: UserResponse = Depends(current_user), db: AsyncSession = Depends(get_db)):
    require_role(user, "AMBASSADOR")
    rows = (await db.execute(select(Product).join(ArtisanProfile).where(
        Product.status == ProductStatus.NEEDS_REVIEW, ArtisanProfile.user_id != user.id))).scalars().all()
    return {"queue": [product_data(p) for p in rows], "count": len(rows)}


@router.post("/review")
async def submit_review(action: ReviewAction, user: UserResponse = Depends(current_user), db: AsyncSession = Depends(get_db)):
    require_role(user, "AMBASSADOR")
    product = (await db.execute(select(Product).where(Product.id == action.product_id).with_for_update())).scalar_one_or_none()
    if not product:
        raise HTTPException(404, "Craft not found.")
    maker = await db.get(ArtisanProfile, product.artisan_id)
    if maker.user_id == user.id:
        raise HTTPException(403, "You cannot verify your own craft.")
    if product.status != ProductStatus.NEEDS_REVIEW or (product.record_data or {}).get("version") != action.version:
        raise HTTPException(409, "The review changed. Refresh the queue.")
    if action.action == "APPROVE":
        if set(action.checks) != {"materials", "dimensions", "origin", "story"} or publication_errors(product.record_data or {}):
            raise HTTPException(422, "All field checks and listing requirements must pass.")
        product.status = ProductStatus.VERIFIED
        product.needs_ambassador_review = False
    else:
        product.status = ProductStatus.DRAFT
    db.add(ProductReview(product_id=product.id, reviewer_id=user.id, decision=action.action,
        evidence={"notes": action.notes, "checks": action.checks, "version": action.version}))
    await db.commit()
    return product_data(product)

