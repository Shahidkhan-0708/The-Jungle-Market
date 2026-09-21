# Uvicorn

> **Purpose:** Run the FastAPI ASGI application.

## Requirements
- configurable host/port
- container-friendly startup
- graceful shutdown
- API worker count separate from Celery AI workers

## Do not
- use API workers as model-processing workers
- hard-code deployment-specific settings
