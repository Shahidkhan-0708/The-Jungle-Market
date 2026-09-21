from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(frozen=True)
class StoredObject:
    uri: str
    byte_size: int
    checksum_sha256: str


class ObjectStorage(ABC):
    @abstractmethod
    def put_bytes(self, key: str, data: bytes, content_type: str) -> StoredObject:
        raise NotImplementedError

    @abstractmethod
    def get_bytes(self, uri: str) -> bytes:
        raise NotImplementedError

    @abstractmethod
    def delete_or_anonymize(self, uri: str) -> None:
        raise NotImplementedError
