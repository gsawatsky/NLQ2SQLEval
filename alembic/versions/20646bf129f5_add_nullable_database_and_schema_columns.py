"""add nullable database and schema columns

Revision ID: 20646bf129f5
Revises: 4317f16e22c1
Create Date: 2025-05-15 09:35:09.608834

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20646bf129f5'
down_revision: Union[str, None] = '4317f16e22c1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add nullable columns
    op.add_column('snowflake_connections', sa.Column('database', sa.String(length=255), nullable=True))
    op.add_column('snowflake_connections', sa.Column('schema', sa.String(length=255), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove nullable columns
    op.drop_column('snowflake_connections', 'database')
    op.drop_column('snowflake_connections', 'schema')
