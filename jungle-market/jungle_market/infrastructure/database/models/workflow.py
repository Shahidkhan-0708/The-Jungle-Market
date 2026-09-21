from uuid import UUID, uuid4
from sqlalchemy import String, JSON, Integer, ForeignKey, UniqueConstraint, Numeric
from sqlalchemy.orm import Mapped, mapped_column
from .base import Base, TimestampMixin


class MediaAsset(Base, TimestampMixin):
    __tablename__ = "media_assets"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    owner_id: Mapped[UUID] = mapped_column(index=True)
    path: Mapped[str] = mapped_column(String(500))
    content_type: Mapped[str] = mapped_column(String(100))
    size: Mapped[int] = mapped_column(Integer)
    metadata_record: Mapped[dict] = mapped_column(JSON, default=dict)


class ProductReview(Base, TimestampMixin):
    __tablename__ = "product_reviews"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    product_id: Mapped[UUID] = mapped_column(ForeignKey("products.id"), index=True)
    reviewer_id: Mapped[UUID] = mapped_column(index=True)
    decision: Mapped[str] = mapped_column(String(30))
    evidence: Mapped[dict] = mapped_column(JSON)


class FeatureRecord(Base, TimestampMixin):
    """Small persisted forms share ownership rules; payloads have route schemas."""
    __tablename__ = "feature_records"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    owner_id: Mapped[UUID] = mapped_column(index=True)
    recipient_id: Mapped[UUID | None] = mapped_column(index=True)
    kind: Mapped[str] = mapped_column(String(40), index=True)
    payload: Mapped[dict] = mapped_column(JSON)


class Settlement(Base, TimestampMixin):
    __tablename__ = "settlements"
    __table_args__ = (UniqueConstraint("order_id", "artisan_id"),)
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    order_id: Mapped[UUID] = mapped_column(ForeignKey("orders.id"))
    artisan_id: Mapped[UUID] = mapped_column(ForeignKey("artisan_profiles.id"))
    amount: Mapped[float] = mapped_column(Numeric(12, 2))
    status: Mapped[str] = mapped_column(String(30), default="SIMULATED")
