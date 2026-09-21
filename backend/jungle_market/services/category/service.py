import numpy as np

from jungle_market.core.errors import LowConfidencePrediction
from jungle_market.domain.enums import EvidenceSource, VerificationState
from jungle_market.domain.schemas.product_record import CategoryEvidence
from jungle_market.ml.adapters.base import CategoryClassifier


class CategoryRecognitionService:
    def __init__(self, classifier: CategoryClassifier, min_confidence: float = 0.7) -> None:
        self.classifier = classifier
        self.min_confidence = min_confidence

    def classify(self, product_crop: np.ndarray) -> CategoryEvidence:
        result = self.classifier.predict(product_crop)
        if not result.top_k:
            raise LowConfidencePrediction("category classifier returned no labels")
        label, confidence = result.top_k[0]
        evidence = CategoryEvidence(
            value=label,
            confidence=confidence,
            source=EvidenceSource.VISION,
            model_version=result.model_version,
            verification_state=(
                VerificationState.UNVERIFIED
                if confidence >= self.min_confidence
                else VerificationState.NEEDS_REVIEW
            ),
        )
        if confidence < self.min_confidence:
            raise LowConfidencePrediction("category prediction below confidence threshold")
        return evidence
