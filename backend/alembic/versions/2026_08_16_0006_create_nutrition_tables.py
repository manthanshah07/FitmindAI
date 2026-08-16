"""Create nutrition tables

Revision ID: 2026_08_16_0006
Revises: 2026_08_16_0005
Create Date: 2026-08-16 17:41:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '2026_08_16_0006'
down_revision: Union[str, None] = '2026_08_16_0005'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. foods
    op.create_table(
        'foods',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('brand', sa.String(length=100), nullable=True),
        sa.Column('calories_per_100g', sa.Numeric(precision=7, scale=2), nullable=False),
        sa.Column('protein_per_100g', sa.Numeric(precision=6, scale=2), nullable=False),
        sa.Column('carbs_per_100g', sa.Numeric(precision=6, scale=2), nullable=False),
        sa.Column('fat_per_100g', sa.Numeric(precision=6, scale=2), nullable=False),
        sa.Column('fiber_per_100g', sa.Numeric(precision=6, scale=2), nullable=True),
        sa.Column('is_verified', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_foods_name'), 'foods', ['name'], unique=True)

    # 2. meal_logs
    op.create_table(
        'meal_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('meal_type', sa.String(length=20), nullable=False),
        sa.Column('logged_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_meal_logs_user_id'), 'meal_logs', ['user_id'], unique=False)
    op.create_index(op.f('ix_meal_logs_logged_at'), 'meal_logs', ['logged_at'], unique=False)

    # 3. meal_log_items
    op.create_table(
        'meal_log_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('meal_log_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('food_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('quantity_grams', sa.Numeric(precision=8, scale=2), nullable=False),
        sa.Column('calculated_calories', sa.Numeric(precision=8, scale=2), nullable=False),
        sa.Column('calculated_protein', sa.Numeric(precision=7, scale=2), nullable=False),
        sa.Column('calculated_carbs', sa.Numeric(precision=7, scale=2), nullable=False),
        sa.Column('calculated_fat', sa.Numeric(precision=7, scale=2), nullable=False),
        sa.ForeignKeyConstraint(['food_id'], ['foods.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['meal_log_id'], ['meal_logs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_meal_log_items_food_id'), 'meal_log_items', ['food_id'], unique=False)
    op.create_index(op.f('ix_meal_log_items_meal_log_id'), 'meal_log_items', ['meal_log_id'], unique=False)


def downgrade() -> None:
    op.drop_table('meal_log_items')
    op.drop_table('meal_logs')
    op.drop_table('foods')
