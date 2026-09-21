from uuid import UUID

from pydantic import BaseModel


class MediaUploadResponse(BaseModel):
    media_id: UUID
    product_id: UUID | None = None
    storage_uri: str
    media_type: str
    width: int | None = None
    height: int | None = None
    processed_uri: str | None = None
