import numpy as np

from jungle_market.domain.enums import EvidenceSource, VerificationState
from jungle_market.domain.schemas.product_record import MaterialEvidence
from jungle_market.ml.adapters.base import MaterialClassifier


class MaterialRecognitionService:
    def __init__(self, classifier: MaterialClassifier, min_confidence: float = 0.55) -> None:
        self.classifier = classifier
        self.min_confidence = min_confidence

    def classify(
        self, product_crop: np.ndarray
    ) -> tuple[list[MaterialEvidence], str | None, dict[str, float], bool]:
        result = self.classifier.predict(product_crop)
        materials = [
            MaterialEvidence(
                value=material,
                confidence=result.confidence_by_material.get(material, 0.0),
                source=EvidenceSource.VISION,
                model_version=result.model_version,
                verification_state=VerificationState.UNVERIFIED,
            )
            for material in result.materials
            if result.confidence_by_material.get(material, 0.0) >= self.min_confidence
        ]
        needs_review = not materials
        return (
            materials,
            result.dominant_material if materials else None,
            result.confidence_by_material,
            needs_review,
        )
