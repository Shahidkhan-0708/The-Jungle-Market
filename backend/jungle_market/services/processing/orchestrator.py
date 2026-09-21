from dataclasses import dataclass
from uuid import UUID

import numpy as np

from jungle_market.domain.schemas.product_record import ProductRecord
from jungle_market.ml.adapters.base import CategoryClassifier, MaterialClassifier, ProductDetector
from jungle_market.services.category.service import CategoryRecognitionService
from jungle_market.services.detection.service import ProductLocalizationService
from jungle_market.services.fusion.service import ProductFusionService, VoiceFacts
from jungle_market.services.material.service import MaterialRecognitionService


@dataclass(frozen=True)
class ProcessingResult:
    record: ProductRecord
    review_reasons: list[str]


class ProductProcessingOrchestrator:
    def __init__(
        self,
        detector: ProductDetector,
        category_classifier: CategoryClassifier,
        material_classifier: MaterialClassifier,
    ) -> None:
        self.localization = ProductLocalizationService(detector)
        self.category = CategoryRecognitionService(category_classifier)
        self.material = MaterialRecognitionService(material_classifier)
        self.fusion = ProductFusionService()

    def process_visuals(
        self, product_id: UUID, rgb_array: np.ndarray, voice: VoiceFacts | None = None
    ) -> ProcessingResult:
        review_reasons: list[str] = []
        _, crop = self.localization.locate_and_crop(rgb_array)
        category = None
        try:
            category = self.category.classify(crop)
        except Exception as exc:
            review_reasons.append(str(exc))
        materials, dominant, confidence_by_material, needs_material_review = self.material.classify(
            crop
        )
        if needs_material_review:
            review_reasons.append("material prediction below confidence threshold")
        record = self.fusion.fuse(
            product_id=product_id,
            category=category,
            materials=materials,
            dominant_material=dominant,
            confidence_by_material=confidence_by_material,
            dimensions=None,
            voice=voice,
        )
        if review_reasons:
            record.requires_review = True
        return ProcessingResult(record=record, review_reasons=review_reasons)
