from pydantic import BaseModel, Field, field_validator


class SEOContentDraft(BaseModel):
    title: str = Field(min_length=5, max_length=90)
    description: str = Field(min_length=20, max_length=1200)
    tags: list[str] = Field(default_factory=list, max_length=12)
    keywords: list[str] = Field(default_factory=list, max_length=20)

    @field_validator("tags", "keywords")
    @classmethod
    def normalize_terms(cls, values: list[str]) -> list[str]:
        return [value.strip().lower() for value in values if value.strip()]
