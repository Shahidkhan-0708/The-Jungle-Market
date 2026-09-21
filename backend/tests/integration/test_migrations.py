from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect

from jungle_market.core.config import get_settings


def test_fresh_database_upgrade(tmp_path, monkeypatch):
    database_path = tmp_path / "migration.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{database_path.as_posix()}")
    get_settings.cache_clear()
    try:
        command.upgrade(Config("alembic.ini"), "head")
        tables = set(
            inspect(create_engine(f"sqlite:///{database_path.as_posix()}")).get_table_names()
        )
        assert {"products", "product_appraisals", "processing_jobs"} <= tables
    finally:
        get_settings.cache_clear()
