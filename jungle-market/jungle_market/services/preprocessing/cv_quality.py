import cv2
import numpy as np
from PIL import Image

class CVQualityChecker:
    def __init__(self, blur_threshold: float = 100.0, max_dimension: int = 1600):
        self.blur_threshold = blur_threshold
        self.max_dimension = max_dimension

    def process_and_check(self, pil_image: Image.Image) -> tuple[np.ndarray, dict]:
        # Convert PIL to cv2 (NumPy) BGR
        cv_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
        
        # Resize if necessary
        h, w = cv_image.shape[:2]
        if max(h, w) > self.max_dimension:
            scale = self.max_dimension / max(h, w)
            cv_image = cv2.resize(cv_image, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

        # Check blur (Variance of Laplacian)
        gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)
        blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # Basic luminance check
        mean_luminance = np.mean(gray)
        
        quality_metrics = {
            "blur_score": blur_score,
            "is_blurry": blur_score < self.blur_threshold,
            "mean_luminance": mean_luminance,
            "width": cv_image.shape[1],
            "height": cv_image.shape[0]
        }
        
        return cv_image, quality_metrics

cv_quality = CVQualityChecker()
