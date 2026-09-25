import uuid

from sqlalchemy import Boolean, Enum, Float, ForeignKey, Index, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from jungle_market.domain.enums import ProductStatus
from jungle_market.domain.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class CatalogEntry(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "catalog_entries"

    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"), unique=True)
    status: Mapped[ProductStatus] = mapped_column(Enum(ProductStatus), default=ProductStatus.DRAFT)
    title: Mapped[str] = mapped_column(String(140))
    category: Mapped[str | None] = mapped_column(String(128), index=True)
    dominant_material: Mapped[str | None] = mapped_column(String(128), index=True)
    region: Mapped[str | None] = mapped_column(String(128), index=True)
    price: Mapped[float | None] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    available: Mapped[bool] = mapped_column(Boolean, default=False)
    search_vector_text: Mapped[str | None] = mapped_column(String(2000))


class Inventory(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "inventory"

    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"), unique=True)
    stock_on_hand: Mapped[int] = mapped_column(Integer, default=0)
    stock_reserved: Mapped[int] = mapped_column(Integer, default=0)
    allow_backorder: Mapped[bool] = mapped_column(Boolean, default=False)


Index("ix_catalog_search", CatalogEntry.status, CatalogEntry.available, CatalogEntry.category)
