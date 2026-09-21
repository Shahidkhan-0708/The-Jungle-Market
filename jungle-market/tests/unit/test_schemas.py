import pytest
from uuid import uuid4
from jungle_market.domain.schemas.product_record import ProductRecord, CategoryEvidence
from jungle_market.domain.enums.product import FactSource, VerificationState

def test_product_record_schema():
    record = ProductRecord(
        product_id=uuid4(),
        artisan_id=uuid4(),
        category=CategoryEvidence(
            value="basket",
            source=FactSource.VISION,
            confidence=0.95,
            verification_state=VerificationState.PENDING
        ),
        materials=[]
    )
    assert record.category.value == "basket"
    assert record.category.source == FactSource.VISION
    assert record.has_conflicts is False
