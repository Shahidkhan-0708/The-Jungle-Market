from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from datetime import datetime

class BecknContext(BaseModel):
    domain: str = "nic2004:52110"  # Retail
    country: str = "IND"
    city: str = "std:080"
    action: str
    core_version: str = "1.2.0"
    bap_id: str
    bap_uri: str
    bpp_id: Optional[str] = None
    bpp_uri: Optional[str] = None
    transaction_id: str
    message_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    ttl: str = "PT30S"

class BecknAck(BaseModel):
    status: str = "ACK"

class BecknResponse(BaseModel):
    message: dict = {"ack": BecknAck()}
    error: Optional[dict] = None

# ---------------------------------------------------------
# Core Beckn Entities
# ---------------------------------------------------------
class Descriptor(BaseModel):
    name: str
    short_desc: Optional[str] = None
    long_desc: Optional[str] = None
    images: Optional[List[str]] = None

class Price(BaseModel):
    currency: str = "INR"
    value: str
    estimated_value: Optional[str] = None
    computed_value: Optional[str] = None
    listed_value: Optional[str] = None
    offered_value: Optional[str] = None
    minimum_value: Optional[str] = None
    maximum_value: Optional[str] = None

class Measure(BaseModel):
    type: Optional[str] = None
    value: float
    estimated_value: Optional[float] = None
    computed_value: Optional[float] = None
    range: Optional[Dict[str, float]] = None
    unit: str

class Quantity(BaseModel):
    count: Optional[int] = None
    measure: Optional[Measure] = None

class ItemQuantity(BaseModel):
    allocated: Optional[Quantity] = None
    available: Optional[Quantity] = None
    maximum: Optional[Quantity] = None
    minimum: Optional[Quantity] = None

class Item(BaseModel):
    id: str
    parent_item_id: Optional[str] = None
    descriptor: Optional[Descriptor] = None
    price: Optional[Price] = None
    category_id: Optional[str] = None
    fulfillment_id: Optional[str] = None
    rating: Optional[int] = None
    location_id: Optional[str] = None
    time: Optional[Dict[str, Any]] = None
    matched: Optional[bool] = None
    related: Optional[bool] = None
    recommended: Optional[bool] = None
    tags: Optional[Dict[str, str]] = None
    quantity: Optional[ItemQuantity] = None

class Fulfillment(BaseModel):
    id: str
    type: str  # e.g., "Delivery", "Pickup"
    provider_id: Optional[str] = None
    state: Optional[Dict[str, Any]] = None
    tracking: bool = False
    customer: Optional[Dict[str, Any]] = None
    contact: Optional[Dict[str, Any]] = None
    agent: Optional[Dict[str, Any]] = None
    vehicle: Optional[Dict[str, Any]] = None

class Provider(BaseModel):
    id: str
    descriptor: Optional[Descriptor] = None
    categories: Optional[List[Dict[str, Any]]] = None
    items: Optional[List[Item]] = None
    fulfillments: Optional[List[Fulfillment]] = None
    locations: Optional[List[Dict[str, Any]]] = None
    offers: Optional[List[Dict[str, Any]]] = None
    tags: Optional[Dict[str, str]] = None

class Billing(BaseModel):
    name: str
    organization: Optional[str] = None
    address: Optional[Dict[str, Any]] = None
    email: Optional[str] = None
    phone: str
    tax_number: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class Quote(BaseModel):
    price: Price
    breakdown: List[Dict[str, Any]]
    ttl: str = "PT15M"

class Order(BaseModel):
    id: str
    state: str
    provider: Optional[Dict[str, Any]] = None
    items: List[Item]
    fulfillments: Optional[List[Fulfillment]] = None
    billing: Optional[Billing] = None
    quote: Optional[Quote] = None
    payment: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# ---------------------------------------------------------
# Request Models
# ---------------------------------------------------------
class Intent(BaseModel):
    item: Optional[Dict[str, Any]] = None
    fulfillment: Optional[Dict[str, Any]] = None
    payment: Optional[Dict[str, Any]] = None
    category: Optional[Dict[str, Any]] = None
    provider: Optional[Dict[str, Any]] = None

class SearchMessage(BaseModel):
    intent: Intent

class BecknSearchRequest(BaseModel):
    context: BecknContext
    message: SearchMessage

class SelectMessage(BaseModel):
    order: Dict[str, Any]  # Contains items, provider, etc.

class BecknSelectRequest(BaseModel):
    context: BecknContext
    message: SelectMessage

class InitMessage(BaseModel):
    order: Dict[str, Any]

class BecknInitRequest(BaseModel):
    context: BecknContext
    message: InitMessage

class ConfirmMessage(BaseModel):
    order: Dict[str, Any]

class BecknConfirmRequest(BaseModel):
    context: BecknContext
    message: ConfirmMessage

class StatusMessage(BaseModel):
    order_id: str

class BecknStatusRequest(BaseModel):
    context: BecknContext
    message: StatusMessage

class CancelMessage(BaseModel):
    order_id: str
    cancellation_reason_id: str
    descriptor: Optional[Descriptor] = None

class BecknCancelRequest(BaseModel):
    context: BecknContext
    message: CancelMessage
