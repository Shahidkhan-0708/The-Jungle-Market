import csv
import os
import sys
import uuid
import numpy as np
from PIL import Image
import requests
from io import BytesIO

sys.path.append(os.path.abspath("."))
from jungle_market.core.config import get_settings
from jungle_market.infrastructure.database.session import SessionLocal, engine, Base
from jungle_market.domain.models.products import Product, ProductMedia
from jungle_market.ml.adapters.rtdetr import RTDETRv2ProductDetector
from jungle_market.ml.adapters.torchvision import TorchVisionMobileNetCategoryClassifier, TorchVisionMultiLabelMaterialClassifier
from jungle_market.ml.adapters.pricing import CatBoostPricingAdapter

def download_image(url, save_path):
    try:
        response = requests.get(url)
        response.raise_for_status()
        with open(save_path, "wb") as f:
            f.write(response.content)
    except Exception as e:
        print(f"    Failed to download image: {e}. Creating dummy image.")
        img = Image.new('RGB', (500, 500), color = (73, 109, 137))
        img.save(save_path)
    return save_path

def main():
    print("Setting up database...")
    from sqlalchemy import create_engine
    # Override engine with SQLite for local testing without Docker
    sqlite_url = "sqlite:///./jungle_market.db"
    sqlite_engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=sqlite_engine)
    from sqlalchemy.orm import sessionmaker
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sqlite_engine)
    db = SessionLocal()

    print("Loading ML Adapters...")
    settings = get_settings()
    
    # Initialize Adapters
    try:
        rtdetr = RTDETRv2ProductDetector(settings.rt_detr_model_path, "seed-stub")
        category_model = TorchVisionMobileNetCategoryClassifier(settings.category_model_path, settings.category_labels, "seed-stub")
        material_model = TorchVisionMultiLabelMaterialClassifier(settings.material_model_path, settings.material_labels, "seed-stub")
        pricing_model = CatBoostPricingAdapter(settings.catboost_pricing_model_path, "seed-stub")
    except Exception as e:
        print(f"Failed to load ML adapters. Ensure models are generated. Error: {e}")
        return

    media_dir = os.path.join(".local_media", "seed")
    os.makedirs(media_dir, exist_ok=True)

    csv_path = "data/seed_products.csv"
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            title = row["title"]
            url = row["original_image_url"]
            print(f"\nProcessing {title}...")
            
            # Download Image
            filename = os.path.basename(row["local_image_path"])
            local_path = os.path.join(media_dir, filename)
            
            if not os.path.exists(local_path):
                print(f"Downloading from {url}...")
                download_image(url, local_path)
            
            # Convert to numpy array for models
            img = Image.open(local_path).convert("RGB")
            img_arr = np.array(img)
            
            # Run Object Detection (Crop)
            print("Running Object Detection...")
            try:
                det_result = rtdetr.detect_primary_product(img_arr)
                print(f"  Detected Box: {det_result.bbox_xyxy} with confidence {det_result.confidence:.2f}")
                # Crop image
                x1, y1, x2, y2 = det_result.bbox_xyxy
                crop_arr = img_arr[y1:y2, x1:x2]
                if crop_arr.size == 0:
                    crop_arr = img_arr # Fallback if empty
            except Exception as e:
                print("  Detection failed, using full image.", e)
                crop_arr = img_arr
                
            # Run Category Classification
            print("Running Category Classification...")
            cat_result = category_model.predict(crop_arr)
            best_cat, cat_conf = cat_result.top_k[0]
            print(f"  Category: {best_cat} ({cat_conf:.2f})")
            
            # Run Material Classification
            print("Running Material Classification...")
            mat_result = material_model.predict(crop_arr)
            best_mat = mat_result.dominant_material
            print(f"  Material: {best_mat}")
            
            # Create DB Records
            product_id = uuid.uuid4()
            product = Product(
                id=product_id,
                title=title,
                product_record={
                    "category": best_cat,
                    "material": best_mat,
                    "ml_confidence_cat": float(cat_conf)
                },
                status="PUBLISHED"
            )
            
            media = ProductMedia(
                id=uuid.uuid4(),
                product_id=product_id,
                media_type="image",
                storage_uri=local_path,
                width_px=img.width,
                height_px=img.height
            )
            
            db.add(product)
            db.add(media)
            print(f"Inserted {title} into database with ID {product_id}")

    db.commit()
    print("\nDatabase seeded successfully!")
    db.close()

if __name__ == "__main__":
    main()
