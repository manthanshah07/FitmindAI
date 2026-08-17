"""Add composite date range indexes for meal_logs and workout_logs

Revision ID: 2026_08_17_0009
Revises: 2026_08_17_0008
Create Date: 2026-08-17 23:05:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '2026_08_17_0009'
down_revision: Union[str, None] = '2026_08_17_0008'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index('ix_meal_logs_user_logged', 'meal_logs', ['user_id', 'logged_at'], unique=False)
    op.create_index('ix_workout_logs_user_started', 'workout_logs', ['user_id', 'started_at'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_workout_logs_user_started', table_name='workout_logs')
    op.drop_index('ix_meal_logs_user_logged', table_name='meal_logs')
