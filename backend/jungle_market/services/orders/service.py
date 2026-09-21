from uuid import uuid4

from jungle_market.domain.enums import OrderStatus
from jungle_market.domain.schemas.orders import OrderCreate, OrderResult
from jungle_market.services.inventory.service import InventoryService, InventoryState


class OrderService:
    def __init__(self, inventory_service: InventoryService) -> None:
        self.inventory_service = inventory_service

    def create_order(
        self,
        payload: OrderCreate,
        inventory_by_product: dict[str, InventoryState],
    ) -> tuple[OrderResult, list[InventoryState]]:
        updated: list[InventoryState] = []
        total = 0.0
        for item in payload.items:
            total += item.unit_price * item.quantity
            state = inventory_by_product[str(item.product_id)]
            updated.append(self.inventory_service.decrement_after_sale(state, item.quantity))
        return (
            OrderResult(
                order_id=uuid4(),
                status=OrderStatus.PAID.value,
                total_amount=round(total, 2),
                currency=payload.currency,
            ),
            updated,
        )
