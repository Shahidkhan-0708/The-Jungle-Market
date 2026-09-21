# Jungle Market API

All `/v1` mutation endpoints require a Supabase bearer token. Artisan-owned resources enforce ownership; ambassador review and suspension endpoints require the `AMBASSADOR` role in trusted Supabase app metadata.

## Authentication

- `GET /v1/auth/me`

## Health

- `GET /health`
- `GET /ready`

## Media

- `POST /v1/media/image`
- `POST /v1/media/audio`

Both media endpoints require prior consent records for the uploader and store bytes through the object-storage abstraction.

## Products

- `POST /v1/products`
- `GET /v1/products/{id}`
- `PATCH /v1/products/{id}`
- `POST /v1/products/{id}/process`
- `GET /v1/products/{id}/processing-status`
- `POST /v1/products/{id}/dimensions/manual`
- `POST /v1/products/{id}/seo/generate`
- `POST /v1/products/{id}/pricing/recommend`
- `POST /v1/products/{id}/publish`
- `POST /v1/products/{id}/risk/recheck`
- `POST /v1/products/{id}/suspend`

## Review, Search, Commerce, Rights

- `GET /v1/reviews/ambassador/queue`
- `POST /v1/reviews/ambassador/{id}/approve`
- `POST /v1/reviews/ambassador/{id}/correct`
- `GET /v1/search`
- `POST /v1/orders`
- `GET /v1/orders/{id}`
- `POST /v1/consent`
- `POST /v1/consent/revoke`
- `POST /v1/data-deletion-requests`
