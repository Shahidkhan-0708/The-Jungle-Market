from datetime import datetime

from sqlalchemy import DateTime, Float, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from jungle_market.domain.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class MarketObservation(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "market_observations"

    category: Mapped[str] = mapped_column(String(128), index=True)
    material: Mapped[str | None] = mapped_column(String(128), index=True)
    source: Mapped[str] = mapped_column(String(128))
    observed_price: Mapped[float] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    similarity_score: Mapped[float] = mapped_column(Float)
    raw_payload: Mapped[dict | None] = mapped_column(JSON)


class MarketSnapshot(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "market_snapshots"

    category: Mapped[str] = mapped_column(String(128), index=True)
    material: Mapped[str | None] = mapped_column(String(128), index=True)
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    p20: Mapped[float] = mapped_column(Float)
    p50: Mapped[float] = mapped_column(Float)
    p80: Mapped[float] = mapped_column(Float)
    observation_count: Mapped[int]
    source_summary: Mapped[dict] = mapped_column(JSON)
