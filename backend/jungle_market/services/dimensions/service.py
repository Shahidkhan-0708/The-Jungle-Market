from dataclasses import dataclass

import cv2
import numpy as np

from jungle_market.core.errors import MeasurementUnavailable
from jungle_market.domain.enums import EvidenceSource, VerificationState
from jungle_market.domain.schemas.product_record import DimensionEvidence


@dataclass(frozen=True)
class DimensionStats:
    min_width_mm: float
    max_width_mm: float
    min_height_mm: float
    max_height_mm: float
    min_depth_mm: float | None = None
    max_depth_mm: float | None = None


class DimensionEstimator:
    def estimate_with_aruco(
        self,
        rgb_array: np.ndarray,
        product_mask: np.ndarray,
        marker_size_mm: float,
    ) -> DimensionEvidence:
        if not hasattr(cv2, "aruco"):
            raise MeasurementUnavailable("OpenCV ArUco module is unavailable")
        gray = cv2.cvtColor(rgb_array, cv2.COLOR_RGB2GRAY)
        dictionary = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
        detector = cv2.aruco.ArucoDetector(dictionary)
        corners, ids, _ = detector.detectMarkers(gray)
        if ids is None or len(corners) == 0:
            raise MeasurementUnavailable("reference marker not found")

        marker = corners[0].reshape(4, 2)
        side_lengths = [
            np.linalg.norm(marker[0] - marker[1]),
            np.linalg.norm(marker[1] - marker[2]),
            np.linalg.norm(marker[2] - marker[3]),
            np.linalg.norm(marker[3] - marker[0]),
        ]
        if min(side_lengths) <= 1 or max(side_lengths) / min(side_lengths) > 1.35:
            raise MeasurementUnavailable("invalid marker geometry")
        px_per_mm = float(np.mean(side_lengths) / marker_size_mm)
        if px_per_mm <= 0:
            raise MeasurementUnavailable("invalid marker scale")

        ys, xs = np.where(product_mask > 0)
        if len(xs) == 0 or len(ys) == 0:
            raise MeasurementUnavailable("product mask is empty")
        width_mm = float((xs.max() - xs.min() + 1) / px_per_mm)
        height_mm = float((ys.max() - ys.min() + 1) / px_per_mm)
        return DimensionEvidence(
            width_mm=width_mm,
            height_mm=height_mm,
            source=EvidenceSource.MEASURED_VERIFIED,
            confidence=0.84,
            verified=True,
            verification_state=VerificationState.VERIFIED,
            model_version="opencv-aruco-v1",
        )


class ManualDimensionValidator:
    def __init__(self, stats_by_category: dict[str, DimensionStats]) -> None:
        self.stats_by_category = stats_by_category

    def validate(
        self,
        category: str,
        width_mm: float | None,
        height_mm: float | None,
        depth_mm: float | None,
    ) -> tuple[DimensionEvidence, bool, list[str]]:
        stats = self.stats_by_category.get(category)
        reasons: list[str] = []
        if stats:
            if width_mm is not None and not stats.min_width_mm <= width_mm <= stats.max_width_mm:
                reasons.append("width is outside historical range")
            if (
                height_mm is not None
                and not stats.min_height_mm <= height_mm <= stats.max_height_mm
            ):
                reasons.append("height is outside historical range")
            if (
                depth_mm is not None
                and stats.min_depth_mm is not None
                and stats.max_depth_mm is not None
                and not stats.min_depth_mm <= depth_mm <= stats.max_depth_mm
            ):
                reasons.append("depth is outside historical range")
        else:
            reasons.append("no historical dimension statistics for category")

        needs_review = bool(reasons)
        return (
            DimensionEvidence(
                width_mm=width_mm,
                height_mm=height_mm,
                depth_mm=depth_mm,
                source=EvidenceSource.SELF_REPORTED,
                confidence=0.5 if needs_review else 0.68,
                verified=False,
                verification_state=(
                    VerificationState.NEEDS_REVIEW if needs_review else VerificationState.UNVERIFIED
                ),
            ),
            needs_review,
            reasons,
        )
