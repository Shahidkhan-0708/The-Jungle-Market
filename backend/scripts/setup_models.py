import os
import torch
import torchvision
from catboost import CatBoostRegressor
import pandas as pd

def main():
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    models_dir = os.path.join(backend_dir, "models")
    os.makedirs(models_dir, exist_ok=True)
    
    print("Setting up dummy/placeholder models for Jungle Market...")

    # 1. FasterRCNN (RT-DETRv2-S stub)
    rtdetr_path = os.path.join(models_dir, "rtdetr_model.pth")
    if not os.path.exists(rtdetr_path):
        print("Generating random weights for RT-DETR stub...")
        model = torchvision.models.detection.fasterrcnn_mobilenet_v3_large_fpn(weights=None, weights_backbone=None)
        torch.save(model.state_dict(), rtdetr_path)
        print(f"Saved {rtdetr_path}")
    else:
        print(f"Already exists: {rtdetr_path}")

    # 2. Category Model (MobileNetV3-Large, 9 classes)
    category_path = os.path.join(models_dir, "category_model.pth")
    if not os.path.exists(category_path):
        print("Creating dummy Category model (9 classes)...")
        model = torchvision.models.mobilenet_v3_large(num_classes=9)
        torch.save(model.state_dict(), category_path)
        print(f"Saved {category_path}")
    else:
        print(f"Already exists: {category_path}")

    # 3. Material Model (MobileNetV3-Large, 7 classes)
    material_path = os.path.join(models_dir, "material_model.pth")
    if not os.path.exists(material_path):
        print("Creating dummy Material model (7 classes)...")
        model = torchvision.models.mobilenet_v3_large(num_classes=7)
        torch.save(model.state_dict(), material_path)
        print(f"Saved {material_path}")
    else:
        print(f"Already exists: {material_path}")

    # 4. CatBoost Pricing Model
    pricing_path = os.path.join(models_dir, "pricing_model.cbm")
    if not os.path.exists(pricing_path):
        print("Creating dummy CatBoost pricing model...")
        # Train a dummy model to initialize the file
        model = CatBoostRegressor(iterations=10, learning_rate=0.1, depth=2, loss_function="MultiRMSE", verbose=False)
        X_dummy = pd.DataFrame({"dummy_feature": [1.0, 2.0, 3.0]})
        y_dummy = pd.DataFrame({"p20": [10.0, 20.0, 30.0], "p50": [15.0, 25.0, 35.0], "p80": [20.0, 30.0, 40.0]})
        model.fit(X_dummy, y_dummy)
        model.save_model(pricing_path)
        print(f"Saved {pricing_path}")
    else:
        print(f"Already exists: {pricing_path}")

    print("Setup complete!")

if __name__ == "__main__":
    main()
