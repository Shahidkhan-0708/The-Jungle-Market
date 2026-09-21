# Jungle Market Backend

Production-minded MVP backend for Jungle Market, a platform that turns artisan photos, voice recordings, validated dimensions, market observations, and commerce outcomes into trustworthy marketplace listings.

## Run Locally

```bash
cp .env.example .env
docker compose up --build
```

API docs are available at `http://localhost:8000/docs`.

The API validates Supabase bearer tokens. Configure `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and exact `API_CORS_ORIGINS` values before starting it.

## Development

```bash
python -m venv .venv
. .venv/Scripts/activate
pip install -e ".[dev]"
pytest
```

## ML Reality

The software interfaces for RT-DETRv2-S, MobileNetV3-Large, multi-label material recognition, faster-whisper, Gemini SEO generation, and CatBoost pricing are present. Trained model accuracy requires Jungle Market-labelled datasets and offline evaluation.

Local mock adapters are clearly named `not-for-production` and should not be promoted through the model registry.

## Repository Tree

```text
apps/
  api/
  worker/
jungle_market/
  core/
  domain/
  infrastructure/
  ml/
  services/
migrations/
scripts/
tests/
docs/
```
