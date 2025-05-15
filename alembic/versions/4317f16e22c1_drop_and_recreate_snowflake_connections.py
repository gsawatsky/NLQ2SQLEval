"""drop and recreate snowflake_connections

Revision ID: 4317f16e22c1
Revises: ab0173d62d0d
Create Date: 2025-05-15 09:34:10.747373

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4317f16e22c1'
down_revision: Union[str, None] = 'ab0173d62d0d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add the new columns to the existing table
    op.add_column('snowflake_connections', sa.Column('database', sa.String(length=255), nullable=True))
    op.add_column('snowflake_connections', sa.Column('schema', sa.String(length=255), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove the new columns
    op.drop_column('snowflake_connections', 'database')
    op.drop_column('snowflake_connections', 'schema')
