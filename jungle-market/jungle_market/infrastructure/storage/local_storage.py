import os
import shutil
import uuid
from pathlib import Path
from fastapi import UploadFile

from jungle_market.core.config import settings

class LocalStorageService:
    def __init__(self):
        self.base_dir = Path("data/media")
        self.base_dir.mkdir(parents=True, exist_ok=True)

    async def save_upload(self, file: UploadFile, prefix: str = "raw") -> str:
        ext = file.filename.split(".")[-1] if file.filename and "." in file.filename else "bin"
        file_id = f"{prefix}_{uuid.uuid4().hex}.{ext}"
        file_path = self.base_dir / file_id
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Ensure we reset file pointer if needed by other services
        await file.seek(0)
        return f"http://localhost:8000/media/{file_id}"

    def save_bytes(self, data: bytes, ext: str, prefix: str = "processed") -> str:
        file_id = f"{prefix}_{uuid.uuid4().hex}.{ext}"
        file_path = self.base_dir / file_id
        
        with open(file_path, "wb") as f:
            f.write(data)
            
        return f"http://localhost:8000/media/{file_id}"

storage = LocalStorageService()
