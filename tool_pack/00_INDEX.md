# Jungle Market — Core Tool Pack

Use this folder as the implementation specification for GPT-5.5 High.

## Included core technologies

| Layer | Technology | Responsibility |
|---|---|---|
| API | FastAPI + Uvicorn | HTTP/API layer |
| Validation | Pydantic | Strict schemas and Product JSON |
| Database | PostgreSQL + SQLAlchemy + Alembic | Durable data and migrations |
| Async | Celery + Redis | Heavy AI/background jobs |
| Image ingest | Pillow + NumPy | Safe image loading and arrays |
| CV | OpenCV | Quality checks, cleanup, geometry, ArUco |
| Foreground | rembg + ONNX Runtime | Product mask extraction |
| Detection | RT-DETRv2-S | Product localization |
| Vision ML | PyTorch + TorchVision | Category/material models |
| Speech | faster-whisper | Artisan voice transcription |
| SEO | Qwen3 4B + llama.cpp | Grounded listing copy |
| Pricing | CatBoost | p20/p50/p80 price range |
| Data utilities | pandas + scikit-learn + joblib | ML data/evaluation |
| Tests | pytest | Automated verification |

## Removed from the MVP pack

CLIP, SAM/SAM2, BiRefNet, Qwen2.5-VL, scikit-image, LightGBM, XGBoost, MODNet, LLaVA, InternVL, pyvips, OpenSearch.

These are optional, benchmark-only, future, or not selected.

## Build order

1. Backend/API/data
2. Image ingest
3. Foreground + CV
4. Detection/classification
5. Voice
6. Structured fusion
7. SEO
8. Pricing
9. Commerce/trust flows
10. Feedback/model rollout
11. Tests/deployment

Read `90_SYSTEM_RULES.md` before coding anything.
