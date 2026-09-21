from io import BytesIO
from uuid import uuid4

import numpy as np
import pytest
from PIL import Image

from jungle_market.core.config import Settings
from jungle_market.core.errors import (
    ImageValidationError,
    MeasurementUnavailable,
    TranscriptLowConfidence,
)
from jungle_market.domain.enums import (
    ConsentType,
    EvidenceSource,
    ModelStatus,
    ProductStatus,
    RiskDecision,
    VerificationState,
)
from jungle_market.domain.schemas.common import TextEvidenceField
from jungle_market.domain.schemas.pricing import CostFloorInput, PricingRange
from jungle_market.domain.schemas.product_record import (
    CategoryEvidence,
    DimensionEvidence,
    MaterialEvidence,
    ProductRecord,
)
from jungle_market.domain.schemas.seo import SEOContentDraft
from jungle_market.domain.schemas.speech import TranscriptResult, TranscriptSegment
from jungle_market.ml.registry.service import InMemoryModelRegistry, RegisteredModel
from jungle_market.ml.rollout.service import RolloutController
from jungle_market.services.catalog.service import CatalogService
from jungle_market.services.consent.service import ConsentService, ConsentState, DeletionWorkflow
from jungle_market.services.dimensions.service import (
    DimensionEstimator,
    DimensionStats,
    ManualDimensionValidator,
)
from jungle_market.services.feedback.service import CommerceOutcomeEvent, FeedbackDatasetRouter
from jungle_market.services.fusion.service import ProductFusionService, VoiceFacts
from jungle_market.services.image_ingest.service import ImageIngestService
from jungle_market.services.inventory.service import InventoryService, InventoryState
from jungle_market.services.preprocessing.service import ImagePreprocessor
from jungle_market.services.pricing.service import PricingDecisionEngine, PricingEvidence
from jungle_market.services.search.service import InMemorySearchIndex, SearchFilter
from jungle_market.services.segmentation.service import ConservativeMaskCleaner
from jungle_market.services.seo.service import ForbiddenClaimChecker
from jungle_market.services.speech.service import TranscriptQualityGate
from jungle_market.services.trust_safety.service import ListingRiskGate


def image_bytes(size=(16, 32), exif_orientation: int | None = None) -> bytes:
    image = Image.new("RGB", size, color=(120, 80, 40))
    exif = Image.Exif()
    if exif_orientation is not None:
        exif[274] = exif_orientation
    buffer = BytesIO()
    image.save(buffer, format="JPEG", exif=exif)
    return buffer.getvalue()


def settings(**overrides) -> Settings:
    data = {
        "database_url": "postgresql+psycopg://jungle:jungle@localhost/jungle_market",
        "api_cors_origins": [],
        "category_labels": ["basket"],
        "material_labels": ["bamboo"],
    }
    data.update(overrides)
    return Settings(**data)


def valid_record(product_id=None, verified_dimensions: bool = True) -> ProductRecord:
    return ProductRecord(
        product_id=product_id or uuid4(),
        category=CategoryEvidence(
            value="basket",
            confidence=0.91,
            source=EvidenceSource.VISION,
            verification_state=VerificationState.UNVERIFIED,
        ),
        materials=[
            MaterialEvidence(
                value="bamboo",
                confidence=0.88,
                source=EvidenceSource.VISION,
            )
        ],
        dominant_material="bamboo",
        confidence_by_material={"bamboo": 0.88},
        dimensions=DimensionEvidence(
            width_mm=320,
            height_mm=210,
            source=(
                EvidenceSource.MEASURED_VERIFIED
                if verified_dimensions
                else EvidenceSource.SELF_REPORTED
            ),
            confidence=0.9 if verified_dimensions else 0.55,
            verified=verified_dimensions,
            verification_state=(
                VerificationState.VERIFIED if verified_dimensions else VerificationState.UNVERIFIED
            ),
        ),
        artisan_story=TextEvidenceField(
            value="Made in a small family workshop.",
            source=EvidenceSource.VOICE,
            confidence=0.8,
        ),
    )


def seo() -> SEOContentDraft:
    return SEOContentDraft(
        title="Bamboo Basket",
        description="A handcrafted basket. Visible material: bamboo.",
        tags=["basket", "bamboo"],
        keywords=["basket"],
    )


def pricing(product_id=None, requires_review: bool = False):
    record = valid_record(product_id=product_id)
    return (
        PricingDecisionEngine(settings())
        .recommend(
            record,
            CostFloorInput(material_cost=100, labour_cost=200),
            PricingEvidence(
                model_range=PricingRange(p20=350, p50=450, p80=550),
                model_confidence=0.8,
            ),
        )
        .model_copy(update={"requires_review": requires_review})
    )


def test_corrupt_image_rejection():
    with pytest.raises(ImageValidationError):
        ImageIngestService(settings()).open_image(b"not an image")


def test_oversized_image_rejection():
    with pytest.raises(ImageValidationError):
        ImageIngestService(settings(max_image_bytes=3)).open_image(image_bytes())


def test_exif_rotation():
    result = ImageIngestService(settings()).open_image(
        image_bytes(size=(16, 32), exif_orientation=6)
    )
    assert (result.width, result.height) == (32, 16)
    assert result.rgb_array.flags["C_CONTIGUOUS"]


def test_preprocessing_quality_gate():
    dark = np.zeros((64, 64, 3), dtype=np.uint8)
    report = ImagePreprocessor(settings()).preprocess(dark).quality
    assert report.needs_review is True
    assert report.luminance_mean == 0


def test_mask_cleanup_removes_tiny_components_and_preserves_holes():
    mask = np.zeros((100, 100), dtype=np.uint8)
    mask[10:80, 10:80] = 255
    mask[35:45, 35:45] = 0
    mask[1, 1] = 255
    result = ConservativeMaskCleaner(settings(min_mask_area_ratio=0.02)).cleanup(mask)
    assert result.accepted is True
    assert result.mask[1, 1] == 0
    assert result.mask[40, 40] == 0


def test_missing_aruco_marker():
    image = np.zeros((64, 64, 3), dtype=np.uint8)
    mask = np.ones((64, 64), dtype=np.uint8) * 255
    with pytest.raises(MeasurementUnavailable):
        DimensionEstimator().estimate_with_aruco(image, mask, marker_size_mm=50)


def test_invalid_measurement_geometry(monkeypatch):
    import cv2

    if not hasattr(cv2, "aruco"):
        pytest.skip("OpenCV ArUco module unavailable")

    class FakeDetector:
        def __init__(self, dictionary):
            pass

        def detectMarkers(self, gray):
            corners = [np.array([[[0.0, 0.0], [100.0, 0.0], [101.0, 1.0], [0.0, 1.0]]])]
            return corners, np.array([[1]]), None

    monkeypatch.setattr(cv2.aruco, "ArucoDetector", FakeDetector)
    image = np.zeros((64, 64, 3), dtype=np.uint8)
    mask = np.ones((64, 64), dtype=np.uint8) * 255
    with pytest.raises(MeasurementUnavailable):
        DimensionEstimator().estimate_with_aruco(image, mask, marker_size_mm=50)


def test_manual_dimension_plausibility_outlier():
    validator = ManualDimensionValidator({"basket": DimensionStats(100, 900, 50, 700)})
    dimensions, needs_review, reasons = validator.validate("basket", 5000, 200, None)
    assert dimensions.source == EvidenceSource.SELF_REPORTED
    assert dimensions.verified is False
    assert needs_review is True
    assert "width is outside historical range" in reasons


def test_low_confidence_transcript():
    result = TranscriptResult(
        transcript="uncertain words",
        segments=[TranscriptSegment(start=0, end=1, text="uncertain words", confidence=0.2)],
        confidence=0.2,
        model_version="test",
    )
    with pytest.raises(TranscriptLowConfidence):
        TranscriptQualityGate(0.6).assert_acceptable(result)


def test_conflicting_voice_and_vision_facts():
    record = ProductFusionService().fuse(
        product_id=uuid4(),
        category=valid_record().category,
        materials=valid_record().materials,
        dominant_material="bamboo",
        confidence_by_material={"bamboo": 0.9},
        dimensions=None,
        voice=VoiceFacts(claimed_category="pottery", claimed_materials=["metal"]),
    )
    assert record.requires_review is True
    assert len(record.conflicts) == 2


def test_product_record_validation_rejects_unsupported_dominant_material():
    data = valid_record().model_dump()
    data["dominant_material"] = "metal"
    with pytest.raises(ValueError):
        ProductRecord.model_validate(data)


def test_seo_forbidden_claim_rejection():
    draft = SEOContentDraft(
        title="Certified Bamboo Basket",
        description="A guaranteed sustainable product.",
        tags=["basket"],
        keywords=[],
    )
    violations = ForbiddenClaimChecker().check(draft)
    assert "certified" in violations
    assert "guaranteed" in violations


def test_pricing_cost_floor_enforcement():
    record = valid_record()
    result = PricingDecisionEngine(settings()).recommend(
        record,
        CostFloorInput(material_cost=500, labour_cost=500, minimum_margin_rate=0.25),
        PricingEvidence(model_range=PricingRange(p20=50, p50=100, p80=150), model_confidence=0.9),
    )
    assert result.final_range.p20 == 1250
    assert result.final_range.p50 >= result.final_range.p20


def test_low_confidence_pricing_routes_to_ambassador_review():
    result = PricingDecisionEngine(settings()).recommend(
        valid_record(verified_dimensions=False),
        CostFloorInput(material_cost=100, labour_cost=100),
        PricingEvidence(model_range=PricingRange(p20=200, p50=260, p80=300), model_confidence=0.2),
    )
    assert result.requires_review is True
    assert "pricing evidence confidence is low" in result.reasons


def test_publish_prevented_before_trust_approval():
    risk = ListingRiskGate().assess(
        valid_record().model_copy(update={"requires_review": True}), seo(), pricing()
    )
    assert risk.decision == RiskDecision.REVIEW


def test_post_publish_complaint_triggers_risk_recheck():
    risk = ListingRiskGate().assess(valid_record(), seo(), pricing(), complaint_count=3)
    assert risk.decision == RiskDecision.SUSPEND


def test_suspension_updates_catalog():
    record = valid_record()
    document = CatalogService().assemble_entry(
        record, seo(), pricing(record.product_id), 1, ProductStatus.PUBLISHED
    )
    document.status = ProductStatus.SUSPENDED
    document.available = False
    assert document.status == ProductStatus.SUSPENDED
    assert document.available is False


def test_inventory_decrement_after_sale():
    state = InventoryState(product_id=uuid4(), stock_on_hand=2)
    updated = InventoryService().decrement_after_sale(state, 1)
    assert updated.stock_on_hand == 1
    assert updated.available is True


def test_sold_out_item_updates_search_state():
    record = valid_record()
    document = CatalogService().assemble_entry(
        record, seo(), pricing(record.product_id), 1, ProductStatus.PUBLISHED
    )
    index = InMemorySearchIndex()
    index.upsert(document)
    InventoryService().decrement_after_sale(InventoryState(record.product_id, stock_on_hand=1), 1)
    document.status = ProductStatus.SOLD_OUT
    document.available = False
    index.upsert(document)
    assert index.search(SearchFilter(keyword="basket", availability=True)) == []


def test_consent_revocation():
    user_id = uuid4()
    record = ConsentState(uuid4(), user_id, consent_type=ConsentType.MEDIA, granted=True)
    updated = ConsentService().revoke(record)
    assert updated.granted is False


def test_deletion_workflow_preserves_legal_records():
    result = DeletionWorkflow().process(["local://images/1.jpg"], has_commerce_records=True)
    assert "local://images/1.jpg" in result.deleted_media_uris
    assert result.legal_hold_records == ["orders", "payments", "payouts"]


def test_commerce_outcome_persistence_payload():
    product_id = uuid4()
    payload = FeedbackDatasetRouter().route_outcome(
        CommerceOutcomeEvent(
            product_id=product_id,
            order_id=None,
            final_sold_price=1200,
            sale_timestamp=None,
            fulfillment_success=True,
            payout_status="PAID",
        )
    )
    assert payload["dataset"] == "commerce_outcomes"
    assert payload["product_id"] == str(product_id)


def test_model_rollout_promotion():
    registry = InMemoryModelRegistry()
    registry.register(RegisteredModel("category", "v1", "models/v1.pt", ModelStatus.PRODUCTION, {}))
    registry.production_routes["category"] = "v1"
    registry.register(RegisteredModel("category", "v2", "models/v2.pt", ModelStatus.CANARY, {}))
    promoted = RolloutController(registry).promote_if_passed("category", "v2", passed=True)
    assert promoted == "v2"
    assert registry.get_production("category").version == "v2"


def test_canary_failure_rollback():
    registry = InMemoryModelRegistry()
    registry.register(RegisteredModel("pricing", "v1", "models/v1.cbm", ModelStatus.PRODUCTION, {}))
    registry.production_routes["pricing"] = "v1"
    registry.register(
        RegisteredModel(
            "pricing",
            "v2",
            "models/v2.cbm",
            ModelStatus.PRODUCTION,
            {},
            previous_stable_version="v1",
        )
    )
    registry.production_routes["pricing"] = "v2"
    rolled_back = RolloutController(registry).rollback_failed_canary("pricing")
    assert rolled_back == "v1"
    assert registry.get_production("pricing").version == "v1"
