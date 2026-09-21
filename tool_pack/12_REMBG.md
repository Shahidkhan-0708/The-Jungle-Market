# rembg

> **Purpose:** MVP foreground extraction.

## Flow
image → rembg → alpha mask → OpenCV cleanup

## Requirements
- reusable inference session
- general-purpose product-capable model
- preserve mask for downstream detection/classification/measurement
- low-quality masks can be rejected

## Do not
- assume every rembg mask is trustworthy
- aggressively erode masks to hide errors
