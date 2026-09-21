"""Documented model acquisition entry point.

This script intentionally does not download large artifacts by default. Set the
model paths in `.env` after acquiring approved weights for each adapter.
"""

from jungle_market.core.config import get_settings


def main() -> None:
    settings = get_settings()
    print("Configure model artifact paths in .env:")
    print(f"RT_DETR_MODEL_PATH={settings.rt_detr_model_path or ''}")
    print(f"CATEGORY_MODEL_PATH={settings.category_model_path or ''}")
    print(f"MATERIAL_MODEL_PATH={settings.material_model_path or ''}")
    print(f"CATBOOST_PRICING_MODEL_PATH={settings.catboost_pricing_model_path or ''}")


if __name__ == "__main__":
    main()
