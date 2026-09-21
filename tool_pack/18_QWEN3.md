# Qwen3 4B Instruct (GGUF)

> **Purpose:** Generate buyer-friendly listing copy from verified facts.

## Input
Validated ProductRecord only.

## Output
- title
- description
- tags
- keywords

## Grounding rules
Never invent:
- certification
- durability
- health benefits
- ecological claims
- measurements
- materials
- origin
- cultural claims not present in ProductRecord

Qwen is a **writer**, not the source of product truth.
