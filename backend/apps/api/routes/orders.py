from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from apps.api.dependencies import ensure_buyer_profile, get_db, require_roles
from jungle_market.core.errors import NotFound
from jungle_market.core.security import Principal
from jungle_market.domain.enums import OrderStatus, ProductStatus
from jungle_market.domain.models.catalog import CatalogEntry, Inventory
from jungle_market.domain.models.orders import Order, OrderItem
from jungle_market.domain.models.products import Product
from jungle_market.domain.schemas.orders import OrderCreate

router = APIRouter(prefix="/v1/orders", tags=["orders"])


@router.post("")
def create_order(
    payload: OrderCreate,
    principal: Principal = Depends(require_roles("BUYER")),
    db: Session = Depends(get_db),
) -> dict:
    buyer = ensure_buyer_profile(db, principal)
    if payload.buyer_id not in {principal.user_id, buyer.id}:
        raise HTTPException(status_code=403, detail="Cannot create an order for another buyer")

    priced_items: list[tuple] = []
    total = 0.0
    for item in payload.items:
        inventory = db.scalar(
            select(Inventory).where(Inventory.product_id == item.product_id).with_for_update()
        )
        catalog = db.scalar(select(CatalogEntry).where(CatalogEntry.product_id == item.product_id))
        if inventory is None or catalog is None or not catalog.available or catalog.price is None:
            raise NotFound(f"available inventory not found for product {item.product_id}")
        if not inventory.allow_backorder and inventory.stock_on_hand < item.quantity:
            raise HTTPException(status_code=409, detail="insufficient inventory")
        inventory.stock_on_hand -= item.quantity
        total += catalog.price * item.quantity
        priced_items.append((item, catalog.price, inventory, catalog))

    order = Order(
        buyer_id=buyer.id,
        status=OrderStatus.CREATED,
        total_amount=round(total, 2),
        currency=payload.currency,
    )
    db.add(order)
    db.flush()
    for item, unit_price, inventory, catalog in priced_items:
        db.add(
            OrderItem(
                order_id=order.id,
                product_id=item.product_id,
                quantity=item.quantity,
                unit_price=unit_price,
            )
        )
        if inventory.stock_on_hand <= 0 and not inventory.allow_backorder:
            catalog.available = False
            catalog.status = ProductStatus.SOLD_OUT
            product = db.get(Product, item.product_id)
            if product:
                product.status = ProductStatus.SOLD_OUT
    db.commit()
    return {
        "order_id": order.id,
        "status": order.status,
        "total_amount": order.total_amount,
        "currency": order.currency,
    }


@router.get("/{order_id}")
def get_order(
    order_id: UUID,
    principal: Principal = Depends(require_roles("BUYER", "AMBASSADOR")),
    db: Session = Depends(get_db),
) -> dict:
    order = db.get(Order, order_id)
    if order is None:
        raise NotFound("order not found")
    if "AMBASSADOR" not in principal.roles:
        buyer = ensure_buyer_profile(db, principal)
        if order.buyer_id != buyer.id:
            raise HTTPException(status_code=403, detail="Order belongs to another buyer")
    items = db.scalars(select(OrderItem).where(OrderItem.order_id == order_id)).all()
    return {
        "order_id": order.id,
        "status": order.status,
        "total_amount": order.total_amount,
        "currency": order.currency,
        "items": [
            {
                "product_id": item.product_id,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
            }
            for item in items
        ],
    }
