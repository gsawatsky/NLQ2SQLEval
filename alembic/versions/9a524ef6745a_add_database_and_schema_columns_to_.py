"""add database and schema columns to snowflake_connections

Revision ID: 9a524ef6745a
Revises: 20646bf129f5
Create Date: 2025-05-15 09:35:36.397281

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9a524ef6745a'
down_revision: Union[str, None] = '20646bf129f5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
