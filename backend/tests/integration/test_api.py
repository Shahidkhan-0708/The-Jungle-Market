from io import BytesIO
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from apps.api.dependencies import get_current_principal, get_db
from apps.api.main import app
from jungle_market.core.security import Principal
from jungle_market.domain.enums import EvidenceSource, ProductStatus, VerificationState
from jungle_market.domain.models import *  # noqa: F403
from jungle_market.domain.models.base import Base
from jungle_market.domain.models.catalog import CatalogEntry
from jungle_market.domain.models.pricing import PriceRecommendation
from jungle_market.domain.models.products import Product, ProductMedia
from jungle_market.domain.models.seo import SEOContent
from jungle_market.domain.schemas.product_record import CategoryEvidence, ProductRecord
from jungle_market.infrastructure.storage.local import LocalFilesystemStorage


@pytest.fixture
def database(tmp_path):
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    testing_session = sessionmaker(bind=engine, expire_on_commit=False)

    def override_db():
        with testing_session() as session:
            yield session

    app.dependency_overrides[get_db] = override_db
    app.state.storage = LocalFilesystemStorage(tmp_path / "media")
    yield testing_session
    app.dependency_overrides.clear()
    engine.dispose()


def principal(role: str, user_id=None) -> Principal:
    user_id = user_id or uuid4()
    return Principal(
        user_id=user_id,
        roles={role},
        email=f"{user_id}@example.com",
        full_name="Test User",
    )


def authenticate(as_principal: Principal) -> None:
    app.dependency_overrides[get_current_principal] = lambda: as_principal


def image_bytes() -> bytes:
    buffer = BytesIO()
    Image.new("RGB", (16, 16), color="green").save(buffer, format="JPEG")
    return buffer.getvalue()


def test_authentication_is_required(database):
    response = TestClient(app).post("/v1/products", json={"title": "Basket"})
    assert response.status_code == 401


def test_product_ownership_and_persistence(database):
    owner = principal("ARTISAN")
    authenticate(owner)
    client = TestClient(app)
    created = client.post("/v1/products", json={"title": "Basket", "stock_on_hand": 2})
    assert created.status_code == 200
    product_id = created.json()["id"]

    with database() as db:
        assert db.get(Product, UUID(product_id)).title == "Basket"

    authenticate(principal("ARTISAN"))
    denied = client.patch(f"/v1/products/{product_id}", json={"title": "Stolen"})
    assert denied.status_code == 403


def test_upload_requires_consent_and_persists_media(database):
    artisan = principal("ARTISAN")
    authenticate(artisan)
    client = TestClient(app)
    product_id = client.post("/v1/products", json={"title": "Basket"}).json()["id"]
    missing = client.post(
        "/v1/media/image",
        data={"uploader_user_id": str(artisan.user_id), "product_id": product_id},
        files={"file": ("basket.jpg", image_bytes(), "image/jpeg")},
    )
    assert missing.status_code == 400

    consent = client.post(
        "/v1/consent",
        json={
            "subject_user_id": str(artisan.user_id),
            "consent_type": "media",
            "granted": True,
        },
    )
    assert consent.status_code == 200
    uploaded = client.post(
        "/v1/media/image",
        data={"uploader_user_id": str(artisan.user_id), "product_id": product_id},
        files={"file": ("basket.jpg", image_bytes(), "image/jpeg")},
    )
    assert uploaded.status_code == 200
    with database() as db:
        media = db.scalar(select(ProductMedia).where(ProductMedia.product_id == UUID(product_id)))
        assert media is not None
        assert media.byte_size > 0


def test_publish_uses_risk_gate_and_persists_catalog(database):
    artisan = principal("ARTISAN")
    authenticate(artisan)
    client = TestClient(app)
    product_id = client.post(
        "/v1/products", json={"title": "Bamboo Basket", "stock_on_hand": 1}
    ).json()["id"]
    blocked = client.post(f"/v1/products/{product_id}/publish")
    assert blocked.status_code == 404

    with database() as db:
        product = db.get(Product, UUID(product_id))
        product.product_record = ProductRecord(
            product_id=product.id,
            category=CategoryEvidence(
                value="basket",
                confidence=0.95,
                source=EvidenceSource.VISION,
                verification_state=VerificationState.VERIFIED,
            ),
        ).model_dump(mode="json")
        db.add(
            SEOContent(
                product_id=product.id,
                title="Handwoven Bamboo Basket",
                description="A handwoven bamboo basket made by a local artisan.",
                tags=["basket"],
                keywords=["bamboo"],
                passed_forbidden_claim_check=True,
            )
        )
        db.add(
            PriceRecommendation(
                product_id=product.id,
                final_p20=900,
                final_p50=1100,
                final_p80=1300,
                cost_floor=800,
                currency="INR",
                confidence=0.9,
                requires_review=False,
                reasons=[],
            )
        )
        db.commit()

    published = client.post(f"/v1/products/{product_id}/publish")
    assert published.status_code == 200
    assert published.json()["status"] == ProductStatus.PUBLISHED
    with database() as db:
        catalog = db.scalar(select(CatalogEntry).where(CatalogEntry.product_id == UUID(product_id)))
        assert catalog is not None
        assert catalog.available is True


def test_ambassador_routes_reject_buyers(database):
    authenticate(principal("BUYER"))
    response = TestClient(app).get("/v1/reviews/ambassador/queue")
    assert response.status_code == 403
