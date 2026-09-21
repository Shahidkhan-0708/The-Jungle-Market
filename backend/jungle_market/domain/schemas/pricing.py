from pydantic import BaseModel, Field, model_validator


class CostFloorInput(BaseModel):
    material_cost: float = Field(ge=0)
    labour_cost: float = Field(ge=0)
    packaging_cost: float = Field(default=0, ge=0)
    platform_cost: float = Field(default=0, ge=0)
    minimum_margin_rate: float = Field(default=0.22, ge=0, le=1)


class PricingRange(BaseModel):
    p20: float = Field(ge=0)
    p50: float = Field(ge=0)
    p80: float = Field(ge=0)
    currency: str = "INR"

    @model_validator(mode="after")
    def quantiles_are_ordered(self) -> "PricingRange":
        if not self.p20 <= self.p50 <= self.p80:
            raise ValueError("price quantiles must be ordered p20 <= p50 <= p80")
        return self


class PriceRecommendationResult(BaseModel):
    model_range: PricingRange | None
    market_range: PricingRange | None
    cost_floor: float
    final_range: PricingRange
    confidence: float = Field(ge=0, le=1)
    requires_review: bool
    reasons: list[str] = Field(default_factory=list)
