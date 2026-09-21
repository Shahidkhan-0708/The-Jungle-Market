from dataclasses import dataclass
from uuid import UUID

from jungle_market.domain.enums import ProductStatus
from jungle_market.domain.schemas.pricing import PriceRecommendationResult
from jungle_market.domain.schemas.product_record import ProductRecord
from jungle_market.domain.schemas.seo import SEOContentDraft


@dataclass
class CatalogDocument:
    product_id: UUID
    status: ProductStatus
    title: str
    category: str | None
    dominant_material: str | None
    region: str | None
    price: float | None
    available: bool
    search_text: str


class CatalogService:
    def assemble_entry(
        self,
        record: ProductRecord,
        seo: SEOContentDraft,
        pricing: PriceRecommendationResult,
        stock_on_hand: int,
        status: ProductStatus,
    ) -> CatalogDocument:
        region = record.stated_location.value if record.stated_location else None
        search_text = " ".join(
            item
            for item in [
                seo.title,
                seo.description,
                record.category.value if record.category else "",
                record.dominant_material or "",
                region or "",
            ]
            if item
        )
        return CatalogDocument(
            product_id=record.product_id,
            status=status,
            title=seo.title,
            category=record.category.value if record.category else None,
            dominant_material=record.dominant_material,
            region=region,
            price=pricing.final_range.p50,
            available=status == ProductStatus.PUBLISHED and stock_on_hand > 0,
            search_text=search_text,
        )
