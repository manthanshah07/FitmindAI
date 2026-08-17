"""Create fitness_scores table

Revision ID: 2026_08_17_0008
Revises: 2026_08_17_0007
Create Date: 2026-08-17 21:31:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '2026_08_17_0008'
down_revision: Union[str, None] = '2026_08_17_0007'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'fitness_scores',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('score', sa.Integer(), nullable=False),
        sa.Column('workout_adherence_pct', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('nutrition_score', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('protein_score', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('sleep_score', sa.Numeric(precision=5, scale=2), server_default=sa.text('75.00'), nullable=True),
        sa.Column('recovery_score', sa.Numeric(precision=5, scale=2), server_default=sa.text('75.00'), nullable=True),
        sa.Column('consistency_score', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('calculated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('period_start', sa.Date(), nullable=False),
        sa.Column('period_end', sa.Date(), nullable=False),
        sa.CheckConstraint('score >= 0 AND score <= 100', name='ck_fitness_score_bounds'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'period_start', 'period_end', name='uq_user_fitness_score_period')
    )
    op.create_index(op.f('ix_fitness_scores_user_id'), 'fitness_scores', ['user_id'], unique=False)
    op.create_index(op.f('ix_fitness_scores_period_start'), 'fitness_scores', ['period_start'], unique=False)
    op.create_index(op.f('ix_fitness_scores_period_end'), 'fitness_scores', ['period_end'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_fitness_scores_period_end'), table_name='fitness_scores')
    op.drop_index(op.f('ix_fitness_scores_period_start'), table_name='fitness_scores')
    op.drop_index(op.f('ix_fitness_scores_user_id'), table_name='fitness_scores')
    op.drop_table('fitness_scores')
