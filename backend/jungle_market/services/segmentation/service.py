from dataclasses import dataclass

import cv2
import numpy as np

from jungle_market.core.config import Settings
from jungle_market.core.errors import ForegroundExtractionError


@dataclass(frozen=True)
class MaskCleanupResult:
    mask: np.ndarray
    accepted: bool
    area_ratio: float
    rejection_reason: str | None = None


class ForegroundExtractor:
    def __init__(self) -> None:
        self._session = None

    def _get_session(self):
        if self._session is None:
            import os
            from rembg import new_session
            model_name = os.getenv("REMBG_MODEL", "u2netp")
            self._session = new_session(model_name)
        return self._session

    def extract_mask(self, rgb_array: np.ndarray) -> np.ndarray:
        try:
            from rembg import remove
        except ImportError as exc:
            raise ForegroundExtractionError("rembg is not installed") from exc

        session = self._get_session()
        result = remove(rgb_array, session=session)
        if result.ndim == 3 and result.shape[2] == 4:
            alpha = result[:, :, 3]
        else:
            raise ForegroundExtractionError("rembg did not return an alpha mask")
        return alpha.astype(np.uint8)


class ConservativeMaskCleaner:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def cleanup(self, alpha_mask: np.ndarray) -> MaskCleanupResult:
        if alpha_mask.ndim != 2:
            raise ForegroundExtractionError("mask must be a single-channel alpha image")
        binary = (alpha_mask > 32).astype(np.uint8) * 255
        area_ratio = float((binary > 0).sum() / binary.size)
        if area_ratio < self.settings.min_mask_area_ratio:
            return MaskCleanupResult(binary, False, area_ratio, "foreground area too small")

        component_count, labels, stats, _ = cv2.connectedComponentsWithStats(binary, connectivity=8)
        cleaned = np.zeros_like(binary)
        min_component_area = max(8, int(binary.size * 0.0005))
        for component_id in range(1, component_count):
            area = stats[component_id, cv2.CC_STAT_AREA]
            if area >= min_component_area:
                cleaned[labels == component_id] = 255

        cleaned_area_ratio = float((cleaned > 0).sum() / cleaned.size)
        if cleaned_area_ratio < self.settings.min_mask_area_ratio:
            return MaskCleanupResult(
                cleaned, False, cleaned_area_ratio, "cleanup removed too much mask"
            )

        return MaskCleanupResult(cleaned, True, cleaned_area_ratio)
