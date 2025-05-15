"""add database and schema columns to snowflake_connections

Revision ID: ab0173d62d0d
Revises: 003_merge_migrations
Create Date: 2025-05-15 09:25:59.234584

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ab0173d62d0d'
down_revision: Union[str, None] = '003_merge_migrations'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('snowflake_connections', sa.Column('database', sa.String(length=255), nullable=True))
    op.add_column('snowflake_connections', sa.Column('schema', sa.String(length=255), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('snowflake_connections', 'database')
    op.drop_column('snowflake_connections', 'schema')
