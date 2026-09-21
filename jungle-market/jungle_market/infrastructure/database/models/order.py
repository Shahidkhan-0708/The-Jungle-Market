from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Float, Integer, ForeignKey, Enum as SQLEnum
from typing import Optional
from uuid import UUID, uuid4
import enum

from jungle_market.infrastructure.database.models.base import Base, TimestampMixin

class OrderStatus(str, enum.Enum):
    PENDING = "PENDING"
    PAID = "PAID"
    SHIPPED = "SHIPPED"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"

class Order(Base, TimestampMixin):
    __tablename__ = "orders"
    
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    buyer_id: Mapped[Optional[str]] = mapped_column(String(255), index=True, nullable=True) # Could be anon user
    total_amount: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[OrderStatus] = mapped_column(SQLEnum(OrderStatus), default=OrderStatus.PENDING, index=True)
    shipping_address: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    payment_reference: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    checkout_key: Mapped[Optional[str]] = mapped_column(String(120), unique=True, nullable=True)
    cancellation_reason: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

class OrderItem(Base, TimestampMixin):
    __tablename__ = "order_items"
    
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    order_id: Mapped[UUID] = mapped_column(ForeignKey("orders.id"), index=True)
    product_id: Mapped[UUID] = mapped_column(ForeignKey("products.id"), index=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    price_at_time: Mapped[float] = mapped_column(Float, nullable=False)
