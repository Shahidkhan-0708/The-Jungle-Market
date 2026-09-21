import hashlib
import hmac
import secrets
from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from apps.api.routes.auth import current_user, UserResponse
from jungle_market.core.config import settings
from jungle_market.infrastructure.database.session import get_db
from jungle_market.infrastructure.database.models.order import Order, OrderItem, OrderStatus
from jungle_market.infrastructure.database.models.product import Product
from jungle_market.infrastructure.database.models.user import ArtisanProfile
from jungle_market.infrastructure.database.models.workflow import Settlement
from jungle_market.domain.enums.product import ProductStatus

router = APIRouter(prefix="/v1/orders", tags=["orders"])


class OrderItemRequest(BaseModel):
    product_id: UUID
    qty: int = Field(gt=0, le=20)


class OrderRequest(BaseModel):
    items: list[OrderItemRequest] = Field(min_length=1, max_length=20)
    shipping_address: str = Field(min_length=10, max_length=1000)
    network: Literal["ondc"] = "ondc"
    request_id: UUID


class PaymentVerification(BaseModel):
    gateway_order_id: str = Field(min_length=1, max_length=255)
    payment_id: str = Field(pattern=r"^pay_mock_[a-f0-9]{20}$")
    signature: str = Field(min_length=64, max_length=64)


class MockPaymentRequest(BaseModel):
    method: Literal["upi", "card", "netbanking"]
    simulate_failure: bool = False


class CancelOrderRequest(BaseModel):
    reason: str = Field(default="Buyer changed their mind", min_length=3, max_length=200)


def sign(value):
    if settings.SECRET_KEY == "your-super-secret-key-change-in-production" or len(settings.SECRET_KEY) < 32:
        raise HTTPException(503, "Configure a random SECRET_KEY of at least 32 characters.")
    return hmac.new(settings.SECRET_KEY.encode(), value.encode(), hashlib.sha256).hexdigest()


def verify_payment_signature(order_id, payment_id, signature):
    return hmac.compare_digest(sign(f"{order_id}|{payment_id}"), signature)


def _amount_subunits(amount):
    return int((Decimal(str(amount)) * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def maker_amount(amount, quantity=1):
    return float((max(Decimal("0"), Decimal(str(amount)) - Decimal("113")) * quantity).quantize(Decimal(".01")))


def _fulfillment_stage(order):
    if order.status != OrderStatus.PAID:
        return {OrderStatus.PENDING: "AWAITING_PAYMENT"}.get(order.status, order.status.value)
    return next((part[6:] for part in (order.payment_reference or "").split("|") if part.startswith("stage=")), "CONFIRMED")


def _ondc_snapshot(order):
    stage = _fulfillment_stage(order)
    paid = "|pay_mock_" in (order.payment_reference or "")
    actions = ["search", "select", "init"] + (["confirm"] if paid else [])
    if stage in {"PROCESSING", "READY_TO_SHIP", "SHIPPED", "DELIVERED"}:
        actions.append("status")
    if order.status == OrderStatus.CANCELLED:
        actions.append("cancel")
    transaction_id = f"txn_{order.id.hex}"
    return {"order_id": str(order.id), "network_order_id": f"ondc_{order.id.hex[:16]}",
            "transaction_id": transaction_id, "network": "ONDC_LOCAL_SANDBOX", "beckn_version": "1.2.0",
            "beckn_actions": actions, "status": order.status.value, "fulfillment_stage": stage,
            "payment_status": "REFUNDED_SIMULATED" if paid and order.status == OrderStatus.CANCELLED else "PAID" if paid else "NOT-PAID",
            "signature": sign(f"{transaction_id}|{order.id}|{stage}"), "total_amount": order.total_amount,
            "cancellation_reason": order.cancellation_reason}


async def is_seller(order, user, db):
    return bool((await db.execute(select(OrderItem.id).join(Product).join(ArtisanProfile).where(
        OrderItem.order_id == order.id, ArtisanProfile.user_id == user.id))).first())


async def accessible_order(order_id, user, db, seller_only=False):
    order = (await db.execute(select(Order).where(Order.id == order_id).with_for_update())).scalar_one_or_none()
    if not order or not ((not seller_only and order.buyer_id == str(user.id)) or await is_seller(order, user, db)):
        raise HTTPException(404, "Order not found.")
    return order


def checkout_result(order):
    return {"order_id": str(order.id), "gateway_order_id": order.payment_reference.split("|")[0],
            "amount": _amount_subunits(order.total_amount), "currency": "INR", "provider": "mock",
            "ondc": _ondc_snapshot(order)}


@router.post("/checkout")
async def checkout(payload: OrderRequest, user: UserResponse = Depends(current_user), db: AsyncSession = Depends(get_db)):
    sign("configuration-check")
    if len(payload.shipping_address.strip()) < 10:
        raise HTTPException(422, "Enter a complete shipping address.")
    key = f"{user.id}:{payload.request_id}"
    existing = (await db.execute(select(Order).where(Order.checkout_key == key))).scalar_one_or_none()
    if existing:
        return checkout_result(existing)
    seen, makers, items = set(), set(), []
    total = Decimal(0)
    for item in payload.items:
        if item.product_id in seen:
            raise HTTPException(422, "Use one cart line per product.")
        seen.add(item.product_id)
        product = await db.get(Product, item.product_id)
        if not product or product.status != ProductStatus.PUBLISHED or product.stock_quantity < item.qty:
            raise HTTPException(409, "A craft is unavailable or has insufficient stock.")
        maker = await db.get(ArtisanProfile, product.artisan_id)
        if maker.user_id == user.id:
            raise HTTPException(409, "You cannot buy your own craft.")
        makers.add(product.artisan_id)
        price = Decimal(str(product.final_price or 0)).quantize(Decimal(".01"))
        if price <= 113:
            raise HTTPException(409, "The craft price needs correction.")
        total += price * item.qty
        items.append(OrderItem(product_id=product.id, quantity=item.qty, price_at_time=float(price)))
    if len(makers) != 1:
        raise HTTPException(422, "Place a separate order for each maker.")
    order = Order(buyer_id=str(user.id), total_amount=float(total), status=OrderStatus.PENDING,
                  shipping_address=payload.shipping_address.strip(), checkout_key=key,
                  payment_reference=f"order_mock_{secrets.token_hex(10)}")
    db.add(order)
    try:
        await db.flush()
        for item in items:
            item.order_id = order.id
            db.add(item)
        await db.commit()
    except IntegrityError:
        await db.rollback()
        existing = (await db.execute(select(Order).where(Order.checkout_key == key))).scalar_one_or_none()
        if not existing:
            raise
        return checkout_result(existing)
    return checkout_result(order)


@router.get("/{order_id}/payment")
async def resume_payment(order_id: UUID, user: UserResponse = Depends(current_user), db: AsyncSession = Depends(get_db)):
    order = await accessible_order(order_id, user, db)
    if order.buyer_id != str(user.id):
        raise HTTPException(403, "Only the buyer can pay.")
    if order.status != OrderStatus.PENDING:
        raise HTTPException(409, "Order is no longer awaiting payment.")
    return checkout_result(order)


@router.post("/{order_id}/payment/mock")
async def mock_payment(order_id: UUID, payload: MockPaymentRequest, user: UserResponse = Depends(current_user), db: AsyncSession = Depends(get_db)):
    order = await accessible_order(order_id, user, db)
    if order.buyer_id != str(user.id):
        raise HTTPException(403, "Only the buyer can pay.")
    if order.status != OrderStatus.PENDING:
        raise HTTPException(409, "Order is no longer awaiting payment.")
    if payload.simulate_failure:
        raise HTTPException(402, "Mock payment declined. No money was charged.")
    gateway_id = order.payment_reference.split("|")[0]
    payment_id = f"pay_mock_{secrets.token_hex(10)}"
    return {"gateway_order_id": gateway_id, "payment_id": payment_id,
            "signature": sign(f"{gateway_id}|{payment_id}"), "method": payload.method}


@router.post("/{order_id}/payment/verify")
async def verify_payment(order_id: UUID, payload: PaymentVerification, user: UserResponse = Depends(current_user), db: AsyncSession = Depends(get_db)):
    order = await accessible_order(order_id, user, db)
    if order.buyer_id != str(user.id):
        raise HTTPException(403, "Only the buyer can verify payment.")
    parts = order.payment_reference.split("|")
    if payload.gateway_order_id != parts[0] or not verify_payment_signature(parts[0], payload.payment_id, payload.signature):
        raise HTTPException(400, "Invalid payment signature.")
    if order.status in {OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED} and len(parts) > 1 and parts[1] == payload.payment_id:
        return {"status": order.status.value, "payment_id": payload.payment_id, "ondc": _ondc_snapshot(order)}
    if order.status != OrderStatus.PENDING:
        raise HTTPException(409, "This order cannot receive another payment.")
    items = (await db.execute(select(OrderItem).where(OrderItem.order_id == order.id).order_by(OrderItem.product_id))).scalars().all()
    for item in items:
        product = (await db.execute(select(Product).where(Product.id == item.product_id).with_for_update())).scalar_one()
        if product.status != ProductStatus.PUBLISHED or product.stock_quantity < item.quantity:
            raise HTTPException(409, "Craft sold out before payment completed. No real money was charged.")
        product.stock_quantity -= item.quantity
    order.status = OrderStatus.PAID
    order.payment_reference = f"{parts[0]}|{payload.payment_id}|stage=CONFIRMED"
    await db.commit()
    return {"status": "PAID", "payment_id": payload.payment_id, "ondc": _ondc_snapshot(order)}


@router.post("/{order_id}/fulfill")
async def fulfill_order(order_id: UUID, status: Literal["PROCESSING", "READY_TO_SHIP", "SHIPPED", "DELIVERED"],
                        user: UserResponse = Depends(current_user), db: AsyncSession = Depends(get_db)):
    order = await accessible_order(order_id, user, db, seller_only=True)
    transitions = {"CONFIRMED": "PROCESSING", "PROCESSING": "READY_TO_SHIP", "READY_TO_SHIP": "SHIPPED", "SHIPPED": "DELIVERED"}
    if transitions.get(_fulfillment_stage(order)) != status:
        raise HTTPException(409, "Fulfillment must advance one step at a time.")
    if status in {"SHIPPED", "DELIVERED"}:
        order.status = OrderStatus(status)
    else:
        order.payment_reference = "|".join(order.payment_reference.split("|")[:2]) + f"|stage={status}"
    await db.commit()
    return _ondc_snapshot(order)


@router.post("/{order_id}/cancel")
async def cancel_order(order_id: UUID, payload: CancelOrderRequest, user: UserResponse = Depends(current_user), db: AsyncSession = Depends(get_db)):
    order = await accessible_order(order_id, user, db)
    if order.buyer_id != str(user.id):
        raise HTTPException(403, "Only the buyer can cancel.")
    if order.status == OrderStatus.CANCELLED:
        return _ondc_snapshot(order)
    if order.status in {OrderStatus.SHIPPED, OrderStatus.DELIVERED}:
        raise HTTPException(409, "Shipped orders cannot be cancelled.")
    if order.status == OrderStatus.PAID:
        items = (await db.execute(select(OrderItem).where(OrderItem.order_id == order.id).order_by(OrderItem.product_id))).scalars().all()
        for item in items:
            product = (await db.execute(select(Product).where(Product.id == item.product_id).with_for_update())).scalar_one()
            product.stock_quantity += item.quantity
    order.status, order.cancellation_reason = OrderStatus.CANCELLED, payload.reason
    await db.commit()
    return _ondc_snapshot(order)


@router.get("/{order_id}/status")
async def order_status(order_id: UUID, user: UserResponse = Depends(current_user), db: AsyncSession = Depends(get_db)):
    return _ondc_snapshot(await accessible_order(order_id, user, db))


@router.get("")
async def list_orders(user: UserResponse = Depends(current_user), db: AsyncSession = Depends(get_db)):
    seller_orders = select(OrderItem.order_id).join(Product).join(ArtisanProfile).where(ArtisanProfile.user_id == user.id)
    rows = (await db.execute(select(Order).where(or_(Order.buyer_id == str(user.id), Order.id.in_(seller_orders)))
                            .order_by(Order.created_at.desc()).limit(100))).scalars().all()
    result = []
    for order in rows:
        items = (await db.execute(select(OrderItem, Product).join(Product).where(OrderItem.order_id == order.id))).all()
        seller = await is_seller(order, user, db)
        result.append({**_ondc_snapshot(order), "is_seller": seller, "shipping_address": order.shipping_address,
                       "maker_amount": sum(maker_amount(i.price_at_time, i.quantity) for i, p in items),
                       "items": [{"title": p.title, "quantity": i.quantity, "price": i.price_at_time} for i, p in items]})
    return {"data": result}


@router.post("/{order_id}/payout")
async def payout(order_id: UUID, user: UserResponse = Depends(current_user), db: AsyncSession = Depends(get_db)):
    order = await accessible_order(order_id, user, db, seller_only=True)
    if order.status != OrderStatus.DELIVERED:
        raise HTTPException(409, "Delivery must complete before recording settlement.")
    items = (await db.execute(select(OrderItem, Product).join(Product).where(OrderItem.order_id == order.id))).all()
    artisan_id = items[0][1].artisan_id
    row = (await db.execute(select(Settlement).where(Settlement.order_id == order.id, Settlement.artisan_id == artisan_id))).scalar_one_or_none()
    if not row:
        row = Settlement(order_id=order.id, artisan_id=artisan_id,
                         amount=sum(maker_amount(i.price_at_time, i.quantity) for i, p in items), status="SIMULATED")
        db.add(row)
        await db.commit()
    return {"status": "SIMULATED", "settlement_id": str(row.id), "amount": float(row.amount),
            "message": "Recorded once in the demo ledger. No bank transfer was made."}

