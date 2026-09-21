import os
import base64
import json
import logging
from urllib.parse import urlparse
from openai import OpenAI
from jungle_market.domain.schemas.product_record import ProductRecord, CategoryEvidence

class FactFusionEngine:
    def __init__(self):
        # Initialize OpenRouter client
        self.api_key = os.getenv("FACTORY_API_KEY")
        self.base_url = os.getenv("FACTORY_API_BASE_URL", "https://openrouter.ai/api/v1")
        
        self.client = None
        if self.api_key:
            self.client = OpenAI(
                base_url=self.base_url,
                api_key=self.api_key,
            )

    def _analyze_image(self, photo_uri: str) -> dict:
        """Helper to analyze image via OpenRouter using gemini-1.5-flash"""
        if not self.client:
            return {}
            
        try:
            # Parse photo_uri to get filename
            filename = photo_uri.split("/")[-1]
            filepath = os.path.join("data", "media", filename)
            
            if not os.path.exists(filepath):
                logging.warning(f"File not found: {filepath}")
                return {}
                
            with open(filepath, "rb") as f:
                img_data = base64.b64encode(f.read()).decode('utf-8')
                
            ext = filepath.split(".")[-1].lower()
            mime_type = "image/png" if ext == "png" else "image/jpeg"
            
            prompt = """
            You are an expert craft analyzer. Analyze this image of a craft and return a JSON object with:
            {
                "category": "A short descriptive category (e.g., Terracotta pot, Bamboo basket, Wooden toy)",
                "materials": ["list", "of", "materials"],
                "dimensions": {
                    "length_cm": number,
                    "width_cm": number,
                    "height_cm": number
                }
            }
            Make reasonable guesses for dimensions based on standard scale. Only output valid JSON.
            """
            
            response = self.client.chat.completions.create(
                model="google/gemini-1.5-flash",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{mime_type};base64,{img_data}"
                                }
                            }
                        ]
                    }
                ],
                response_format={"type": "json_object"}
            )
            
            content = response.choices[0].message.content
            return json.loads(content)
        except Exception as e:
            logging.error(f"Image analysis failed: {e}")
            return {}

    def fuse(self, raw_facts: dict) -> dict:
        """
        Fuses disparate facts (from vision, voice, dimension APIs) into a single
        cohesive record. Applies deterministic authority rules.
        """
        fused = {}
        
        # Check if we have a photo_uri to analyze dynamically
        photo_uri = raw_facts.get("photo_uri")
        ai_vision_facts = {}
        
        if photo_uri and self.client:
            ai_vision_facts = self._analyze_image(photo_uri)
            if ai_vision_facts:
                raw_facts["vision_category"] = {"value": ai_vision_facts.get("category", "Unknown")}
                raw_facts["measured_dimensions"] = {
                    "valid": True,
                    "dimensions": ai_vision_facts.get("dimensions", {"length_cm": 15, "width_cm": 15, "height_cm": 15}),
                    "confidence": 0.85
                }
        
        # 1. Vision Authority for Category and Material
        if "vision_category" in raw_facts:
            fused["category"] = {
                "value": raw_facts["vision_category"].get("value"),
                "confidence": raw_facts["vision_category"].get("confidence", 0.9),
                "source": "vision",
                "verification_state": "VERIFIED" if raw_facts["vision_category"].get("confidence", 0) > 0.8 else "PENDING"
            }
            
        if "vision_materials" in raw_facts:
            fused["materials"] = []
            for mat in raw_facts["vision_materials"]:
                fused["materials"].append({
                    "value": mat["value"],
                    "confidence": mat["confidence"],
                    "source": "vision",
                    "verification_state": "VERIFIED" if mat["confidence"] > 0.8 else "PENDING"
                })

        # 2. Voice Authority for Story, Effort, Process
        if "voice_transcript" in raw_facts:
            val = raw_facts["voice_transcript"].get("transcript") or raw_facts["voice_transcript"].get("value")
            fused["story"] = {
                "value": val,
                "confidence": raw_facts["voice_transcript"].get("confidence", 0.9),
                "source": "voice",
                "verification_state": "VERIFIED" if raw_facts["voice_transcript"].get("confidence", 0) > 0.9 else "PENDING"
            }

        # 3. Dimensions (Prioritize measured ArUco over manual)
        if "measured_dimensions" in raw_facts and raw_facts["measured_dimensions"].get("valid"):
            dims = raw_facts["measured_dimensions"]["dimensions"]
            fused["dimensions"] = {
                "length_cm": dims.get("length_cm") or dims.get("depth_cm", 0.0), # mapping depth to length
                "width_cm": dims.get("width_cm", 0.0),
                "height_cm": dims.get("height_cm", 0.0),
                "confidence": raw_facts["measured_dimensions"].get("confidence", 1.0),
                "source": "vision",
                "verification_state": "VERIFIED"
            }
        elif "manual_dimensions" in raw_facts:
            dims = raw_facts["manual_dimensions"]
            fused["dimensions"] = {
                "length_cm": dims.get("length_cm", 0.0),
                "width_cm": dims.get("width_cm", 0.0),
                "height_cm": dims.get("height_cm", 0.0),
                "confidence": 0.5,
                "source": "manual",
                "verification_state": "PENDING"
            }
            
        # Fallback if everything is missing
        if not fused:
            fused = {
                "category": {"value": "Unknown Craft", "confidence": 0.5, "source": "mock", "verification_state": "PENDING"},
                "dimensions": {"length_cm": 20, "width_cm": 20, "height_cm": 20, "confidence": 0.5, "source": "mock", "verification_state": "PENDING"}
            }

        return fused

fusion_engine = FactFusionEngine()
