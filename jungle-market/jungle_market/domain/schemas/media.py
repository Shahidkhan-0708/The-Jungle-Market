from pydantic import BaseModel
from typing import Optional

class ImageProcessResponse(BaseModel):
    raw_uri: str
    processed_uri: Optional[str] = None
    mask_uri: Optional[str] = None
    width: int
    height: int
    is_blurry: bool
    blur_score: float
    message: str = "Success"
