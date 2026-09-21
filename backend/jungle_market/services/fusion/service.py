from dataclasses import dataclass
from uuid import UUID

from jungle_market.domain.enums import EvidenceSource, VerificationState
from jungle_market.domain.schemas.common import TextEvidenceField
from jungle_market.domain.schemas.product_record import (
    CategoryEvidence,
    DimensionEvidence,
    MaterialEvidence,
    ProductConflict,
    ProductRecord,
)


@dataclass(frozen=True)
class VoiceFacts:
    artisan_story: str | None = None
    process: str | None = None
    stated_location: str | None = None
    labour_time_hours: str | None = None
    claimed_category: str | None = None
    claimed_materials: list[str] | None = None
    confidence: float = 0.7
    model_version: str | None = None


class ProductFusionService:
    def fuse(
        self,
        product_id: UUID,
        category: CategoryEvidence | None,
        materials: list[MaterialEvidence],
        dominant_material: str | None,
        confidence_by_material: dict[str, float],
        dimensions: DimensionEvidence | None,
        voice: VoiceFacts | None,
    ) -> ProductRecord:
        conflicts: list[ProductConflict] = []
        if (
            voice
            and voice.claimed_category
            and category
            and voice.claimed_category != category.value
        ):
            conflicts.append(
                ProductConflict(
                    field_name="category",
                    values=[category.value, voice.claimed_category],
                    sources=[EvidenceSource.VISION, EvidenceSource.VOICE],
                    reason="voice category claim conflicts with visual category",
                )
            )
        if voice and voice.claimed_materials:
            visible_materials = {material.value for material in materials}
            unsupported = sorted(set(voice.claimed_materials) - visible_materials)
            if unsupported:
                conflicts.append(
                    ProductConflict(
                        field_name="materials",
                        values=sorted(visible_materials) + unsupported,
                        sources=[EvidenceSource.VISION, EvidenceSource.VOICE],
                        reason=(
                            "voice material claim is not supported by visible material classifier"
                        ),
                    )
                )

        def text(value: str | None) -> TextEvidenceField | None:
            if value is None or not value.strip() or voice is None:
                return None
            return TextEvidenceField(
                value=value.strip(),
                source=EvidenceSource.VOICE,
                confidence=voice.confidence,
                model_version=voice.model_version,
                verification_state=VerificationState.UNVERIFIED,
            )

        requires_review = bool(conflicts)
        if category and category.verification_state == VerificationState.NEEDS_REVIEW:
            requires_review = True
        if dimensions and dimensions.verification_state == VerificationState.NEEDS_REVIEW:
            requires_review = True
        return ProductRecord(
            product_id=product_id,
            category=category,
            materials=materials,
            dominant_material=dominant_material,
            confidence_by_material=confidence_by_material,
            dimensions=dimensions,
            artisan_story=text(voice.artisan_story if voice else None),
            process=text(voice.process if voice else None),
            stated_location=text(voice.stated_location if voice else None),
            labour_time_hours=text(voice.labour_time_hours if voice else None),
            conflicts=conflicts,
            requires_review=requires_review,
        )
