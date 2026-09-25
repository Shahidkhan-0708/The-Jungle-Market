import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from jungle_market.domain.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class CommerceOutcome(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "commerce_outcomes"

    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"))
    order_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("orders.id"))
    final_sold_price: Mapped[float | None] = mapped_column(Float)
    sale_timestamp: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    time_to_sale_hours: Mapped[int | None] = mapped_column(Integer)
    returned_or_refunded: Mapped[bool] = mapped_column(Boolean, default=False)
    fulfillment_success: Mapped[bool | None] = mapped_column(Boolean)
    cancellation_reason: Mapped[str | None] = mapped_column(String(255))
    stockout: Mapped[bool] = mapped_column(Boolean, default=False)
    payout_status: Mapped[str | None] = mapped_column(String(64))
