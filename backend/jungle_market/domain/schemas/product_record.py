from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

from jungle_market.domain.enums import EvidenceSource, VerificationState
from jungle_market.domain.schemas.common import TextEvidenceField, utc_now


class CategoryEvidence(BaseModel):
    value: str
    confidence: float = Field(ge=0, le=1)
    source: EvidenceSource
    model_version: str | None = None
    timestamp: datetime = Field(default_factory=utc_now)
    verification_state: VerificationState = VerificationState.UNVERIFIED


class MaterialEvidence(BaseModel):
    value: str
    confidence: float = Field(ge=0, le=1)
    source: EvidenceSource
    model_version: str | None = None
    timestamp: datetime = Field(default_factory=utc_now)
    verification_state: VerificationState = VerificationState.UNVERIFIED


class DimensionEvidence(BaseModel):
    width_mm: float | None = Field(default=None, gt=0)
    height_mm: float | None = Field(default=None, gt=0)
    depth_mm: float | None = Field(default=None, gt=0)
    source: EvidenceSource
    confidence: float | None = Field(default=None, ge=0, le=1)
    verified: bool = False
    model_version: str | None = None
    timestamp: datetime = Field(default_factory=utc_now)
    verification_state: VerificationState = VerificationState.UNVERIFIED

    @model_validator(mode="after")
    def verified_source_must_match(self) -> "DimensionEvidence":
        if self.verified and self.source not in {
            EvidenceSource.MEASURED_VERIFIED,
            EvidenceSource.AMBASSADOR_VERIFIED,
        }:
            raise ValueError("verified dimensions require measured or ambassador verified source")
        if not any([self.width_mm, self.height_mm, self.depth_mm]):
            raise ValueError("at least one dimension must be present")
        return self


class ProductConflict(BaseModel):
    field_name: str
    values: list[str]
    sources: list[EvidenceSource]
    reason: str


class ProductRecord(BaseModel):
    product_id: UUID
    category: CategoryEvidence | None = None
    materials: list[MaterialEvidence] = Field(default_factory=list)
    dominant_material: str | None = None
    confidence_by_material: dict[str, float] = Field(default_factory=dict)
    colours: list[str] = Field(default_factory=list)
    dimensions: DimensionEvidence | None = None
    artisan_story: TextEvidenceField | None = None
    process: TextEvidenceField | None = None
    stated_location: TextEvidenceField | None = None
    labour_time_hours: TextEvidenceField | None = None
    conflicts: list[ProductConflict] = Field(default_factory=list)
    requires_review: bool = False
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)

    @field_validator("materials")
    @classmethod
    def material_values_unique(cls, values: list[MaterialEvidence]) -> list[MaterialEvidence]:
        seen: set[str] = set()
        for material in values:
            if material.value in seen:
                raise ValueError(f"duplicate material value: {material.value}")
            seen.add(material.value)
        return values

    @model_validator(mode="after")
    def dominant_material_must_be_supported(self) -> "ProductRecord":
        if self.dominant_material and self.dominant_material not in {
            m.value for m in self.materials
        }:
            raise ValueError("dominant material must be present in materials")
        if self.conflicts:
            self.requires_review = True
        return self
