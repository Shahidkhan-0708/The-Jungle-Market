"""add_product_appraisal_log

Revision ID: 2c6fa3cd7951
Revises: 0001_initial_schema
Create Date: 2026-09-18 18:51:58.765393

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '2c6fa3cd7951'
down_revision: Union[str, None] = '0001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'product_appraisals',
        sa.Column('category', sa.String(length=128), nullable=True),
        sa.Column('material', sa.String(length=128), nullable=True),
        sa.Column('price_p50', sa.Float(), nullable=True),
        sa.Column('seo_copy', sa.Text(), nullable=True),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('product_appraisals')
