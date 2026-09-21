from dataclasses import dataclass

import cv2
import numpy as np

from jungle_market.core.config import Settings


@dataclass(frozen=True)
class ImageQualityReport:
    blur_score: float
    luminance_mean: float
    contrast_std: float
    needs_review: bool
    corrections_applied: list[str]


@dataclass(frozen=True)
class PreprocessedImage:
    rgb_array: np.ndarray
    quality: ImageQualityReport


class ImagePreprocessor:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def resize_preserving_aspect(self, rgb_array: np.ndarray) -> np.ndarray:
        height, width = rgb_array.shape[:2]
        long_edge = max(height, width)
        if long_edge <= self.settings.max_image_long_edge:
            return np.ascontiguousarray(rgb_array)
        scale = self.settings.max_image_long_edge / long_edge
        new_size = (int(width * scale), int(height * scale))
        return np.ascontiguousarray(cv2.resize(rgb_array, new_size, interpolation=cv2.INTER_AREA))

    def analyze_quality(self, rgb_array: np.ndarray) -> ImageQualityReport:
        gray = cv2.cvtColor(rgb_array, cv2.COLOR_RGB2GRAY)
        blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        luminance_mean = float(gray.mean())
        contrast_std = float(gray.std())
        needs_review = (
            blur_score < 35 or luminance_mean < 35 or luminance_mean > 225 or contrast_std < 18
        )
        return ImageQualityReport(
            blur_score=blur_score,
            luminance_mean=luminance_mean,
            contrast_std=contrast_std,
            needs_review=needs_review,
            corrections_applied=[],
        )

    def preprocess(self, rgb_array: np.ndarray) -> PreprocessedImage:
        resized = self.resize_preserving_aspect(rgb_array)
        quality = self.analyze_quality(resized)
        corrected = resized
        corrections = list(quality.corrections_applied)

        if quality.contrast_std < 30 and 45 <= quality.luminance_mean <= 210:
            lab = cv2.cvtColor(resized, cv2.COLOR_RGB2LAB)
            l_channel, a_channel, b_channel = cv2.split(lab)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            corrected_l = clahe.apply(l_channel)
            corrected = cv2.cvtColor(
                cv2.merge((corrected_l, a_channel, b_channel)), cv2.COLOR_LAB2RGB
            )
            corrections.append("lab_clahe")

        if self.settings.enable_uneven_light_normalization and quality.contrast_std < 24:
            corrections.append("uneven_light_normalization_requested")

        return PreprocessedImage(
            rgb_array=np.ascontiguousarray(corrected),
            quality=ImageQualityReport(
                blur_score=quality.blur_score,
                luminance_mean=quality.luminance_mean,
                contrast_std=quality.contrast_std,
                needs_review=quality.needs_review,
                corrections_applied=corrections,
            ),
        )
