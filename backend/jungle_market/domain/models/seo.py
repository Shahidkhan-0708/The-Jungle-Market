import uuid

from sqlalchemy import Boolean, ForeignKey, JSON, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from jungle_market.domain.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class SEOContent(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "seo_content"

    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"))
    title: Mapped[str] = mapped_column(String(90), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    tags: Mapped[list[str]] = mapped_column(JSON, default=list)
    keywords: Mapped[list[str]] = mapped_column(JSON, default=list)
    passed_forbidden_claim_check: Mapped[bool] = mapped_column(Boolean, default=False)
