# OpenCV (`opencv-python-headless`)

> **Purpose:** Main production computer-vision utility layer.

## Use for
- proportional resize (default max long edge ~1600 px)
- blur/luminance/contrast measurement
- conditional LAB CLAHE
- feature-flagged uneven-light correction
- morphology
- connected components
- contours
- bounding/min-area geometry
- ArUco/ChArUco
- calibration
- homography/rectification
- verified planar measurement

## Rules
- correction is quality-gated
- morphology happens after segmentation/detection
- preserve holes, handles, fibres and thin bamboo
- reject unreliable measurement instead of guessing
- RGB outside OpenCV; BGR only at OpenCV boundary

## Do not
- install both OpenCV GUI and headless packages
- use edges/contours as the main product detector
- derive real dimensions from an unscaled random photo
