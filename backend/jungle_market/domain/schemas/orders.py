from uuid import UUID

from pydantic import BaseModel, Field


class OrderItemCreate(BaseModel):
    product_id: UUID
    quantity: int = Field(gt=0)
    unit_price: float = Field(ge=0)


class OrderCreate(BaseModel):
    buyer_id: UUID
    items: list[OrderItemCreate] = Field(min_length=1)
    currency: str = "INR"


class OrderResult(BaseModel):
    order_id: UUID
    status: str
    total_amount: float
    currency: str
