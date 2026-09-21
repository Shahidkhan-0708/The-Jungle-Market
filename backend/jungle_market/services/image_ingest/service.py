from dataclasses import dataclass
from io import BytesIO

import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError

from jungle_market.core.config import Settings
from jungle_market.core.errors import ImageValidationError


@dataclass(frozen=True)
class IngestedImage:
    image: Image.Image
    rgb_array: np.ndarray
    width: int
    height: int


class ImageIngestService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def open_image(self, payload: bytes) -> IngestedImage:
        if len(payload) > self.settings.max_image_bytes:
            raise ImageValidationError("image exceeds configured byte limit")

        try:
            with Image.open(BytesIO(payload)) as candidate:
                candidate.verify()
            with Image.open(BytesIO(payload)) as reopened:
                width, height = reopened.size
                if width * height > self.settings.max_image_pixels:
                    raise ImageValidationError("image exceeds configured pixel limit")
                oriented = ImageOps.exif_transpose(reopened)
                rgb_image = oriented.convert("RGB")
        except ImageValidationError:
            raise
        except (UnidentifiedImageError, OSError, ValueError) as exc:
            raise ImageValidationError("image is corrupt or unsupported") from exc

        rgb_array = np.ascontiguousarray(np.asarray(rgb_image, dtype=np.uint8))
        return IngestedImage(
            image=rgb_image,
            rgb_array=rgb_array,
            width=rgb_image.width,
            height=rgb_image.height,
        )
