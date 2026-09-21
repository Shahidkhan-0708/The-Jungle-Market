import numpy as np

from jungle_market.ml.adapters.base import DetectionResult, ProductDetector


class ProductLocalizationService:
    def __init__(self, detector: ProductDetector) -> None:
        self.detector = detector

    def locate_and_crop(
        self, rgb_array: np.ndarray, padding_ratio: float = 0.06
    ) -> tuple[DetectionResult, np.ndarray]:
        result = self.detector.detect_primary_product(rgb_array)
        height, width = rgb_array.shape[:2]
        x1, y1, x2, y2 = result.bbox_xyxy
        pad_x = int((x2 - x1) * padding_ratio)
        pad_y = int((y2 - y1) * padding_ratio)
        x1 = max(0, x1 - pad_x)
        y1 = max(0, y1 - pad_y)
        x2 = min(width, x2 + pad_x)
        y2 = min(height, y2 + pad_y)
        return result, np.ascontiguousarray(rgb_array[y1:y2, x1:x2])
