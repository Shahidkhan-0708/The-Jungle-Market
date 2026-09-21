import ssl
from fastapi import HTTPException
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from jungle_market.core.config import settings


def database_engine(database_url: str):
    url = make_url(database_url)
    if url.drivername.startswith("postgres"):
        url = url.set(drivername="postgresql+asyncpg")
        query = dict(url.query)
        query.pop("sslmode", None)
        query.pop("ssl", None)
        url = url.set(query=query)
        return create_async_engine(
            url, pool_pre_ping=True, pool_size=3, max_overflow=2,
            connect_args={"ssl": ssl.create_default_context(cafile=settings.DATABASE_SSL_ROOT_CERT or None), "timeout": 15,
                          "server_settings": {"search_path": "jungle_market,public"}},
            execution_options={"schema_translate_map": {None: "jungle_market"}},
        )
    # SQLite is retained only to read legacy data and run isolated tests.
    return create_async_engine(url, echo=False)


engine = database_engine(settings.DATABASE_URL)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_db():
    if engine.dialect.name != "postgresql" and settings.API_ENV != "test":
        raise HTTPException(503, "Configure Supabase DATABASE_URL and apply the schema. Legacy SQLite is read-only until migration.")
    async with AsyncSessionLocal() as session:
        yield session
