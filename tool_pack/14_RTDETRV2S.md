# RT-DETRv2-S

> **Purpose:** Product localization only.

## Output
- main product bounding box
- confidence
- padded crop
- model version

## Requirements
- wrap behind detector adapter
- fine-tune on Jungle Market data
- configurable weights/thresholds
- validate offline before locking model

## Do not
- use detector as final category/material authority
- claim accuracy before custom-data evaluation
