from pathlib import Path

import numpy as np

from jungle_market.core.errors import ModelArtifactUnavailable
from jungle_market.ml.adapters.base import (
    CategoryClassifier,
    CategoryResult,
    MaterialClassifier,
    MaterialResult,
)


class TorchVisionMobileNetCategoryClassifier(CategoryClassifier):
    def __init__(self, model_path: Path | None, labels: list[str], model_version: str) -> None:
        if model_path is None or not model_path.exists():
            raise ModelArtifactUnavailable(
                "category model artifact path is not configured or missing"
            )
        self.labels = labels
        self.model_version = model_version
        import torch
        from torchvision import models

        self.torch = torch
        self.model = models.mobilenet_v3_large(num_classes=len(labels))
        state = torch.load(model_path, map_location="cpu")
        self.model.load_state_dict(state)
        self.model.eval()

    def predict(self, product_crop: np.ndarray) -> CategoryResult:
        import torch.nn.functional as functional
        from torchvision.transforms import v2

        transform = v2.Compose(
            [
                v2.ToImage(),
                v2.Resize((224, 224)),
                v2.ToDtype(self.torch.float32, scale=True),
                v2.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
            ]
        )
        tensor = transform(product_crop).unsqueeze(0)
        with self.torch.inference_mode():
            probabilities = functional.softmax(self.model(tensor), dim=1)[0]
        top_values, top_indices = probabilities.topk(min(5, len(self.labels)))
        return CategoryResult(
            [
                (self.labels[int(index)], float(value))
                for value, index in zip(top_values, top_indices, strict=True)
            ],
            self.model_version,
        )


class TorchVisionMultiLabelMaterialClassifier(MaterialClassifier):
    def __init__(
        self, model_path: Path | None, labels: list[str], model_version: str, threshold: float = 0.5
    ) -> None:
        if model_path is None or not model_path.exists():
            raise ModelArtifactUnavailable(
                "material model artifact path is not configured or missing"
            )
        self.labels = labels
        self.model_version = model_version
        self.threshold = threshold
        import torch
        from torchvision import models

        self.torch = torch
        self.model = models.mobilenet_v3_large(num_classes=len(labels))
        state = torch.load(model_path, map_location="cpu")
        self.model.load_state_dict(state)
        self.model.eval()

    def predict(self, product_crop: np.ndarray) -> MaterialResult:
        from torchvision.transforms import v2

        transform = v2.Compose(
            [
                v2.ToImage(),
                v2.Resize((224, 224)),
                v2.ToDtype(self.torch.float32, scale=True),
                v2.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
            ]
        )
        tensor = transform(product_crop).unsqueeze(0)
        with self.torch.inference_mode():
            probabilities = self.torch.sigmoid(self.model(tensor))[0]
        confidence_by_material = {
            label: float(probabilities[index]) for index, label in enumerate(self.labels)
        }
        materials = [
            label
            for label, confidence in confidence_by_material.items()
            if confidence >= self.threshold
        ]
        dominant = (
            max(confidence_by_material, key=lambda label: confidence_by_material[label])
            if materials
            else None
        )
        return MaterialResult(materials, dominant, confidence_by_material, self.model_version)
