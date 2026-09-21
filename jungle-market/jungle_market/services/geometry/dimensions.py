"""ArUco scale measurement adapted from backend/services/dimensions/service.py.

The selected product bounds replace its caller-supplied mask. A single photo
measures only the two image-plane extents, never depth or verified dimensions.
"""
import cv2
import numpy as np


class DimensionService:
    def product_bounds(self, rgb_image, rgba_cutout):
        """Fit the largest segmented product, removing the reference marker first."""
        h, w = rgb_image.shape[:2]
        if rgba_cutout.shape != (h, w, 4):
            raise ValueError("Cutout must preserve the original photo size and transparency.")
        mask = (rgba_cutout[:, :, 3] > 127).astype(np.uint8)
        dictionary = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
        corners, _, _ = cv2.aruco.ArucoDetector(dictionary).detectMarkers(cv2.cvtColor(rgb_image, cv2.COLOR_RGB2GRAY))
        for corner in corners:
            x, y, mw, mh = cv2.boundingRect(corner.astype(np.int32))
            margin = max(3, round(max(mw, mh) * .15))
            mask[max(0,y-margin):min(h,y+mh+margin), max(0,x-margin):min(w,x+mw+margin)] = 0
        _, _, stats, _ = cv2.connectedComponentsWithStats(mask, 8)
        parts = sorted(stats[1:], key=lambda row: row[cv2.CC_STAT_AREA], reverse=True)
        if not parts or parts[0][cv2.CC_STAT_AREA] < max(25, h*w*.001):
            raise ValueError("No clear product outline found. Retake the photo or adjust the box manually.")
        x, y, bw, bh, area = parts[0]
        if area > h*w*.95 or (len(parts)>1 and parts[1][cv2.CC_STAT_AREA] > area*.2):
            raise ValueError("The product outline is ambiguous. Photograph one craft on a plain background or adjust the box manually.")
        if x == 0 or y == 0 or x+bw == w or y+bh == h:
            raise ValueError("The craft may be clipped. Leave space around the whole product.")
        return [float(x/w), float(y/h), float(bw/w), float(bh/h)]

    def verify_dimensions_from_marker(self, rgb_image, bounds, marker_size_cm=5.0):
        if not np.isfinite(marker_size_cm) or not 0.5 <= marker_size_cm <= 50:
            raise ValueError("Marker side must be between 0.5 and 50 cm.")
        if not hasattr(cv2, "aruco"):
            raise RuntimeError("OpenCV ArUco support is unavailable.")
        h, w = rgb_image.shape[:2]
        x, y, width, height = bounds
        if not all(np.isfinite(v) for v in bounds) or min(x,y)<0 or min(width,height)<=0 or x+width>1.000001 or y+height>1.000001:
            raise ValueError("Select bounds entirely inside the photo.")
        left, top, right, bottom = x*w, y*h, (x+width)*w, (y+height)*h
        if min(right-left,bottom-top)<5:
            raise ValueError("Select the whole craft, not a tiny area.")
        gray = cv2.cvtColor(rgb_image, cv2.COLOR_RGB2GRAY)
        dictionary = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
        corners, ids, _ = cv2.aruco.ArucoDetector(dictionary).detectMarkers(gray)
        if ids is None or len(corners)!=1:
            raise ValueError("Use a photo with exactly one clear DICT_4X4_50 ArUco marker.")
        marker = corners[0].reshape(4,2)
        edges = np.roll(marker,-1,axis=0)-marker
        sides = np.linalg.norm(edges,axis=1)
        angles = np.abs(np.sum(edges*np.roll(edges,1,axis=0),axis=1)/(sides*np.roll(sides,1)))
        if min(sides)<25 or max(sides)/min(sides)>1.15 or max(angles)>0.17:
            raise ValueError("Marker is too small or tilted. Retake the photo straight on, with the marker beside the craft in the same plane.")
        roi = np.array([[left,top],[right,top],[right,bottom],[left,bottom]],dtype=np.float32)
        overlap, _ = cv2.intersectConvexConvex(marker.astype(np.float32),roi)
        if overlap>0:
            raise ValueError("Keep the marker outside the selected craft bounds.")
        px_per_cm = float(np.mean(sides)/marker_size_cm)
        measured_width = round((right-left)/px_per_cm,2)
        measured_height = round((bottom-top)/px_per_cm,2)
        if max(measured_width,measured_height)>1000:
            raise ValueError("Measurement exceeds 1,000 cm. Check the printed marker size.")
        return {"width_cm":measured_width,"height_cm":measured_height,
                "source":"aruco_selected_bounds","verified":False,"requires_review":True,
                "model_version":"opencv-aruco-bounds-v1","marker_id":int(np.asarray(ids).reshape(-1)[0]),
                "marker_size_cm":marker_size_cm,"bounds":list(bounds)}


dimension_service = DimensionService()
