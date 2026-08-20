"""add is_admin column to users table

Revision ID: 2026_08_20_0012
Revises: 2026_08_19_0011
Create Date: 2026-08-20 14:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '2026_08_20_0012'
down_revision: Union[str, None] = '2026_08_19_0011'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column('is_admin', sa.Boolean(), nullable=False, server_default='false')
    )


def downgrade() -> None:
    op.drop_column('users', 'is_admin')
