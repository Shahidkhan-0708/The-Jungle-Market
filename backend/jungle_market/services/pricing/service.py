from dataclasses import dataclass

from jungle_market.core.config import Settings
from jungle_market.domain.schemas.pricing import (
    CostFloorInput,
    PriceRecommendationResult,
    PricingRange,
)
from jungle_market.domain.schemas.product_record import ProductRecord


@dataclass(frozen=True)
class PricingEvidence:
    model_range: PricingRange | None = None
    market_range: PricingRange | None = None
    model_confidence: float = 0.0
    market_confidence: float = 0.0


class CostFloorEngine:
    def calculate(self, inputs: CostFloorInput) -> float:
        direct_cost = (
            inputs.material_cost + inputs.labour_cost + inputs.packaging_cost + inputs.platform_cost
        )
        return round(direct_cost * (1 + inputs.minimum_margin_rate), 2)


class PricingDecisionEngine:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.cost_floor = CostFloorEngine()

    def recommend(
        self,
        product_record: ProductRecord,
        cost_inputs: CostFloorInput,
        evidence: PricingEvidence,
    ) -> PriceRecommendationResult:
        floor = self.cost_floor.calculate(cost_inputs)
        reasons: list[str] = []
        ranges = [
            item for item in [evidence.model_range, evidence.market_range] if item is not None
        ]
        if not ranges:
            ranges = [
                PricingRange(
                    p20=floor,
                    p50=floor * 1.12,
                    p80=floor * 1.28,
                    currency=self.settings.default_currency,
                )
            ]
            reasons.append("no trained pricing model or market snapshot available")

        p20 = max(floor, sum(item.p20 for item in ranges) / len(ranges))
        p50 = max(floor, sum(item.p50 for item in ranges) / len(ranges), p20)
        p80 = max(floor, sum(item.p80 for item in ranges) / len(ranges), p50)
        confidence = max(evidence.model_confidence, evidence.market_confidence)
        if product_record.dimensions is None:
            reasons.append("dimensions unavailable")
        elif not product_record.dimensions.verified:
            reasons.append("dimensions are self-reported")
        if confidence < 0.55:
            reasons.append("pricing evidence confidence is low")
        requires_review = bool(reasons) or product_record.requires_review
        return PriceRecommendationResult(
            model_range=evidence.model_range,
            market_range=evidence.market_range,
            cost_floor=floor,
            final_range=PricingRange(
                p20=round(p20, 2),
                p50=round(p50, 2),
                p80=round(p80, 2),
                currency=self.settings.default_currency,
            ),
            confidence=round(confidence, 3),
            requires_review=requires_review,
            reasons=reasons,
        )
