import hashlib
from pathlib import Path

from jungle_market.infrastructure.storage.object_storage import ObjectStorage, StoredObject


class LocalFilesystemStorage(ObjectStorage):
    def __init__(self, root: Path) -> None:
        self.root = root
        self.root.mkdir(parents=True, exist_ok=True)

    def put_bytes(self, key: str, data: bytes, content_type: str) -> StoredObject:
        safe_key = key.replace("\\", "/").lstrip("/")
        target = (self.root / safe_key).resolve()
        if self.root.resolve() not in target.parents and target != self.root.resolve():
            raise ValueError("storage key escapes storage root")
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        checksum = hashlib.sha256(data).hexdigest()
        return StoredObject(
            uri=f"local://{safe_key}", byte_size=len(data), checksum_sha256=checksum
        )

    def get_bytes(self, uri: str) -> bytes:
        key = uri.removeprefix("local://")
        path = (self.root / key).resolve()
        if self.root.resolve() not in path.parents and path != self.root.resolve():
            raise ValueError("storage uri escapes storage root")
        return path.read_bytes()

    def delete_or_anonymize(self, uri: str) -> None:
        key = uri.removeprefix("local://")
        path = (self.root / key).resolve()
        if self.root.resolve() not in path.parents and path != self.root.resolve():
            raise ValueError("storage uri escapes storage root")
        if path.exists():
            path.write_bytes(b"")
