import sys
from pathlib import Path

# Ensure backend directory is at the front of sys.path
_backend_dir = str(Path(__file__).resolve().parent.parent.parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from apps.api.routes import auth, consent, health, media, orders, products, reviews, search
from jungle_market.core.config import get_settings
from jungle_market.core.errors import DomainError
from jungle_market.core.logging import configure_logging

settings = get_settings()
configure_logging(settings.log_level)

app = FastAPI(title="Jungle Market API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.api_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(DomainError)
async def domain_error_handler(request: Request, exc: DomainError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": exc.message}},
    )


for router in [
    health.router,
    auth.router,
    media.router,
    products.router,
    reviews.router,
    search.router,
    orders.router,
    consent.router,
]:
    app.include_router(router)
