from __future__ import annotations

import base64
import io

import cv2
import numpy as np
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from PIL import Image, ImageOps
from pydantic import BaseModel, Field

from jungle_market.infrastructure.ml.colab_client import ColabMLUnavailable, colab_ml
from jungle_market.services.pricing.engine import pricing_engine
from jungle_market.services.vision.classifier import vision_classifier


router = APIRouter(tags=["appraisal"])


class AppraisalResponse(BaseModel):
    detected_category: str
    detected_materials: list[str]
    dominant_material: str
    item_length_cm: float
    item_width_cm: float
    pricing_estimates: dict[str, float]
    voice_transcript: str
    seo_description: str
    scrubbed_image_base64: str
    background_removed: bool
    ml_warnings: list[str] = Field(default_factory=list)


def decoded_image(image_bytes: bytes) -> Image.Image:
    try:
        return ImageOps.exif_transpose(Image.open(io.BytesIO(image_bytes))).convert("RGB")
    except Exception as error:
        raise HTTPException(status_code=400, detail="Invalid image file") from error


@router.post("/appraise", response_model=AppraisalResponse)
async def appraise_product(
    file: UploadFile = File(...),
    audio: UploadFile | None = File(None),
    source_language: str = Form("hi"),
    item_length_cm: float = Form(0.0),
    item_width_cm: float = Form(0.0),
) -> AppraisalResponse:
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(status_code=400, detail="Must be an image file")

    original_bytes = await file.read()
    original_image = decoded_image(original_bytes)
    warnings: list[str] = []

    try:
        clean_bytes = await colab_ml.remove_background(
            original_bytes,
            file.filename or "product.jpg",
            file.content_type or "image/jpeg",
        )
        clean_rgba = Image.open(io.BytesIO(clean_bytes)).convert("RGBA")
        background_removed = True
    except ColabMLUnavailable as error:
        warnings.append(str(error))
        background_removed = False
        clean_rgba = original_image.convert("RGBA")
        output = io.BytesIO()
        clean_rgba.save(output, format="PNG")
        clean_bytes = output.getvalue()

    cv_image = cv2.cvtColor(np.array(clean_rgba.convert("RGB")), cv2.COLOR_RGB2BGR)
    detection = vision_classifier.detect_main_product(cv_image)
    x1, y1, x2, y2 = detection["bbox"]
    crop = cv_image[y1:y2, x1:x2]
    if crop.size == 0:
        crop = cv_image
    category = vision_classifier.classify_category(crop)
    materials = vision_classifier.classify_materials(crop)
    dominant_material = max(materials, key=lambda item: item["confidence"])["value"]

    transcript = ""
    if audio is not None:
        audio_bytes = await audio.read()
        try:
            transcription = await colab_ml.transcribe(
                audio_bytes,
                audio.filename or "voice.wav",
                audio.content_type or "audio/wav",
                source_language,
            )
            transcript = str(transcription.get("transcript", ""))
        except ColabMLUnavailable as error:
            warnings.append(str(error))

    fused_product = {
        "category": {"value": category["value"]},
        "materials": materials,
        "dimensions": {
            "length_cm": item_length_cm,
            "width_cm": item_width_cm,
            "height_cm": 1.0,
        },
    }
    pricing = pricing_engine.estimate_price(fused_product)
    seo_description = (
        f"Handcrafted {category['value'].lower()} made from "
        f"{dominant_material.lower()}, with its maker story preserved."
    )

    return AppraisalResponse(
        detected_category=category["value"],
        detected_materials=[item["value"] for item in materials],
        dominant_material=dominant_material,
        item_length_cm=item_length_cm,
        item_width_cm=item_width_cm,
        pricing_estimates={
            "p20_budget_tier": float(pricing["p20_inr"]),
            "p50_fair_value": float(pricing["p50_inr"]),
            "p80_premium_tier": float(pricing["p80_inr"]),
        },
        voice_transcript=transcript,
        seo_description=seo_description,
        scrubbed_image_base64=base64.b64encode(clean_bytes).decode("ascii"),
        background_removed=background_removed,
        ml_warnings=warnings,
    )
