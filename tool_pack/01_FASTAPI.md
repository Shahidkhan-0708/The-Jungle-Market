# FastAPI

> **Purpose:** Main HTTP API for Jungle Market.

## Use for
- `/v1` API routes
- product/media endpoints
- processing status
- Ambassador review
- pricing/SEO calls
- catalog/search/orders
- consent/deletion requests
- health/readiness

## Requirements
- Pydantic request/response models
- dependency injection for DB/services/auth
- safe domain-error → HTTP-error mapping
- queue heavy AI jobs instead of running them inline

## Do not
- run OpenCV/model inference inside normal request handlers
- expose stack traces
- hard-code secrets

## Acceptance
- [ ] `/health` works
- [ ] `/ready` works
- [ ] invalid payloads fail cleanly
- [ ] heavy jobs return job/status references
