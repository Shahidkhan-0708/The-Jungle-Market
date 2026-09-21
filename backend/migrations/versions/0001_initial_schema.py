"""initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-09-14
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0001_initial_schema"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _id() -> sa.Column:
    return sa.Column("id", sa.Uuid(), primary_key=True)


def _timestamps() -> tuple[sa.Column, sa.Column]:
    return (
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def _enum(*values: str, name: str) -> sa.Enum:
    return sa.Enum(*values, name=name, native_enum=False)


def upgrade() -> None:
    op.create_table(
        "roles",
        _id(),
        sa.Column("name", sa.String(64), nullable=False, unique=True),
        sa.Column("description", sa.String(255)),
        *_timestamps(),
    )
    op.create_table(
        "users",
        _id(),
        sa.Column("email", sa.String(320), nullable=False, unique=True),
        sa.Column("full_name", sa.String(255)),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        *_timestamps(),
    )
    op.create_table(
        "artisan_profiles",
        _id(),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("display_name", sa.String(255), nullable=False),
        sa.Column("region", sa.String(128)),
        sa.Column("craft_specialty", sa.String(128)),
        *_timestamps(),
    )
    op.create_table(
        "buyer_profiles",
        _id(),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("default_region", sa.String(128)),
        *_timestamps(),
    )
    op.create_table(
        "products",
        _id(),
        sa.Column("artisan_id", sa.Uuid(), sa.ForeignKey("artisan_profiles.id")),
        sa.Column(
            "status",
            _enum(
                "DRAFT",
                "AI_PROCESSING",
                "NEEDS_REVIEW",
                "VERIFIED",
                "RISK_REVIEW",
                "PUBLISHED",
                "SUSPENDED",
                "SOLD_OUT",
                "ARCHIVED",
                name="productstatus",
            ),
            nullable=False,
            server_default="DRAFT",
        ),
        sa.Column("title", sa.String(140)),
        sa.Column("product_record", sa.JSON()),
        sa.Column("review_required_reason", sa.Text()),
        *_timestamps(),
    )
    op.create_index("ix_products_status_created_at", "products", ["status", "created_at"])
    op.create_table(
        "consent_records",
        _id(),
        sa.Column("subject_user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column(
            "consent_type",
            _enum("media", "voice", "data_processing", name="consenttype"),
            nullable=False,
        ),
        sa.Column("granted", sa.Boolean(), nullable=False),
        sa.Column("retention_preference", sa.String(64)),
        sa.Column("revoked_reason", sa.String(500)),
        *_timestamps(),
    )
    op.create_table(
        "deletion_requests",
        _id(),
        sa.Column("subject_user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column(
            "status",
            _enum(
                "RECEIVED",
                "PROCESSING",
                "COMPLETED",
                "PARTIAL_LEGAL_HOLD",
                name="deletionrequeststatus",
            ),
            nullable=False,
            server_default="RECEIVED",
        ),
        sa.Column("reason", sa.String(500)),
        sa.Column("result_summary", sa.String(1000)),
        *_timestamps(),
    )
    op.create_table(
        "product_media",
        _id(),
        sa.Column("product_id", sa.Uuid(), sa.ForeignKey("products.id")),
        sa.Column("uploader_user_id", sa.Uuid(), sa.ForeignKey("users.id")),
        sa.Column("media_type", sa.String(32), nullable=False),
        sa.Column("storage_uri", sa.String(1000), nullable=False),
        sa.Column("checksum_sha256", sa.String(64)),
        sa.Column("consent_record_id", sa.Uuid(), sa.ForeignKey("consent_records.id")),
        sa.Column("byte_size", sa.Integer()),
        sa.Column("width_px", sa.Integer()),
        sa.Column("height_px", sa.Integer()),
        sa.Column("deleted_or_anonymized", sa.Boolean(), nullable=False, server_default=sa.false()),
        *_timestamps(),
    )
    op.create_index("ix_product_media_checksum_sha256", "product_media", ["checksum_sha256"])
    op.create_table(
        "product_predictions",
        _id(),
        sa.Column("product_id", sa.Uuid(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("prediction_type", sa.String(64), nullable=False),
        sa.Column("value", sa.JSON(), nullable=False),
        sa.Column("confidence", sa.Float()),
        sa.Column("model_name", sa.String(128)),
        sa.Column("model_version", sa.String(128)),
        sa.Column(
            "verification_state",
            _enum("unverified", "verified", "rejected", "needs_review", name="verificationstate"),
            nullable=False,
            server_default="unverified",
        ),
        *_timestamps(),
    )
    op.create_table(
        "product_field_evidence",
        _id(),
        sa.Column("product_id", sa.Uuid(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("field_name", sa.String(128), nullable=False),
        sa.Column("value", sa.JSON(), nullable=False),
        sa.Column("source", sa.String(64), nullable=False),
        sa.Column("confidence", sa.Float()),
        sa.Column("model_version", sa.String(128)),
        sa.Column(
            "verification_state",
            _enum("unverified", "verified", "rejected", "needs_review", name="verificationstate2"),
            nullable=False,
            server_default="unverified",
        ),
        *_timestamps(),
    )
    op.create_table(
        "product_dimensions",
        _id(),
        sa.Column("product_id", sa.Uuid(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("width_mm", sa.Float()),
        sa.Column("height_mm", sa.Float()),
        sa.Column("depth_mm", sa.Float()),
        sa.Column("source", sa.String(64), nullable=False),
        sa.Column("confidence", sa.Float()),
        sa.Column("verified", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("plausibility_result", sa.JSON()),
        *_timestamps(),
    )
    op.create_table(
        "inventory",
        _id(),
        sa.Column("product_id", sa.Uuid(), sa.ForeignKey("products.id"), nullable=False, unique=True),
        sa.Column("stock_on_hand", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("stock_reserved", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("allow_backorder", sa.Boolean(), nullable=False, server_default=sa.false()),
        *_timestamps(),
    )
    op.create_table(
        "catalog_entries",
        _id(),
        sa.Column("product_id", sa.Uuid(), sa.ForeignKey("products.id"), nullable=False, unique=True),
        sa.Column(
            "status",
            _enum(
                "DRAFT",
                "AI_PROCESSING",
                "NEEDS_REVIEW",
                "VERIFIED",
                "RISK_REVIEW",
                "PUBLISHED",
                "SUSPENDED",
                "SOLD_OUT",
                "ARCHIVED",
                name="catalogproductstatus",
            ),
            nullable=False,
            server_default="DRAFT",
        ),
        sa.Column("title", sa.String(140), nullable=False),
        sa.Column("category", sa.String(128)),
        sa.Column("dominant_material", sa.String(128)),
        sa.Column("region", sa.String(128)),
        sa.Column("price", sa.Float()),
        sa.Column("currency", sa.String(3), nullable=False, server_default="INR"),
        sa.Column("available", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("search_vector_text", sa.String(2000)),
        *_timestamps(),
    )
    op.create_index("ix_catalog_entries_category", "catalog_entries", ["category"])
    op.create_index("ix_catalog_entries_dominant_material", "catalog_entries", ["dominant_material"])
    op.create_index("ix_catalog_entries_region", "catalog_entries", ["region"])
    op.create_index("ix_catalog_search", "catalog_entries", ["status", "available", "category"])
    op.create_table(
        "seo_content",
        _id(),
        sa.Column("product_id", sa.Uuid(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("title", sa.String(90), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("tags", sa.JSON(), nullable=False),
        sa.Column("keywords", sa.JSON(), nullable=False),
        sa.Column("passed_forbidden_claim_check", sa.Boolean(), nullable=False, server_default=sa.false()),
        *_timestamps(),
    )
    op.create_table(
        "price_predictions",
        _id(),
        sa.Column("product_id", sa.Uuid(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("model_name", sa.String(128), nullable=False),
        sa.Column("model_version", sa.String(128), nullable=False),
        sa.Column("p20", sa.Float(), nullable=False),
        sa.Column("p50", sa.Float(), nullable=False),
        sa.Column("p80", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="INR"),
        sa.Column("feature_payload", sa.JSON(), nullable=False),
        *_timestamps(),
    )
    op.create_table(
        "price_recommendations",
        _id(),
        sa.Column("product_id", sa.Uuid(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("final_p20", sa.Float(), nullable=False),
        sa.Column("final_p50", sa.Float(), nullable=False),
        sa.Column("final_p80", sa.Float(), nullable=False),
        sa.Column("cost_floor", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="INR"),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("requires_review", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("reasons", sa.JSON(), nullable=False),
        *_timestamps(),
    )
    op.create_table(
        "ambassador_reviews",
        _id(),
        sa.Column("product_id", sa.Uuid(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column(
            "status",
            _enum("OPEN", "APPROVED", "REJECTED", "CORRECTED", name="reviewstatus"),
            nullable=False,
            server_default="OPEN",
        ),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("payload", sa.JSON()),
        sa.Column("assigned_to_user_id", sa.Uuid(), sa.ForeignKey("users.id")),
        *_timestamps(),
    )
    op.create_table(
        "ambassador_corrections",
        _id(),
        sa.Column("review_id", sa.Uuid(), sa.ForeignKey("ambassador_reviews.id"), nullable=False),
        sa.Column("product_id", sa.Uuid(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("corrected_by_user_id", sa.Uuid(), sa.ForeignKey("users.id")),
        sa.Column("field_name", sa.String(128), nullable=False),
        sa.Column("old_value", sa.JSON()),
        sa.Column("new_value", sa.JSON(), nullable=False),
        sa.Column("note", sa.Text()),
        *_timestamps(),
    )
    op.create_table(
        "buyer_reviews",
        _id(),
        sa.Column("product_id", sa.Uuid(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("buyer_id", sa.Uuid(), sa.ForeignKey("buyer_profiles.id"), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("comment", sa.Text()),
        sa.Column("complaint_flag", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("abuse_score", sa.Float()),
        *_timestamps(),
    )
    op.create_table(
        "orders",
        _id(),
        sa.Column("buyer_id", sa.Uuid(), sa.ForeignKey("buyer_profiles.id"), nullable=False),
        sa.Column(
            "status",
            _enum(
                "CREATED",
                "PAID",
                "FULFILLING",
                "COMPLETED",
                "CANCELLED",
                "REFUNDED",
                name="orderstatus",
            ),
            nullable=False,
            server_default="CREATED",
        ),
        sa.Column("total_amount", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="INR"),
        *_timestamps(),
    )
    op.create_table(
        "order_items",
        _id(),
        sa.Column("order_id", sa.Uuid(), sa.ForeignKey("orders.id"), nullable=False),
        sa.Column("product_id", sa.Uuid(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Float(), nullable=False),
        *_timestamps(),
    )
    op.create_table(
        "payment_records",
        _id(),
        sa.Column("order_id", sa.Uuid(), sa.ForeignKey("orders.id"), nullable=False),
        sa.Column(
            "status",
            _enum("PENDING", "AUTHORIZED", "CAPTURED", "FAILED", "REFUNDED", name="paymentstatus"),
            nullable=False,
            server_default="PENDING",
        ),
        sa.Column("provider", sa.String(128)),
        sa.Column("provider_reference", sa.String(255)),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="INR"),
        *_timestamps(),
    )
    op.create_table(
        "shipments",
        _id(),
        sa.Column("order_id", sa.Uuid(), sa.ForeignKey("orders.id"), nullable=False),
        sa.Column(
            "status",
            _enum("PENDING", "PACKED", "SHIPPED", "DELIVERED", "RETURNED", name="fulfillmentstatus"),
            nullable=False,
            server_default="PENDING",
        ),
        sa.Column("carrier", sa.String(128)),
        sa.Column("tracking_reference", sa.String(255)),
        *_timestamps(),
    )
    op.create_table(
        "payouts",
        _id(),
        sa.Column("order_id", sa.Uuid(), sa.ForeignKey("orders.id"), nullable=False),
        sa.Column("artisan_id", sa.Uuid(), sa.ForeignKey("artisan_profiles.id"), nullable=False),
        sa.Column("status", sa.String(64), nullable=False, server_default="PENDING"),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="INR"),
        *_timestamps(),
    )
    op.create_table(
        "commerce_outcomes",
        _id(),
        sa.Column("product_id", sa.Uuid(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("order_id", sa.Uuid(), sa.ForeignKey("orders.id")),
        sa.Column("final_sold_price", sa.Float()),
        sa.Column("sale_timestamp", sa.DateTime(timezone=True)),
        sa.Column("time_to_sale_hours", sa.Integer()),
        sa.Column("returned_or_refunded", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("fulfillment_success", sa.Boolean()),
        sa.Column("cancellation_reason", sa.String(255)),
        sa.Column("stockout", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("payout_status", sa.String(64)),
        *_timestamps(),
    )
    op.create_table(
        "market_observations",
        _id(),
        sa.Column("category", sa.String(128), nullable=False),
        sa.Column("material", sa.String(128)),
        sa.Column("source", sa.String(128), nullable=False),
        sa.Column("observed_price", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="INR"),
        sa.Column("observed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("similarity_score", sa.Float(), nullable=False),
        sa.Column("raw_payload", sa.JSON()),
        *_timestamps(),
    )
    op.create_index("ix_market_observations_category", "market_observations", ["category"])
    op.create_index("ix_market_observations_material", "market_observations", ["material"])
    op.create_table(
        "market_snapshots",
        _id(),
        sa.Column("category", sa.String(128), nullable=False),
        sa.Column("material", sa.String(128)),
        sa.Column("currency", sa.String(3), nullable=False, server_default="INR"),
        sa.Column("p20", sa.Float(), nullable=False),
        sa.Column("p50", sa.Float(), nullable=False),
        sa.Column("p80", sa.Float(), nullable=False),
        sa.Column("observation_count", sa.Integer(), nullable=False),
        sa.Column("source_summary", sa.JSON(), nullable=False),
        *_timestamps(),
    )
    op.create_index("ix_market_snapshots_category", "market_snapshots", ["category"])
    op.create_index("ix_market_snapshots_material", "market_snapshots", ["material"])
    op.create_table(
        "model_versions",
        _id(),
        sa.Column("model_name", sa.String(128), nullable=False),
        sa.Column("version", sa.String(128), nullable=False),
        sa.Column("artifact_uri", sa.String(1000), nullable=False),
        sa.Column("metrics", sa.JSON(), nullable=False),
        sa.Column(
            "status",
            _enum("CANDIDATE", "SHADOW", "CANARY", "PRODUCTION", "RETIRED", name="modelstatus"),
            nullable=False,
            server_default="CANDIDATE",
        ),
        sa.Column("promoted_at", sa.DateTime(timezone=True)),
        sa.Column("previous_stable_version_id", sa.Uuid(), sa.ForeignKey("model_versions.id")),
        *_timestamps(),
    )
    op.create_index("ix_model_versions_model_name", "model_versions", ["model_name"])
    op.create_table(
        "model_evaluations",
        _id(),
        sa.Column("model_version_id", sa.Uuid(), sa.ForeignKey("model_versions.id"), nullable=False),
        sa.Column("dataset_version", sa.String(128), nullable=False),
        sa.Column("metrics", sa.JSON(), nullable=False),
        sa.Column("passed", sa.Boolean(), nullable=False, server_default=sa.false()),
        *_timestamps(),
    )
    op.create_table(
        "deployment_events",
        _id(),
        sa.Column("model_version_id", sa.Uuid(), sa.ForeignKey("model_versions.id"), nullable=False),
        sa.Column(
            "stage",
            _enum("CANDIDATE", "SHADOW", "CANARY", "PRODUCTION", "ROLLBACK", name="deploymentstage"),
            nullable=False,
        ),
        sa.Column("event_payload", sa.JSON(), nullable=False),
        *_timestamps(),
    )
    op.create_table(
        "risk_events",
        _id(),
        sa.Column("product_id", sa.Uuid(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("event_type", sa.String(128), nullable=False),
        sa.Column("severity", sa.Float(), nullable=False),
        sa.Column("payload", sa.JSON()),
        *_timestamps(),
    )
    op.create_table(
        "risk_assessments",
        _id(),
        sa.Column("product_id", sa.Uuid(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column(
            "decision",
            _enum("CLEAR", "REVIEW", "SUSPEND", name="riskdecision"),
            nullable=False,
        ),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("reasons", sa.JSON(), nullable=False),
        sa.Column("assessed_by", sa.String(128), nullable=False, server_default="rule_engine"),
        sa.Column("notes", sa.Text()),
        *_timestamps(),
    )
    op.create_table(
        "audit_logs",
        _id(),
        sa.Column("actor_user_id", sa.Uuid(), sa.ForeignKey("users.id")),
        sa.Column("action", sa.String(128), nullable=False),
        sa.Column("entity_type", sa.String(128), nullable=False),
        sa.Column("entity_id", sa.Uuid()),
        sa.Column("payload", sa.JSON(), nullable=False),
        *_timestamps(),
    )


def downgrade() -> None:
    for table in [
        "audit_logs",
        "risk_assessments",
        "risk_events",
        "deployment_events",
        "model_evaluations",
        "model_versions",
        "market_snapshots",
        "market_observations",
        "commerce_outcomes",
        "payouts",
        "shipments",
        "payment_records",
        "order_items",
        "orders",
        "buyer_reviews",
        "ambassador_corrections",
        "ambassador_reviews",
        "price_recommendations",
        "price_predictions",
        "seo_content",
        "catalog_entries",
        "inventory",
        "product_dimensions",
        "product_field_evidence",
        "product_predictions",
        "product_media",
        "deletion_requests",
        "consent_records",
        "products",
        "buyer_profiles",
        "artisan_profiles",
        "users",
        "roles",
    ]:
        op.drop_table(table)
