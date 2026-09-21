from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass(frozen=True)
class CommerceOutcomeEvent:
    product_id: UUID
    order_id: UUID | None
    final_sold_price: float | None
    sale_timestamp: datetime | None
    returned_or_refunded: bool = False
    fulfillment_success: bool | None = None
    payout_status: str | None = None


class FeedbackDatasetRouter:
    def route_outcome(self, event: CommerceOutcomeEvent) -> dict:
        return {
            "dataset": "commerce_outcomes",
            "product_id": str(event.product_id),
            "order_id": str(event.order_id) if event.order_id else None,
            "final_sold_price": event.final_sold_price,
            "returned_or_refunded": event.returned_or_refunded,
            "fulfillment_success": event.fulfillment_success,
            "payout_status": event.payout_status,
        }
