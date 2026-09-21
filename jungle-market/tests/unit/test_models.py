import pytest
from jungle_market.infrastructure.database.models.base import Base
from jungle_market.infrastructure.database.models.user import User, ArtisanProfile
from jungle_market.infrastructure.database.models.product import Product, ProductMedia
from jungle_market.infrastructure.database.models.consent import ConsentRecord, DeletionRequest

def test_models_import():
    # If the import works without syntax or resolution errors, this test will pass.
    assert User.__tablename__ == "users"
    assert ArtisanProfile.__tablename__ == "artisan_profiles"
    assert Product.__tablename__ == "products"
    assert ProductMedia.__tablename__ == "product_media"
    assert ConsentRecord.__tablename__ == "consent_records"
    assert DeletionRequest.__tablename__ == "deletion_requests"
