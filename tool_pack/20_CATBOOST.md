# CatBoost

> **Purpose:** Predict a fair price range, not a single certain price.

## Output
- p20: lower
- p50: typical
- p80: upper

## Features may include
- category
- material
- dimensions + provenance
- labour time
- artisan cost
- region
- weight
- complexity
- season
- historical sales
- current-market statistics

## Final pricing
CatBoost range + market baseline + artisan cost floor → recommendation.

## Rules
- use native categorical features where appropriate
- cost floor is deterministic and applied after ML
- weak evidence routes to Ambassador review
- do not deploy before representative data exists
