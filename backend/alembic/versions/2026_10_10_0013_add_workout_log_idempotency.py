"""add idempotency columns and constraint to workout_logs

Revision ID: 2026_10_10_0013
Revises: 2026_08_20_0012
Create Date: 2026-10-10 19:35:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '2026_10_10_0013'
down_revision: Union[str, None] = '2026_08_20_0012'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('workout_logs') as batch_op:
        batch_op.add_column(sa.Column('idempotency_key', sa.String(length=128), nullable=True))
        batch_op.add_column(sa.Column('request_fingerprint', sa.String(length=64), nullable=True))
        batch_op.create_unique_constraint(
            'uq_workout_logs_user_idempotency',
            ['user_id', 'idempotency_key'],
        )


def downgrade() -> None:
    with op.batch_alter_table('workout_logs') as batch_op:
        batch_op.drop_constraint('uq_workout_logs_user_idempotency', type_='unique')
        batch_op.drop_column('request_fingerprint')
        batch_op.drop_column('idempotency_key')
