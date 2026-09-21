from pathlib import Path

import numpy as np

from jungle_market.core.errors import ModelArtifactUnavailable
from jungle_market.ml.adapters.base import DetectionResult, ProductDetector


class RTDETRv2ProductDetector(ProductDetector):
    """Isolated adapter for RT-DETR inference artifacts."""

    def __init__(self, model_path: Path | None, model_version: str) -> None:
        if model_path is None or not model_path.is_dir():
            raise ModelArtifactUnavailable(
                "RT-DETR model path must be a local Hugging Face model directory"
            )
        self.model_path = model_path
        self.model_version = model_version

        import torch
        from transformers import RTDetrForObjectDetection, RTDetrImageProcessor

        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.processor = RTDetrImageProcessor.from_pretrained(model_path, local_files_only=True)
        self.model = RTDetrForObjectDetection.from_pretrained(model_path, local_files_only=True)
        self.model.to(self.device)
        self.model.eval()

    def detect_primary_product(self, rgb_array: np.ndarray) -> DetectionResult:
        import torch
        from PIL import Image

        image = Image.fromarray(rgb_array)
        inputs = self.processor(images=image, return_tensors="pt").to(self.device)

        with torch.no_grad():
            outputs = self.model(**inputs)

        results = self.processor.post_process_object_detection(
            outputs, target_sizes=[image.size[::-1]], threshold=0.5
        )[0]

        if len(results["boxes"]) > 0:
            best_idx = results["scores"].argmax()
            box = results["boxes"][best_idx].cpu().numpy()
            score = results["scores"][best_idx].item()
            return DetectionResult(
                bbox_xyxy=(int(box[0]), int(box[1]), int(box[2]), int(box[3])),
                confidence=score,
                model_version=self.model_version,
            )

        # Fallback to whole image
        h, w = rgb_array.shape[:2]
        return DetectionResult(
            bbox_xyxy=(0, 0, w, h),
            confidence=0.0,
            model_version=self.model_version,
        )
