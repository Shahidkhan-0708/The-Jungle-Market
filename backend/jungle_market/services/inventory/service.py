from dataclasses import dataclass
from uuid import UUID


@dataclass
class InventoryState:
    product_id: UUID
    stock_on_hand: int
    stock_reserved: int = 0
    allow_backorder: bool = False

    @property
    def available(self) -> bool:
        return self.allow_backorder or self.stock_on_hand - self.stock_reserved > 0


class InventoryService:
    def decrement_after_sale(self, state: InventoryState, quantity: int) -> InventoryState:
        if quantity <= 0:
            raise ValueError("quantity must be positive")
        if not state.allow_backorder and state.stock_on_hand < quantity:
            raise ValueError("insufficient inventory")
        state.stock_on_hand -= quantity
        return state
