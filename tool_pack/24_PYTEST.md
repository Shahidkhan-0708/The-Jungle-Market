# pytest

> **Purpose:** Automated safety and regression testing.

## Must cover
- corrupt/oversized images
- EXIF orientation
- preprocessing gates
- mask cleanup
- missing ArUco marker
- invalid geometry
- manual dimension plausibility
- low-confidence transcript
- conflicting facts
- ProductRecord validation
- forbidden SEO claims
- pricing cost floor
- pricing review fallback
- trust gate before publish
- complaint → risk recheck
- suspension/catalog/search update
- inventory decrement
- consent revocation/deletion
- outcome persistence
- staged rollout
- canary rollback

Use lightweight mocks/fixtures where real model weights are not required.
