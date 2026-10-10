"""add day_label to workout_plan_exercises

Revision ID: 2026_10_10_0014
Revises: 2026_10_10_0013
Create Date: 2026-10-10 20:48:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '2026_10_10_0014'
down_revision: Union[str, None] = '2026_10_10_0013'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('workout_plan_exercises') as batch_op:
        batch_op.add_column(sa.Column('day_label', sa.String(length=50), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('workout_plan_exercises') as batch_op:
        batch_op.drop_column('day_label')
