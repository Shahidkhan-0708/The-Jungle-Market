from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from uuid import UUID

from jungle_market.domain.enums.product import FactSource, VerificationState

class EvidenceBase(BaseModel):
    source: FactSource
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    model_version: Optional[str] = None
    verification_state: VerificationState = VerificationState.PENDING
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class CategoryEvidence(EvidenceBase):
    value: str

class MaterialEvidence(EvidenceBase):
    value: str

class DimensionEvidence(EvidenceBase):
    width_mm: float
    height_mm: float
    depth_mm: Optional[float] = None
    unit: str = "mm"

class StringEvidence(EvidenceBase):
    value: str

class ProductRecord(BaseModel):
    product_id: UUID
    artisan_id: UUID
    
    category: Optional[CategoryEvidence] = None
    materials: List[MaterialEvidence] = Field(default_factory=list)
    dominant_material: Optional[str] = None
    
    dimensions: Optional[DimensionEvidence] = None
    
    artisan_story: Optional[StringEvidence] = None
    process: Optional[StringEvidence] = None
    
    # Track conflicts for Ambassador review
    has_conflicts: bool = False
    
    class Config:
        json_schema_extra = {
            "example": {
                "product_id": "123e4567-e89b-12d3-a456-426614174000",
                "artisan_id": "123e4567-e89b-12d3-a456-426614174001",
                "category": {
                    "value": "basket",
                    "confidence": 0.94,
                    "source": "vision",
                    "model_version": "mobilenet_v3_large_v1",
                    "verification_state": "PENDING"
                },
                "materials": [
                    {
                        "value": "bamboo",
                        "confidence": 0.92,
                        "source": "vision",
                        "verification_state": "PENDING"
                    }
                ],
                "dimensions": {
                    "width_mm": 320.0,
                    "height_mm": 210.0,
                    "source": "measured_verified",
                    "confidence": 0.96,
                    "verification_state": "VERIFIED_AI"
                },
                "artisan_story": {
                    "value": "I made this with local bamboo...",
                    "source": "voice"
                }
            }
        }
