import uuid

from sqlalchemy import Enum, Float, ForeignKey, JSON, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from jungle_market.domain.enums import RiskDecision
from jungle_market.domain.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class RiskEvent(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "risk_events"

    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"))
    event_type: Mapped[str] = mapped_column(String(128))
    severity: Mapped[float] = mapped_column(Float)
    payload: Mapped[dict | None] = mapped_column(JSON)


class RiskAssessment(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "risk_assessments"

    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"))
    decision: Mapped[RiskDecision] = mapped_column(Enum(RiskDecision), nullable=False)
    score: Mapped[float] = mapped_column(Float)
    reasons: Mapped[list[str]] = mapped_column(JSON, default=list)
    assessed_by: Mapped[str] = mapped_column(String(128), default="rule_engine")
    notes: Mapped[str | None] = mapped_column(Text)
