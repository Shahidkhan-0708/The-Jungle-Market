from abc import ABC, abstractmethod
from dataclasses import dataclass

import numpy as np


@dataclass(frozen=True)
class DetectionResult:
    bbox_xyxy: tuple[int, int, int, int]
    confidence: float
    model_version: str


@dataclass(frozen=True)
class CategoryResult:
    top_k: list[tuple[str, float]]
    model_version: str


@dataclass(frozen=True)
class MaterialResult:
    materials: list[str]
    dominant_material: str | None
    confidence_by_material: dict[str, float]
    model_version: str


class ProductDetector(ABC):
    @abstractmethod
    def detect_primary_product(self, rgb_array: np.ndarray) -> DetectionResult:
        raise NotImplementedError


class CategoryClassifier(ABC):
    @abstractmethod
    def predict(self, product_crop: np.ndarray) -> CategoryResult:
        raise NotImplementedError


class MaterialClassifier(ABC):
    @abstractmethod
    def predict(self, product_crop: np.ndarray) -> MaterialResult:
        raise NotImplementedError
