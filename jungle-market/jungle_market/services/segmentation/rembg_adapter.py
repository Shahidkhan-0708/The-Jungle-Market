import cv2
import numpy as np
from PIL import Image
try:
    import rembg
except ImportError:
    rembg = None

class RembgAdapter:
    def __init__(self):
        # We instantiate a session to avoid reloading the model every request
        import os
        model_name = os.getenv("REMBG_MODEL", "u2netp")
        self.session = rembg.new_session(model_name) if rembg else None


    def extract_foreground(self, cv_image: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        """
        Extracts foreground using rembg.
        Returns:
            rgba_image: Extracted foreground as RGBA array.
            mask: The alpha mask.
        """
        if not self.session:
            raise RuntimeError("rembg is not installed")
            
        # Convert BGR to RGB for rembg
        rgb_image = cv2.cvtColor(cv_image, cv2.COLOR_BGR2RGB)
        
        # rembg expects PIL image or byte array
        pil_img = Image.fromarray(rgb_image)
        
        result_pil = rembg.remove(pil_img, session=self.session)
        rgba_image = np.array(result_pil)
        
        # Extract the alpha channel as mask
        mask = rgba_image[:, :, 3]
        
        # Optional: OpenCV Morphological cleanup of the mask
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        clean_mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)
        
        # Apply clean mask back to rgba
        rgba_image[:, :, 3] = clean_mask
        
        return rgba_image, clean_mask

segmenter = RembgAdapter()
