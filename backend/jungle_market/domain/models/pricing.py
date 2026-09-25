import uuid

from sqlalchemy import Boolean, Float, ForeignKey, JSON, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from jungle_market.domain.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class PricePrediction(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "price_predictions"

    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"))
    model_name: Mapped[str] = mapped_column(String(128))
    model_version: Mapped[str] = mapped_column(String(128))
    p20: Mapped[float] = mapped_column(Float)
    p50: Mapped[float] = mapped_column(Float)
    p80: Mapped[float] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    feature_payload: Mapped[dict] = mapped_column(JSON)


class PriceRecommendation(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "price_recommendations"

    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"))
    final_p20: Mapped[float] = mapped_column(Float)
    final_p50: Mapped[float] = mapped_column(Float)
    final_p80: Mapped[float] = mapped_column(Float)
    cost_floor: Mapped[float] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    confidence: Mapped[float] = mapped_column(Float)
    requires_review: Mapped[bool] = mapped_column(Boolean, default=False)
    reasons: Mapped[list[str]] = mapped_column(JSON, default=list)
