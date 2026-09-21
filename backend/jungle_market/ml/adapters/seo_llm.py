import os

from jungle_market.core.errors import ModelArtifactUnavailable
from jungle_market.domain.schemas.seo import SEOContentDraft


class GeminiCloudSEOAdapter:
    def __init__(self, api_key: str | None = None) -> None:
        key = api_key or os.environ.get("GEMINI_API_KEY")
        if not key:
            raise ModelArtifactUnavailable("GEMINI_API_KEY environment variable is missing.")
        from google import genai

        self.client = genai.Client(api_key=key)

    def generate_json(self, prompt: str) -> SEOContentDraft:
        from google.genai import types

        response = self.client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=SEOContentDraft,
                temperature=0.2,
            ),
        )
        if not response.text:
            raise ModelArtifactUnavailable("Gemini returned an empty SEO response")
        return SEOContentDraft.model_validate_json(response.text)
