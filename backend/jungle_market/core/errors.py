class DomainError(Exception):
    status_code = 400
    code = "domain_error"

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class ImageValidationError(DomainError):
    code = "image_validation_error"


class ForegroundExtractionError(DomainError):
    code = "foreground_extraction_error"


class LowConfidencePrediction(DomainError):
    code = "low_confidence_prediction"


class MeasurementUnavailable(DomainError):
    code = "measurement_unavailable"


class TranscriptLowConfidence(DomainError):
    code = "transcript_low_confidence"


class PricingEvidenceInsufficient(DomainError):
    code = "pricing_evidence_insufficient"


class RiskReviewRequired(DomainError):
    code = "risk_review_required"


class ConsentRequired(DomainError):
    code = "consent_required"


class ModelArtifactUnavailable(DomainError):
    code = "model_artifact_unavailable"


class PublishBlocked(DomainError):
    code = "publish_blocked"


class NotFound(DomainError):
    status_code = 404
    code = "not_found"
