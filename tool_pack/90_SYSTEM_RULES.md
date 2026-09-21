# Jungle Market — Cross-System Rules

## Evidence first
Every important predicted field preserves:
`value, source, confidence, model_version, verification_state, timestamp`.

## Authority
**Voice owns:** artisan story, stated process, stated location, effort/labour.

**Vision owns visible facts:** category, visible materials, appearance/colour.

**Dimensions preserve provenance:** `measured_verified`, `self_reported`, `ambassador_verified`.

## Fail closed
Send uncertain/conflicting results to Ambassador review. Never fill gaps by guessing.

## Dimensions
Authoritative dimensions require known scale + valid geometry.
Manual values are marked self-reported and pass category-range plausibility checks.

## SEO
Validated facts → Qwen3 → constrained JSON → Pydantic → forbidden-claim checks.

## Pricing
`CatBoost p20/p50/p80 + current market snapshot + artisan cost floor`

Never recommend below the protected cost floor unless an authorized human override is audited.

## Publishing
`ProductRecord + SEO + Price → Draft → Mandatory Trust Gate → Publish`

No bypass.

## Post-publish trust
Complaints/abuse signals can trigger re-check and suspension/unpublish.

## Catalog/search
Publish, inventory, suspension and archive changes trigger search refresh.

## Consent
Photos/audio are stored only after consent.
Revocation/deletion requests delete or anonymize eligible data while retaining legally required transaction records.

## Learning loop
Ambassador corrections + commerce outcomes → versioned dataset → offline eval → candidate → shadow → canary → promote/rollback.

## Explicit MVP exclusions
Do not add:
CLIP, SAM/SAM2, BiRefNet, Qwen2.5-VL, scikit-image, LightGBM, XGBoost, MODNet, LLaVA, InternVL, pyvips.
