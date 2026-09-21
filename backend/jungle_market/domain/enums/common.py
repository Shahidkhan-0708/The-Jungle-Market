from enum import StrEnum


class ProductStatus(StrEnum):
    DRAFT = "DRAFT"
    AI_PROCESSING = "AI_PROCESSING"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    VERIFIED = "VERIFIED"
    RISK_REVIEW = "RISK_REVIEW"
    PUBLISHED = "PUBLISHED"
    SUSPENDED = "SUSPENDED"
    SOLD_OUT = "SOLD_OUT"
    ARCHIVED = "ARCHIVED"


class EvidenceSource(StrEnum):
    VISION = "vision"
    VOICE = "voice"
    MEASURED_VERIFIED = "measured_verified"
    SELF_REPORTED = "self_reported"
    AMBASSADOR_VERIFIED = "ambassador_verified"
    SYSTEM = "system"
    MARKET = "market"
    PRICING_MODEL = "pricing_model"


class VerificationState(StrEnum):
    UNVERIFIED = "unverified"
    VERIFIED = "verified"
    REJECTED = "rejected"
    NEEDS_REVIEW = "needs_review"


class ReviewStatus(StrEnum):
    OPEN = "OPEN"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CORRECTED = "CORRECTED"


class RiskDecision(StrEnum):
    CLEAR = "CLEAR"
    REVIEW = "REVIEW"
    SUSPEND = "SUSPEND"


class ConsentType(StrEnum):
    MEDIA = "media"
    VOICE = "voice"
    DATA_PROCESSING = "data_processing"


class DeletionRequestStatus(StrEnum):
    RECEIVED = "RECEIVED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    PARTIAL_LEGAL_HOLD = "PARTIAL_LEGAL_HOLD"


class OrderStatus(StrEnum):
    CREATED = "CREATED"
    PAID = "PAID"
    FULFILLING = "FULFILLING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    REFUNDED = "REFUNDED"


class PaymentStatus(StrEnum):
    PENDING = "PENDING"
    AUTHORIZED = "AUTHORIZED"
    CAPTURED = "CAPTURED"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"


class FulfillmentStatus(StrEnum):
    PENDING = "PENDING"
    PACKED = "PACKED"
    SHIPPED = "SHIPPED"
    DELIVERED = "DELIVERED"
    RETURNED = "RETURNED"


class ModelStatus(StrEnum):
    CANDIDATE = "CANDIDATE"
    SHADOW = "SHADOW"
    CANARY = "CANARY"
    PRODUCTION = "PRODUCTION"
    RETIRED = "RETIRED"


class DeploymentStage(StrEnum):
    CANDIDATE = "CANDIDATE"
    SHADOW = "SHADOW"
    CANARY = "CANARY"
    PRODUCTION = "PRODUCTION"
    ROLLBACK = "ROLLBACK"
