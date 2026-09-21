# PyTorch

> **Purpose:** Train/fine-tune Jungle Market vision models.

## Use for
- category classifier training
- multi-label material training
- detector training workflow
- evaluation/checkpoints

## Requirements
- reproducible training config
- store label map with checkpoint
- record metrics/version
- keep training separate from API runtime

## Rule
Missing trained weights must use an explicitly named mock adapter—not fake predictions.
