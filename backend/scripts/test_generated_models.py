import sys
import os

sys.path.append(os.path.abspath("."))
from jungle_market.core.config import get_settings
from jungle_market.ml.adapters.rtdetr import RTDETRv2ProductDetector
from jungle_market.ml.adapters.torchvision import TorchVisionMobileNetCategoryClassifier, TorchVisionMultiLabelMaterialClassifier
from jungle_market.ml.adapters.pricing import CatBoostPricingAdapter

def main():
    settings = get_settings()
    
    print("Testing RT-DETR Stub...")
    try:
        detector = RTDETRv2ProductDetector(settings.rt_detr_model_path, "stub")
        print("RT-DETR loaded successfully!")
    except Exception as e:
        print("RT-DETR failed:", e)

    print("Testing Category Model...")
    try:
        cat = TorchVisionMobileNetCategoryClassifier(settings.category_model_path, settings.category_labels, "stub")
        print("Category Model loaded successfully!")
    except Exception as e:
        print("Category Model failed:", e)

    print("Testing Material Model...")
    try:
        mat = TorchVisionMultiLabelMaterialClassifier(settings.material_model_path, settings.material_labels, "stub")
        print("Material Model loaded successfully!")
    except Exception as e:
        print("Material Model failed:", e)

    print("Testing Pricing Model...")
    try:
        price = CatBoostPricingAdapter(settings.catboost_pricing_model_path, "stub")
        print("Pricing Model loaded successfully!")
    except Exception as e:
        print("Pricing Model failed:", e)

if __name__ == "__main__":
    main()
