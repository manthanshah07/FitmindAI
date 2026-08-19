"""add user settings to profiles

Revision ID: 2026_08_19_0011
Revises: 2026_08_19_0010
Create Date: 2026-08-19 11:40:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '2026_08_19_0011'
down_revision: Union[str, None] = '2026_08_19_0010'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'profiles',
        sa.Column('timezone', sa.String(length=50), nullable=False, server_default='UTC')
    )
    op.add_column(
        'profiles',
        sa.Column('preferred_workout_duration_minutes', sa.Integer(), nullable=True, server_default='45')
    )
    op.add_column(
        'profiles',
        sa.Column('target_workout_days_per_week', sa.Integer(), nullable=True, server_default='4')
    )


def downgrade() -> None:
    op.drop_column('profiles', 'target_workout_days_per_week')
    op.drop_column('profiles', 'preferred_workout_duration_minutes')
    op.drop_column('profiles', 'timezone')
