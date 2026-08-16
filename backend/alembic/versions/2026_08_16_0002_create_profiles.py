"""Create profiles table

Revision ID: 2026_08_16_0002
Revises: 2026_08_16_0001
Create Date: 2026-08-16 14:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '2026_08_16_0002'
down_revision: Union[str, None] = '2026_08_16_0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'profiles',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('full_name', sa.String(length=100), nullable=False),
        sa.Column('date_of_birth', sa.DateTime(timezone=False), nullable=True),
        sa.Column('gender', sa.String(length=20), nullable=True),
        sa.Column('height_cm', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('activity_level', sa.String(length=30), nullable=True),
        sa.Column('diet_preference', sa.String(length=50), nullable=True),
        sa.Column('equipment', sa.JSON(), nullable=True),
        sa.Column('medical_notes', sa.Text(), nullable=True),
        sa.Column('onboarding_complete', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index(op.f('ix_profiles_user_id'), 'profiles', ['user_id'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_profiles_user_id'), table_name='profiles')
    op.drop_table('profiles')
