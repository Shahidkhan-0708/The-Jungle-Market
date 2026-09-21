from dataclasses import dataclass

from jungle_market.domain.enums import ProductStatus, RiskDecision
from jungle_market.domain.schemas.pricing import PriceRecommendationResult
from jungle_market.domain.schemas.product_record import ProductRecord
from jungle_market.domain.schemas.seo import SEOContentDraft


@dataclass(frozen=True)
class RiskAssessmentResult:
    decision: RiskDecision
    score: float
    reasons: list[str]


class ListingRiskGate:
    def assess(
        self,
        product_record: ProductRecord,
        seo: SEOContentDraft | None,
        price: PriceRecommendationResult | None,
        duplicate_image_count: int = 0,
        complaint_count: int = 0,
        moderation_flags: int = 0,
    ) -> RiskAssessmentResult:
        reasons: list[str] = []
        score = 0.0
        if product_record.requires_review:
            reasons.append("product record requires human review")
            score += 0.35
        if seo is None:
            reasons.append("SEO content missing")
            score += 0.2
        if price is None or price.requires_review:
            reasons.append("pricing requires review")
            score += 0.25
        if duplicate_image_count > 0:
            reasons.append("duplicate product image signal")
            score += min(0.35, duplicate_image_count * 0.12)
        if complaint_count >= 3:
            reasons.append("buyer complaint threshold reached")
            # Architecture v4 §14: a post-publish complaint-threshold breach is a
            # risk event that must re-run this gate and suspend the listing.
            score += 0.75
        if moderation_flags > 0:
            reasons.append("moderation flags present")
            score += min(0.5, moderation_flags * 0.2)
        if score >= 0.7:
            return RiskAssessmentResult(RiskDecision.SUSPEND, min(score, 1.0), reasons)
        if score > 0:
            return RiskAssessmentResult(RiskDecision.REVIEW, min(score, 1.0), reasons)
        return RiskAssessmentResult(RiskDecision.CLEAR, 0.0, [])


def publication_status_from_risk(decision: RiskDecision) -> ProductStatus:
    if decision == RiskDecision.CLEAR:
        return ProductStatus.PUBLISHED
    if decision == RiskDecision.SUSPEND:
        return ProductStatus.SUSPENDED
    return ProductStatus.RISK_REVIEW
