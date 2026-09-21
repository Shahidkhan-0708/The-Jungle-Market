# Jungle Market Backend Architecture

## Assumptions

- The `backend` folder is the backend repository root.
- Marketplace state is persisted in PostgreSQL through SQLAlchemy and Alembic. API workers do not keep authoritative product, review, consent, inventory, order, or search state in process memory.
- Trained detection, category, material, speech, SEO, and pricing model accuracy requires Jungle Market datasets. Missing or unpromoted local models route outputs to Ambassador review.
- Request-time scraping is excluded. Current-market intelligence is scheduled/offline and the live pricing path reads stored snapshots.

## Boundaries

- `apps/api` owns HTTP routing and API-safe error handling.
- `apps/worker` owns async Celery orchestration.
- `jungle_market/domain` owns enums, schemas, and SQLAlchemy models.
- `jungle_market/services` owns deterministic business logic and CPU-first media processing.
- `jungle_market/ml` owns model adapters, registry, rollout, training, and evaluation boundaries.
- `jungle_market/infrastructure` owns database, Redis, and object storage adapters.

## Publication Gate

Listings publish only after a ProductRecord, SEO draft, and price recommendation exist and the trust/risk gate returns `CLEAR`. Complaints and moderation events can rerun the same gate after publication and suspend listings, updating catalog/search availability.
