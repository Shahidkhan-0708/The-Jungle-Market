import ssl
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
from jungle_market.core.config import settings
from jungle_market.infrastructure.database.session import get_db, engine
from apps.api.routes import ambassador, auth, catalog, consent, features, media, ml, orders, products

app = FastAPI(title="Jungle Market API", version="0.2.0")
app.add_middleware(CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.API_CORS_ORIGINS.split(",") if origin.strip()],
    allow_credentials=True, allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"])
for router in [auth.router, products.router, catalog.router, media.router, orders.router,
               consent.router, ambassador.router, features.router, ml.router]:
    app.include_router(router)


@app.exception_handler(SQLAlchemyError)
@app.exception_handler(ssl.SSLError)
async def database_error(request, error):
    return JSONResponse(status_code=503, content={"detail": "Database unavailable or schema not applied. Your request was not confirmed; retry after setup."})


@app.get("/health")
async def health():
    return {"status": "ok", "service": "local-orchestrator", "database": "Supabase PostgreSQL"}


@app.get("/ready")
async def ready(db: AsyncSession = Depends(get_db)):
    await db.execute(text("SELECT id FROM jungle_market.products LIMIT 1"))
    return {"status": "ready", "database": "Supabase PostgreSQL", "heavy_inference": "See /v1/ml/status"}


@app.post("/appraise")
async def old_appraisal(user: auth.UserResponse = Depends(auth.current_user)):
    raise HTTPException(410, "Use the saved photo/audio workflow at /v1/media. Unverified automatic category, dimensions and prices have been removed.")

