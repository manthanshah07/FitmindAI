"""Add weight_kg to profiles table

Revision ID: 2026_08_16_0004
Revises: 2026_08_16_0003
Create Date: 2026-08-16 14:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2026_08_16_0004'
down_revision: Union[str, None] = '2026_08_16_0003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('profiles', sa.Column('weight_kg', sa.Numeric(precision=5, scale=2), nullable=True))


def downgrade() -> None:
    op.drop_column('profiles', 'weight_kg')
