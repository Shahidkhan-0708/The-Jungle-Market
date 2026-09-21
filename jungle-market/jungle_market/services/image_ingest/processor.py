import io
from PIL import Image, ImageOps
from fastapi import UploadFile, HTTPException

class ImageIngestProcessor:
    def __init__(self, max_size_mb: int = 15, max_pixels: int = 4000):
        self.max_size_bytes = max_size_mb * 1024 * 1024
        self.max_pixels = max_pixels

    async def process(self, file: UploadFile) -> Image.Image:
        # Check size (if possible from headers, or we check after reading)
        content = await file.read()
        if len(content) > self.max_size_bytes:
            raise HTTPException(status_code=400, detail="File too large")
            
        try:
            img = Image.open(io.BytesIO(content))
        except Exception as e:
            raise HTTPException(status_code=400, detail="Invalid image format")

        # EXIF correction
        try:
            img = ImageOps.exif_transpose(img)
        except Exception:
            pass
            
        # Convert to RGB
        if img.mode != 'RGB':
            img = img.convert('RGB')
            
        # Check dimensions
        width, height = img.size
        if width > self.max_pixels or height > self.max_pixels:
            img.thumbnail((self.max_pixels, self.max_pixels), Image.Resampling.LANCZOS)
            
        return img

processor = ImageIngestProcessor()
