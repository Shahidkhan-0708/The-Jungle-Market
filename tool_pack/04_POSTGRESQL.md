# PostgreSQL

> **Purpose:** Primary durable system of record.

## Store
- users/roles/artisans/buyers
- consent
- products/evidence/dimensions
- Ambassador corrections
- SEO/pricing
- market observations/snapshots
- catalog/inventory
- reviews/risk events
- orders/shipping/payouts
- commerce outcomes
- model versions/evaluations
- audit logs

## Search
For MVP use PostgreSQL full-text search and/or `pg_trgm`.

## Requirements
- transactional order + inventory updates
- timestamps and provenance
- indexes for filters/search
- historical outcomes retained for learning
