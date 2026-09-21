from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from apps.api.dependencies import (
    ensure_artisan_profile,
    get_current_principal,
    get_db,
    owned_product,
    require_roles,
    settings_dependency,
)
from apps.worker.tasks.processing import process_product_task
from jungle_market.core.config import Settings
from jungle_market.core.errors import NotFound, PublishBlocked
from jungle_market.core.security import Principal
from jungle_market.domain.enums import ProductStatus, ReviewStatus
from jungle_market.domain.models.catalog import CatalogEntry, Inventory
from jungle_market.domain.models.pricing import PriceRecommendation
from jungle_market.domain.models.products import ProcessingJob, Product
from jungle_market.domain.models.reviews import AmbassadorReview
from jungle_market.domain.models.seo import SEOContent
from jungle_market.domain.models.trust import RiskAssessment
from jungle_market.domain.models.users import ArtisanProfile
from jungle_market.domain.schemas.pricing import (
    CostFloorInput,
    PriceRecommendationResult,
    PricingRange,
)
from jungle_market.domain.schemas.product_record import ProductRecord
from jungle_market.domain.schemas.seo import SEOContentDraft
from jungle_market.services.catalog.service import CatalogService
from jungle_market.services.dimensions.service import DimensionStats, ManualDimensionValidator
from jungle_market.services.pricing.service import PricingDecisionEngine, PricingEvidence
from jungle_market.services.seo.service import GroundedSEOGenerator
from jungle_market.services.trust_safety.service import (
    ListingRiskGate,
    publication_status_from_risk,
)

router = APIRouter(prefix="/v1/products", tags=["products"])


class ProductCreate(BaseModel):
    title: str | None = Field(default=None, max_length=140)
    stock_on_hand: int = Field(default=1, ge=0)


class ProductPatch(BaseModel):
    title: str | None = Field(default=None, max_length=140)


class ManualDimensionsRequest(BaseModel):
    category: str
    width_mm: float | None = Field(default=None, gt=0)
    height_mm: float | None = Field(default=None, gt=0)
    depth_mm: float | None = Field(default=None, gt=0)


def _record(product: Product) -> ProductRecord:
    if product.product_record is None:
        raise NotFound("product record not found")
    return ProductRecord.model_validate(product.product_record)


def _seo(db: Session, product_id: UUID) -> SEOContentDraft | None:
    row = db.scalar(
        select(SEOContent)
        .where(SEOContent.product_id == product_id)
        .order_by(SEOContent.created_at.desc())
    )
    if row is None:
        return None
    return SEOContentDraft(
        title=row.title,
        description=row.description,
        tags=row.tags,
        keywords=row.keywords,
    )


def _pricing(db: Session, product_id: UUID) -> PriceRecommendationResult | None:
    row = db.scalar(
        select(PriceRecommendation)
        .where(PriceRecommendation.product_id == product_id)
        .order_by(PriceRecommendation.created_at.desc())
    )
    if row is None:
        return None
    return PriceRecommendationResult(
        model_range=None,
        market_range=None,
        cost_floor=row.cost_floor,
        final_range=PricingRange(
            p20=row.final_p20,
            p50=row.final_p50,
            p80=row.final_p80,
            currency=row.currency,
        ),
        confidence=row.confidence,
        requires_review=row.requires_review,
        reasons=row.reasons,
    )


@router.post("")
def create_product(
    payload: ProductCreate,
    principal: Principal = Depends(require_roles("ARTISAN")),
    db: Session = Depends(get_db),
) -> dict:
    artisan = ensure_artisan_profile(db, principal)
    product = Product(
        artisan_id=artisan.id,
        title=payload.title,
        status=ProductStatus.DRAFT,
    )
    db.add(product)
    db.flush()
    db.add(Inventory(product_id=product.id, stock_on_hand=payload.stock_on_hand))
    db.commit()
    return {"id": product.id, "status": product.status}


@router.get("/{product_id}")
def get_product(
    product_id: UUID,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> dict:
    product = db.get(Product, product_id)
    if product is None:
        raise NotFound("product not found")
    owner_id = db.scalar(
        select(ArtisanProfile.user_id).where(ArtisanProfile.id == product.artisan_id)
    )
    if (
        product.status != ProductStatus.PUBLISHED
        and owner_id != principal.user_id
        and "AMBASSADOR" not in principal.roles
    ):
        raise HTTPException(status_code=403, detail="Product belongs to another artisan")
    return {
        "id": product.id,
        "artisan_id": product.artisan_id,
        "title": product.title,
        "status": product.status,
        "record": product.product_record,
        "seo": _seo(db, product_id),
        "pricing": _pricing(db, product_id),
    }


@router.patch("/{product_id}")
def patch_product(
    product_id: UUID,
    payload: ProductPatch,
    principal: Principal = Depends(require_roles("ARTISAN")),
    db: Session = Depends(get_db),
) -> dict:
    product = owned_product(db, product_id, principal)
    if payload.title is not None:
        product.title = payload.title
    db.commit()
    return {"id": product.id, "title": product.title, "status": product.status}


@router.post("/{product_id}/process")
def process_product(
    product_id: UUID,
    principal: Principal = Depends(require_roles("ARTISAN")),
    db: Session = Depends(get_db),
) -> dict:
    product = owned_product(db, product_id, principal)
    job = ProcessingJob(product_id=product.id, task_id=str(uuid4()), status="QUEUED")
    product.status = ProductStatus.AI_PROCESSING
    db.add(job)
    db.commit()
    try:
        process_product_task.apply_async(args=[str(product.id), str(job.id)], task_id=job.task_id)
    except Exception as exc:
        job.status = "FAILED"
        job.error = "processing queue unavailable"
        product.status = ProductStatus.DRAFT
        db.commit()
        raise HTTPException(status_code=503, detail="Processing queue unavailable") from exc
    return {"product_id": product.id, "status": product.status, "job_id": job.id}


@router.get("/{product_id}/processing-status")
def processing_status(
    product_id: UUID,
    principal: Principal = Depends(require_roles("ARTISAN", "AMBASSADOR")),
    db: Session = Depends(get_db),
) -> dict:
    product = owned_product(db, product_id, principal)
    job = db.scalar(
        select(ProcessingJob)
        .where(ProcessingJob.product_id == product_id)
        .order_by(ProcessingJob.created_at.desc())
    )
    return {
        "product_id": product.id,
        "status": product.status,
        "latest_job": None
        if job is None
        else {
            "id": job.id,
            "status": job.status,
            "result": job.result,
            "error": job.error,
        },
    }


@router.post("/{product_id}/dimensions/manual")
def add_manual_dimensions(
    product_id: UUID,
    payload: ManualDimensionsRequest,
    principal: Principal = Depends(require_roles("ARTISAN")),
    db: Session = Depends(get_db),
) -> dict:
    product = owned_product(db, product_id, principal)
    record = (
        ProductRecord.model_validate(product.product_record)
        if product.product_record
        else ProductRecord(product_id=product_id)
    )
    validator = ManualDimensionValidator(
        {
            "basket": DimensionStats(80, 900, 40, 700, 30, 600),
            "pottery": DimensionStats(30, 800, 30, 900, 30, 800),
            "textile": DimensionStats(50, 3000, 50, 3000, 1, 80),
        }
    )
    dimensions, needs_review, reasons = validator.validate(
        payload.category, payload.width_mm, payload.height_mm, payload.depth_mm
    )
    record.dimensions = dimensions
    record.requires_review = record.requires_review or needs_review
    product.product_record = record.model_dump(mode="json")
    if needs_review:
        product.status = ProductStatus.NEEDS_REVIEW
        db.add(
            AmbassadorReview(
                product_id=product_id,
                status=ReviewStatus.OPEN,
                reason="manual dimensions failed plausibility checks",
                payload={"reasons": reasons, "dimensions": dimensions.model_dump(mode="json")},
            )
        )
    db.commit()
    return {"dimensions": dimensions, "requires_review": needs_review, "reasons": reasons}


@router.post("/{product_id}/seo/generate")
def generate_seo(
    product_id: UUID,
    principal: Principal = Depends(require_roles("ARTISAN")),
    db: Session = Depends(get_db),
    settings: Settings = Depends(settings_dependency),
) -> dict:
    product = owned_product(db, product_id, principal)
    draft = GroundedSEOGenerator(settings.gemini_api_key).generate(_record(product))
    db.add(
        SEOContent(
            product_id=product_id,
            title=draft.title,
            description=draft.description,
            tags=draft.tags,
            keywords=draft.keywords,
            passed_forbidden_claim_check=True,
        )
    )
    db.commit()
    return draft.model_dump()


@router.post("/{product_id}/pricing/recommend")
def recommend_pricing(
    product_id: UUID,
    payload: CostFloorInput,
    principal: Principal = Depends(require_roles("ARTISAN")),
    db: Session = Depends(get_db),
    settings: Settings = Depends(settings_dependency),
) -> dict:
    product = owned_product(db, product_id, principal)
    result = PricingDecisionEngine(settings).recommend(_record(product), payload, PricingEvidence())
    db.add(
        PriceRecommendation(
            product_id=product_id,
            final_p20=result.final_range.p20,
            final_p50=result.final_range.p50,
            final_p80=result.final_range.p80,
            cost_floor=result.cost_floor,
            currency=result.final_range.currency,
            confidence=result.confidence,
            requires_review=result.requires_review,
            reasons=result.reasons,
        )
    )
    db.commit()
    return result.model_dump()


@router.post("/{product_id}/publish")
def publish(
    product_id: UUID,
    principal: Principal = Depends(require_roles("ARTISAN")),
    db: Session = Depends(get_db),
) -> dict:
    product = owned_product(db, product_id, principal)
    record = _record(product)
    seo = _seo(db, product_id)
    pricing = _pricing(db, product_id)
    risk = ListingRiskGate().assess(record, seo, pricing)
    status = publication_status_from_risk(risk.decision)
    db.add(
        RiskAssessment(
            product_id=product_id,
            decision=risk.decision,
            score=risk.score,
            reasons=risk.reasons,
        )
    )
    product.status = status
    if status != ProductStatus.PUBLISHED:
        db.commit()
        raise PublishBlocked(f"publication blocked by risk gate: {', '.join(risk.reasons)}")

    assert seo is not None and pricing is not None
    inventory = db.scalar(select(Inventory).where(Inventory.product_id == product_id))
    document = CatalogService().assemble_entry(
        record,
        seo,
        pricing,
        inventory.stock_on_hand if inventory else 0,
        ProductStatus.PUBLISHED,
    )
    catalog = db.scalar(select(CatalogEntry).where(CatalogEntry.product_id == product_id))
    if catalog is None:
        catalog = CatalogEntry(product_id=product_id)
        db.add(catalog)
    catalog.status = document.status
    catalog.title = document.title
    catalog.category = document.category
    catalog.dominant_material = document.dominant_material
    catalog.region = document.region
    catalog.price = document.price
    catalog.available = document.available
    catalog.search_vector_text = document.search_text
    db.commit()
    return {"product_id": product_id, "status": product.status}


@router.post("/{product_id}/risk/recheck")
def risk_recheck(
    product_id: UUID,
    complaint_count: int = 0,
    principal: Principal = Depends(require_roles("AMBASSADOR")),
    db: Session = Depends(get_db),
) -> dict:
    product = owned_product(db, product_id, principal)
    risk = ListingRiskGate().assess(
        _record(product),
        _seo(db, product_id),
        _pricing(db, product_id),
        complaint_count=complaint_count,
    )
    db.add(
        RiskAssessment(
            product_id=product_id,
            decision=risk.decision,
            score=risk.score,
            reasons=risk.reasons,
        )
    )
    status = publication_status_from_risk(risk.decision)
    if status == ProductStatus.SUSPENDED:
        product.status = status
        catalog = db.scalar(select(CatalogEntry).where(CatalogEntry.product_id == product_id))
        if catalog:
            catalog.status = status
            catalog.available = False
    db.commit()
    return {"decision": risk.decision, "score": risk.score, "reasons": risk.reasons}


@router.post("/{product_id}/suspend")
def suspend_product(
    product_id: UUID,
    principal: Principal = Depends(require_roles("AMBASSADOR")),
    db: Session = Depends(get_db),
) -> dict:
    product = owned_product(db, product_id, principal)
    product.status = ProductStatus.SUSPENDED
    catalog = db.scalar(select(CatalogEntry).where(CatalogEntry.product_id == product_id))
    if catalog:
        catalog.status = ProductStatus.SUSPENDED
        catalog.available = False
    db.commit()
    return {"product_id": product_id, "status": product.status}
