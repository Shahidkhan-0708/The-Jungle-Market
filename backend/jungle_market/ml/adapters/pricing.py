from pathlib import Path

from jungle_market.core.errors import ModelArtifactUnavailable
from jungle_market.domain.schemas.pricing import PricingRange


class CatBoostPricingAdapter:
    def __init__(self, model_path: Path | None, model_version: str) -> None:
        if model_path is None or not model_path.exists():
            raise ModelArtifactUnavailable(
                "CatBoost pricing artifact path is not configured or missing"
            )
        from catboost import CatBoostRegressor

        self.model = CatBoostRegressor()
        self.model.load_model(str(model_path))
        self.model_version = model_version

    def predict_range(
        self, features: dict, categorical_features: list[str], currency: str = "INR"
    ) -> PricingRange:
        import pandas as pd

        frame = pd.DataFrame([features])
        prediction = self.model.predict(frame)
        values = list(prediction[0] if hasattr(prediction[0], "__iter__") else prediction)
        if len(values) < 3:
            raise ValueError("CatBoost pricing model must emit p20, p50, p80")
        return PricingRange(
            p20=float(values[0]), p50=float(values[1]), p80=float(values[2]), currency=currency
        )
