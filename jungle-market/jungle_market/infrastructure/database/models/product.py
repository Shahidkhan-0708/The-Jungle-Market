from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Float, Enum as SQLEnum, JSON, ForeignKey, Boolean, Integer
from typing import Optional
from uuid import UUID, uuid4

from jungle_market.infrastructure.database.models.base import Base, TimestampMixin
from jungle_market.domain.enums.product import ProductStatus

class Product(Base, TimestampMixin):
    __tablename__ = "products"
    
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    artisan_id: Mapped[UUID] = mapped_column(ForeignKey("artisan_profiles.id"), index=True)
    status: Mapped[ProductStatus] = mapped_column(SQLEnum(ProductStatus), default=ProductStatus.DRAFT, index=True)
    
    # Store the strict Pydantic ProductRecord schema as JSON
    record_data: Mapped[dict] = mapped_column(JSON, nullable=True)
    
    # Derived Search/Display Fields
    title: Mapped[Optional[str]] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(String)
    
    # Pricing fields from CatBoost / Market Intelligence / Rules
    recommended_price_min: Mapped[Optional[float]] = mapped_column(Float)
    recommended_price_max: Mapped[Optional[float]] = mapped_column(Float)
    final_price: Mapped[Optional[float]] = mapped_column(Float)
    
    # Track conflicts and human review requirements
    needs_ambassador_review: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Inventory Sync
    stock_quantity: Mapped[int] = mapped_column(Integer, default=1)

class ProductMedia(Base, TimestampMixin):
    __tablename__ = "product_media"
    
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    product_id: Mapped[UUID] = mapped_column(ForeignKey("products.id"), index=True)
    media_type: Mapped[str] = mapped_column(String(50)) # 'image', 'audio', 'mask'
    storage_path: Mapped[str] = mapped_column(String(500))
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)
