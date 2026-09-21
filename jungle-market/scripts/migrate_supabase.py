"""Apply the private Supabase schema; optionally copy legacy SQLite records without deleting them."""
import argparse
import asyncio
import json
import sys
from datetime import datetime
from pathlib import Path
from uuid import UUID

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from sqlalchemy import create_engine, MetaData, select, text, inspect, DateTime, Uuid
from sqlalchemy.dialects.postgresql import insert
from jungle_market.core.config import settings
from jungle_market.infrastructure.database.session import engine
from jungle_market.infrastructure.database.models.base import Base
from jungle_market.infrastructure.database.models import user, product, order, consent, workflow


async def migrate(source=None):
    if engine.dialect.name != "postgresql":
        raise SystemExit("Set DATABASE_URL to the Supabase session-pooler PostgreSQL URL first. SQLite will not be modified.")
    async with engine.begin() as connection:
        await connection.execute(text("CREATE SCHEMA IF NOT EXISTS jungle_market"))
        await connection.execute(text("SET LOCAL search_path TO jungle_market, public"))
        await connection.run_sync(Base.metadata.create_all)
        # The browser uses the authenticated local API, not direct table writes.
        # No permissive RLS policies: anon/authenticated cannot bypass API ownership gates.
        for table in Base.metadata.sorted_tables:
            await connection.execute(text(f'ALTER TABLE jungle_market."{table.name}" ENABLE ROW LEVEL SECURITY'))
            await connection.execute(text(f'REVOKE ALL ON jungle_market."{table.name}" FROM anon, authenticated'))
        await connection.execute(text("REVOKE ALL ON SCHEMA jungle_market FROM anon, authenticated"))
    print("Schema ready; browser table access denied. Server-side API enforces account ownership.")
    if source:
        path = Path(source).resolve()
        if not path.is_file():
            raise SystemExit("Legacy SQLite file does not exist.")
        source_engine = create_engine("sqlite:///file:" + path.as_posix() + "?mode=ro&uri=true")
        legacy = MetaData()
        legacy.reflect(bind=source_engine)
        counts = {}
        async with engine.begin() as destination:
            for table in Base.metadata.sorted_tables:
                if table.name not in legacy.tables:
                    continue
                with source_engine.connect() as origin:
                    rows = origin.execute(select(legacy.tables[table.name])).mappings().all()
                for original in rows:
                    row = {key: value for key, value in original.items() if key in table.c}
                    for column in table.c:
                        value = row.get(column.name)
                        if value is not None and isinstance(column.type, Uuid) and not isinstance(value, UUID):
                            row[column.name] = UUID(str(value))
                        if value is not None and isinstance(column.type, DateTime) and isinstance(value, str):
                            row[column.name] = datetime.fromisoformat(value)
                    # Legacy sample verification is not valid human review evidence.
                    if table.name == "products":
                        row["status"] = "DRAFT"
                        row["needs_ambassador_review"] = True
                    statement = insert(table).values(**row).on_conflict_do_nothing(index_elements=[c.name for c in table.primary_key])
                    await destination.execute(statement)
                counts[table.name] = len(rows)
        source_engine.dispose()
        print(json.dumps({"source_rows_processed": counts, "legacy_file": "unchanged",
                          "legacy_products": "drafts requiring ownership mapping and review"}))
    await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--legacy-sqlite", help="Read-only source; use only after backing up and checking account ownership.")
    arguments = parser.parse_args()
    try:
        asyncio.run(migrate(arguments.legacy_sqlite))
    except Exception as error:
        # Driver messages may contain connection parameters: don't print secrets.
        print(f"Migration failed ({type(error).__name__}). Verify Supabase URL/password, SSL and schema permissions.")
        sys.exit(1)

