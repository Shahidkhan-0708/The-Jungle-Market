# Jungle Market

The active application is this directory: React frontend plus `apps/api` FastAPI.
The older top-level `backend` is not the active server.

## Three services

- **Local API:** verifies Supabase Auth tokens, enforces ownership/review rules, stores private media on disk, and coordinates Colab.
- **Supabase:** authentication and PostgreSQL records in the private `jungle_market` schema. Browser database access is denied; requests go through the API.
- **Colab:** existing rembg and Faster Whisper models; transcription and English audio translation. The original recording is retained when inference fails.

SQLite is not used for application traffic. It remains a test dependency and optional read-only migration source. Media bytes currently live in `data/private-media`; back up this directory with the database. Supabase Storage is not yet implemented.

## Setup

1. Use `.env.example` as a reference without overwriting existing secrets. Configure the matching frontend/server Supabase URL and publishable key, and a random `SECRET_KEY` of at least 32 characters.
2. Set `DATABASE_URL` to your Supabase PostgreSQL direct or session-pooler URL. Percent-encode special password characters. If certificate verification fails, download the CA certificate from Supabase Database Settings, SSL configuration, and set `DATABASE_SSL_ROOT_CERT` to its local path. Certificate verification stays enabled.
3. Install `requirements.txt`, then run `python scripts/migrate_supabase.py`. This creates the private schema, tables, and denies direct anon/authenticated access. This script creates the initial schema; it does not upgrade an older incompatible schema.
4. In Supabase Auth, enable Email and configure the frontend Site URL and redirect URLs. Buyers and artisans may self-register. An administrator grants field-review access through trusted `app_metadata.account_role = "AMBASSADOR"`; editable user metadata cannot grant it.
5. Run the API: `python -m uvicorn apps.api.main:app --reload --host 127.0.0.1 --port 8000`.
6. Install frontend packages from the lockfile, then `npm run dev`. Open the printed frontend URL (normally port 5173).
7. `/health` confirms the local API is running. `/ready` checks the database schema. `/v1/ml/status` separately checks Colab; a healthy local API does not prove cloud readiness.

Optional legacy copy: first back up the source and check account ownership, then run `python scripts/migrate_supabase.py --legacy-sqlite path/to/legacy.db`. It reads SQLite without modifying it, preserves IDs, skips existing primary keys, and imports products as drafts. Legacy account IDs must be mapped to the actual Supabase identities before owners can use imported records. Do not treat imported sample reviews as evidence.

## End-to-end workflow

1. Artisan signs in and creates a persisted draft.
2. Grants processing consent, uploads/crops a photo, optionally removes its background through Colab, and checks the result.
3. Records, pauses/resumes, plays back, or uploads an original story; saves it privately before requesting transcription or English translation. A failed inference can be retried without another recording.
4. Corrects wording and approves any translation, enters measured dimensions/materials/origin, price and stock. Image publication and original-audio publication have separate consent flags.
5. Saves and submits for field review. A trusted ambassador checks materials, dimensions, origin and story, and records notes. Requested changes return the craft to draft.
6. Artisan publishes the approved version. Discovery, filters, original audio when permitted, provenance link and PDF use the saved record. Editing requires withdrawal and a new review.
7. Buyer orders from one maker with a delivery address, completes the clearly marked mock payment, or resumes/cancels the unpaid order from Orders. Verified payment decrements stock once; cancellation restores paid stock once.
8. The owning seller advances fulfillment step by step. Delivered orders may receive one simulated settlement record. No actual bank transfer or ONDC network delivery occurs.
9. Buyer/maker messages, custom requests, ambassador visits and impact exports use persisted records. Account deletion withdraws listings and removes private media/profile forms while retaining transaction records and the Supabase login account.

## Colab

Update `../colab/ml_server.py` in the notebook's repository before restarting its launcher. Install `colab/requirements-colab.txt`, set `NGROK_TOKEN` and `COLAB_ML_API_KEY` in the runtime, and run `python colab/setup_and_run.py`. Put the resulting tunnel URL and matching shared key in this application's `.env`. Never put the shared key in browser code.

After deployment, `/v1/ml/status` should list `rembg`, `whisper`, and `translate-audio`. Whisper translates audio into English, and its wording always needs human review. An old live notebook may expose only the first two endpoints until updated. Colab runtime/tunnel expiry requires restarting it and updating the URL.

Optional text-only translation at `/v1/translate` needs `FACTORY_API_KEY`, `FACTORY_API_BASE_URL`, and `TRANSLATION_MODEL`; absent configuration returns a clear unavailable response. The current craft editor uses Colab audio translation.

## Checks and limits

Run `python qa-reports/workflow-check.py`, `npx tsc --noEmit`, and `npm run build`.
The backend check uses isolated SQLite test files and mocked inference, never cloud data. It covers publication, ownership, consent, conflicts, inference failure recovery, scoped messages, checkout/retry/cancellation, fulfillment and simulated settlement. PostgreSQL locking and real speech quality require separate live checks.

Automatic craft classification, photo-derived dimensions and market price predictions remain disabled because validated models are absent. Enter factual values and obtain field review. Payments, refunds, payouts and ONDC are sandbox behavior. Local draft recovery does not provide offline uploads or synchronization. QR generation, map-based discovery and real payment/delivery integrations are not implemented in the live workflow.
