import uuid

from sqlalchemy import Boolean, Enum, Float, ForeignKey, Index, Integer, JSON, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from jungle_market.domain.enums import ProductStatus, VerificationState
from jungle_market.domain.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Product(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "products"

    artisan_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("artisan_profiles.id")
    )
    status: Mapped[ProductStatus] = mapped_column(Enum(ProductStatus), default=ProductStatus.DRAFT)
    title: Mapped[str | None] = mapped_column(String(140))
    product_record: Mapped[dict | None] = mapped_column(JSON)
    review_required_reason: Mapped[str | None] = mapped_column(Text)


class ProductMedia(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "product_media"

    product_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"))
    uploader_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    media_type: Mapped[str] = mapped_column(String(32))
    storage_uri: Mapped[str] = mapped_column(String(1000))
    checksum_sha256: Mapped[str | None] = mapped_column(String(64), index=True)
    consent_record_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("consent_records.id")
    )
    byte_size: Mapped[int | None] = mapped_column(Integer)
    width_px: Mapped[int | None] = mapped_column(Integer)
    height_px: Mapped[int | None] = mapped_column(Integer)
    deleted_or_anonymized: Mapped[bool] = mapped_column(Boolean, default=False)


class ProductPrediction(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "product_predictions"

    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"))
    prediction_type: Mapped[str] = mapped_column(String(64), nullable=False)
    value: Mapped[dict] = mapped_column(JSON, nullable=False)
    confidence: Mapped[float | None] = mapped_column(Float)
    model_name: Mapped[str | None] = mapped_column(String(128))
    model_version: Mapped[str | None] = mapped_column(String(128))
    verification_state: Mapped[VerificationState] = mapped_column(
        Enum(VerificationState), default=VerificationState.UNVERIFIED
    )


class ProductFieldEvidence(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "product_field_evidence"

    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"))
    field_name: Mapped[str] = mapped_column(String(128), nullable=False)
    value: Mapped[dict] = mapped_column(JSON, nullable=False)
    source: Mapped[str] = mapped_column(String(64), nullable=False)
    confidence: Mapped[float | None] = mapped_column(Float)
    model_version: Mapped[str | None] = mapped_column(String(128))
    verification_state: Mapped[VerificationState] = mapped_column(
        Enum(VerificationState), default=VerificationState.UNVERIFIED
    )


class ProductDimension(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "product_dimensions"

    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"))
    width_mm: Mapped[float | None] = mapped_column(Float)
    height_mm: Mapped[float | None] = mapped_column(Float)
    depth_mm: Mapped[float | None] = mapped_column(Float)
    source: Mapped[str] = mapped_column(String(64), nullable=False)
    confidence: Mapped[float | None] = mapped_column(Float)
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    plausibility_result: Mapped[dict | None] = mapped_column(JSON)


class ProductAppraisal(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "product_appraisals"

    category: Mapped[str | None] = mapped_column(String(128))
    material: Mapped[str | None] = mapped_column(String(128))
    price_p50: Mapped[float | None] = mapped_column(Float)
    seo_copy: Mapped[str | None] = mapped_column(Text)


class ProcessingJob(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "processing_jobs"

    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"))
    task_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="QUEUED", nullable=False)
    result: Mapped[dict | None] = mapped_column(JSON)
    error: Mapped[str | None] = mapped_column(Text)


Index("ix_products_status_created_at", Product.status, Product.created_at)
