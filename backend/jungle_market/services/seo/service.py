import json
import re

from jungle_market.core.errors import LowConfidencePrediction
from jungle_market.domain.schemas.product_record import ProductRecord
from jungle_market.domain.schemas.seo import SEOContentDraft

FORBIDDEN_CLAIM_PATTERNS = [
    re.compile(pattern, re.IGNORECASE)
    for pattern in [
        r"\bcertified\b",
        r"\bguaranteed\b",
        r"\beco[- ]?friendly\b",
        r"\bsustainable\b",
        r"\borganic\b",
        r"\bnon[- ]?toxic\b",
        r"\bhealth\b",
        r"\bindestructible\b",
        r"\blifetime\b",
    ]
]


class ForbiddenClaimChecker:
    def check(self, draft: SEOContentDraft, allowed_terms: set[str] | None = None) -> list[str]:
        allowed = {term.lower() for term in allowed_terms or set()}
        combined = " ".join([draft.title, draft.description, *draft.tags, *draft.keywords])
        violations: list[str] = []
        for pattern in FORBIDDEN_CLAIM_PATTERNS:
            match = pattern.search(combined)
            if match and match.group(0).lower() not in allowed:
                violations.append(match.group(0).lower())
        return sorted(set(violations))


class GroundedSEOGenerator:
    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key
        self.claim_checker = ForbiddenClaimChecker()

    def generate(self, product_record: ProductRecord) -> SEOContentDraft:
        if product_record.requires_review:
            raise LowConfidencePrediction(
                "cannot generate SEO from a product record that needs review"
            )

        category = product_record.category.value if product_record.category else "artisan product"
        material = product_record.dominant_material
        story = product_record.artisan_story.value if product_record.artisan_story else None
        process = product_record.process.value if product_record.process else None

        prompt = f"""
You are an expert e-commerce SEO copywriter for an ethical artisan marketplace called Jungle Market.
Write a compelling product title and description for the following artisan product.
Also extract relevant tags and keywords.
Make the description poetic but factual, emphasizing the handcrafted nature and the artisan's story.

Product Category: {category}
Dominant Material: {material}
Artisan's Story / Voice Transcript: {story or "N/A"}
Process / Technique: {process or "N/A"}

Output strict JSON conforming to the schema.
"""
        from jungle_market.ml.adapters.seo_llm import GeminiCloudSEOAdapter

        adapter = GeminiCloudSEOAdapter(api_key=self.api_key)
        draft = adapter.generate_json(prompt)

        violations = self.claim_checker.check(draft)
        if violations:
            raise LowConfidencePrediction(f"SEO contains forbidden claims: {', '.join(violations)}")
        return draft

    def validate_json_output(self, raw_output: str) -> SEOContentDraft:
        draft = SEOContentDraft.model_validate(json.loads(raw_output))
        violations = self.claim_checker.check(draft)
        if violations:
            raise LowConfidencePrediction(f"SEO contains forbidden claims: {', '.join(violations)}")
        return draft
