"""Create measurements table

Revision ID: 2026_08_17_0007
Revises: 2026_08_16_0006
Create Date: 2026-08-17 21:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '2026_08_17_0007'
down_revision: Union[str, None] = '2026_08_16_0006'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'measurements',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('measured_at', sa.Date(), nullable=False),
        sa.Column('weight_kg', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('chest_cm', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('waist_cm', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('hips_cm', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('bicep_cm', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('thigh_cm', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('body_fat_pct', sa.Numeric(precision=4, scale=1), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_measurements_user_id'), 'measurements', ['user_id'], unique=False)
    op.create_index(op.f('ix_measurements_measured_at'), 'measurements', ['measured_at'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_measurements_measured_at'), table_name='measurements')
    op.drop_index(op.f('ix_measurements_user_id'), table_name='measurements')
    op.drop_table('measurements')
