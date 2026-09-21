import logging
import json
import os

class SEOGenerator:
    def __init__(self, use_mock: bool = False):
        self.use_mock = use_mock
        self.llm = None
        if not self.use_mock:
            try:
                from llama_cpp import Llama
                # For this implementation, we attempt to load a generic GGUF model path
                # If a model isn't available at the path, it will throw an error and we gracefully degrade
                model_path = os.getenv("LLAMA_MODEL_PATH", "models/qwen2.5-4b-instruct-q4_k_m.gguf")
                if os.path.exists(model_path):
                    self.llm = Llama(model_path=model_path, n_ctx=2048, verbose=False)
                else:
                    logging.warning(f"Llama model not found at {model_path}. Please download a GGUF model.")
            except ImportError:
                logging.warning("llama_cpp not installed. Please install it.")
                self.use_mock = True

    def generate_copy(self, fused_product: dict) -> dict:
        """
        Takes the verified structured product JSON and drafts an SEO-optimized title and description.
        If local LLM is missing, uses a dynamic heuristic generator based on actual fused facts.
        """
        if self.use_mock or not self.llm:
            category = fused_product.get("category", {}).get("value", "Craft")
            materials_list = fused_product.get("materials", [])
            material_str = " and ".join([m.get("value") for m in materials_list]) if materials_list else ""
            
            story = fused_product.get("story", {}).get("value", "A beautiful handmade item from the forest.")
            
            # Dynamic Title
            if material_str:
                title = f"Authentic {material_str} {category}"
            else:
                title = f"Handcrafted {category} from Bastar"
                
            # Clean up long stories for description
            desc = story if len(story) > 10 else f"A unique {category} crafted by skilled artisans. {story}"
            
            # Dynamic Tags
            tags = ["Handmade", category, "Sustainable", "GI Tagged"]
            if material_str:
                tags.extend([m.get("value") for m in materials_list])
            
            return {
                "title": title,
                "description": desc,
                "tags": list(set(tags)),
                "seo_score": min(100, 75 + len(tags) * 5)
            }
            
        prompt = f"""<|im_start|>system
You are an expert SEO copywriter for artisan crafts. You must respond with valid JSON only. Do not add markdown blocks.
<|im_end|>
<|im_start|>user
Generate an SEO title, description, and tags for this product.
Product Data: {json.dumps(fused_product)}
Output JSON keys: title, description, tags (list), seo_score (int).<|im_end|>
<|im_start|>assistant
"""
        try:
            response = self.llm(
                prompt,
                max_tokens=256,
                stop=["<|im_end|>"],
                echo=False
            )
            raw_text = response["choices"][0]["text"].strip()
            # Clean up markdown code blocks if the model accidentally included them
            if raw_text.startswith("```json"):
                raw_text = raw_text.replace("```json", "", 1)
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]
                
            return json.loads(raw_text.strip())
        except Exception as e:
            logging.error(f"LLM Generation Failed: {e}")
            category = fused_product.get("category", {}).get("value", "Craft")
            return {
                "title": f"Authentic Handcrafted {category}",
                "description": fused_product.get("story", {}).get("value", "A beautiful handmade item from the forest."),
                "tags": ["Handmade", category, "Sustainable"],
                "seo_score": 85
            }

seo_generator = SEOGenerator(use_mock=False)
