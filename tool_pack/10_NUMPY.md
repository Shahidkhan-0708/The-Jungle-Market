# NumPy

> **Purpose:** Canonical numerical/image array representation.

## Use for
- Pillow → array conversion
- contiguous RGB arrays
- float32 model handoff
- numerical helper operations

## Rule
Keep common preprocessing model-agnostic. Each model adapter performs its own mean/std normalization.
