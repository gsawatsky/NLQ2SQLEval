from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002_add_snowflake_connections'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Create snowflake_connections table
    op.create_table(
        'snowflake_connections',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('user', sa.String(length=255), nullable=False),
        sa.Column('password', sa.String(length=255), nullable=False),
        sa.Column('account', sa.String(length=255), nullable=False),
        sa.Column('warehouse', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=255), nullable=False),
        sa.Column('is_sso', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

def downgrade():
    # Drop snowflake_connections table
    op.drop_table('snowflake_connections')
