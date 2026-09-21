# Pydantic

> **Purpose:** Enforce structured truth at system boundaries.

## Use for
- API schemas
- ProductRecord
- evidence/provenance objects
- transcript/vision outputs
- SEO JSON
- pricing responses
- settings

## Product evidence should preserve
- value
- source
- confidence
- model_version
- verification_state
- timestamp

## Rules
- unknown values stay `null`/omitted
- malformed AI output is rejected
- conflicts are preserved, not silently overwritten

## Important
Pydantic validates **structure and types**, not factual truth.
