# Redis

> **Purpose:** Celery broker/backend and short-lived cache/state.

## Use for
- background-job queue
- job state
- small temporary cache entries

## Rules
- set TTL on temporary data
- durable product/order truth belongs in PostgreSQL

## Do not
- use Redis as the authoritative marketplace database
