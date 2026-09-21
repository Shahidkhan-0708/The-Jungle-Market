import numpy as np

from jungle_market.core.config import Settings
from jungle_market.ml.adapters.base import (
    CategoryClassifier,
    CategoryResult,
    DetectionResult,
    MaterialClassifier,
    MaterialResult,
    ProductDetector,
)


class MockProductDetector(ProductDetector):
    model_version = "mock-rtdetrv2s-not-for-production"

    def detect_primary_product(self, rgb_array: np.ndarray) -> DetectionResult:
        height, width = rgb_array.shape[:2]
        pad_x = max(1, int(width * 0.08))
        pad_y = max(1, int(height * 0.08))
        return DetectionResult(
            (pad_x, pad_y, width - pad_x, height - pad_y), 0.51, self.model_version
        )


class MockCategoryClassifier(CategoryClassifier):
    model_version = "mock-mobilenetv3-category-not-for-production"

    def __init__(self, settings: Settings) -> None:
        self.labels = settings.category_labels

    def predict(self, product_crop: np.ndarray) -> CategoryResult:
        label = self.labels[0] if self.labels else "unknown"
        return CategoryResult([(label, 0.51)], self.model_version)


class MockMaterialClassifier(MaterialClassifier):
    model_version = "mock-multilabel-material-not-for-production"

    def __init__(self, settings: Settings) -> None:
        self.labels = settings.material_labels

    def predict(self, product_crop: np.ndarray) -> MaterialResult:
        confidence_by_material = dict.fromkeys(self.labels, 0.0)
        if self.labels:
            confidence_by_material[self.labels[0]] = 0.51
            return MaterialResult(
                [self.labels[0]], self.labels[0], confidence_by_material, self.model_version
            )
        return MaterialResult([], None, confidence_by_material, self.model_version)
