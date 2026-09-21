from statistics import quantiles

from jungle_market.domain.schemas.pricing import PricingRange


class MarketSnapshotBuilder:
    def build_range(self, prices: list[float], currency: str = "INR") -> PricingRange:
        if len(prices) < 5:
            raise ValueError("at least five market observations are required")
        sorted_prices = sorted(price for price in prices if price > 0)
        if len(sorted_prices) < 5:
            raise ValueError("not enough valid market observations")
        low = quantiles(sorted_prices, n=5, method="inclusive")[0]
        median = quantiles(sorted_prices, n=2, method="inclusive")[0]
        high = quantiles(sorted_prices, n=5, method="inclusive")[3]
        return PricingRange(
            p20=round(low, 2), p50=round(median, 2), p80=round(high, 2), currency=currency
        )
