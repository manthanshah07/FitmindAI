"""add fitness score formula version

Revision ID: 2026_10_10_0015
Revises: 2026_10_10_0014
Create Date: 2026-10-10 23:10:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '2026_10_10_0015'
down_revision = '2026_10_10_0014'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('fitness_scores', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('formula_version', sa.Integer(), nullable=False, server_default='2')
        )


def downgrade() -> None:
    with op.batch_alter_table('fitness_scores', schema=None) as batch_op:
        batch_op.drop_column('formula_version')
