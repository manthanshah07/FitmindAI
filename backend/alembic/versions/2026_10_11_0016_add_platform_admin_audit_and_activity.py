"""add platform admin audit log and user last_active_at

Revision ID: 2026_10_11_0016
Revises: 2026_10_10_0015
Create Date: 2026-10-11 13:48:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '2026_10_11_0016'
down_revision = '2026_10_10_0015'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    user_cols = {c['name'] for c in inspector.get_columns('users')}
    exercise_cols = {c['name'] for c in inspector.get_columns('exercises')}

    with op.batch_alter_table('users', schema=None) as batch_op:
        if 'is_active' not in user_cols:
            batch_op.add_column(
                sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('1'))
            )
        if 'last_active_at' not in user_cols:
            batch_op.add_column(
                sa.Column('last_active_at', sa.DateTime(timezone=True), nullable=True)
            )

    with op.batch_alter_table('exercises', schema=None) as batch_op:
        if 'is_verified' not in exercise_cols:
            batch_op.add_column(
                sa.Column('is_verified', sa.Boolean(), nullable=False, server_default=sa.text('1'))
            )

    existing_tables = set(inspector.get_table_names())
    if 'admin_audit_log' not in existing_tables:
        op.create_table(
            'admin_audit_log',
            sa.Column('id', sa.Uuid(), nullable=False),
            sa.Column('admin_id', sa.Uuid(), nullable=False),
            sa.Column('action', sa.String(length=100), nullable=False),
            sa.Column('target_user_id', sa.Uuid(), nullable=True),
            sa.Column('details', sa.JSON(), nullable=True),
            sa.Column(
                'created_at',
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
            ),
            sa.ForeignKeyConstraint(['admin_id'], ['users.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['target_user_id'], ['users.id'], ondelete='SET NULL'),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('ix_admin_audit_log_admin_id', 'admin_audit_log', ['admin_id'], unique=False)
        op.create_index('ix_admin_audit_log_created_at', 'admin_audit_log', ['created_at'], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if 'admin_audit_log' in existing_tables:
        op.drop_index('ix_admin_audit_log_created_at', table_name='admin_audit_log')
        op.drop_index('ix_admin_audit_log_admin_id', table_name='admin_audit_log')
        op.drop_table('admin_audit_log')

    exercise_cols = {c['name'] for c in inspector.get_columns('exercises')}
    if 'is_verified' in exercise_cols:
        with op.batch_alter_table('exercises', schema=None) as batch_op:
            batch_op.drop_column('is_verified')

    user_cols = {c['name'] for c in inspector.get_columns('users')}
    if 'last_active_at' in user_cols:
        with op.batch_alter_table('users', schema=None) as batch_op:
            batch_op.drop_column('last_active_at')
