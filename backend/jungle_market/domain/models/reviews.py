import uuid

from sqlalchemy import Enum, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from jungle_market.domain.enums import ReviewStatus
from jungle_market.domain.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class AmbassadorReview(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "ambassador_reviews"

    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"))
    status: Mapped[ReviewStatus] = mapped_column(Enum(ReviewStatus), default=ReviewStatus.OPEN)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    payload: Mapped[dict | None] = mapped_column(JSON)
    assigned_to_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))


class AmbassadorCorrection(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "ambassador_corrections"

    review_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("ambassador_reviews.id"))
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"))
    corrected_by_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    field_name: Mapped[str] = mapped_column(String(128), nullable=False)
    old_value: Mapped[dict | None] = mapped_column(JSON)
    new_value: Mapped[dict] = mapped_column(JSON, nullable=False)
    note: Mapped[str | None] = mapped_column(Text)


class BuyerReview(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "buyer_reviews"

    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"))
    buyer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("buyer_profiles.id"))
    rating: Mapped[int] = mapped_column(Integer)
    comment: Mapped[str | None] = mapped_column(Text)
    complaint_flag: Mapped[bool] = mapped_column(default=False)
    abuse_score: Mapped[float | None] = mapped_column(Float)
