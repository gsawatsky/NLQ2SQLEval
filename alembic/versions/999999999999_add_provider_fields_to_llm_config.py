"""Add provider and base_url fields to LLMConfig

Revision ID: 999999999999
Revises: 4317f16e22c1
Create Date: 2025-05-15 14:50:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '999999999999'
down_revision = '4317f16e22c1'
branch_labels = None
depends_on = None

def upgrade():
    # Add provider column with a default value of 'openai' for existing rows
    op.add_column('llm_configs', sa.Column('provider', sa.String(), nullable=False, server_default='openai'))
    # Add base_url column (nullable)
    op.add_column('llm_configs', sa.Column('base_url', sa.String(), nullable=True))
    
    # Update existing rows to use 'gemini' provider if they were using Gemini
    # This is a best guess - you might need to adjust the condition based on your data
    op.execute("""
        UPDATE llm_configs 
        SET provider = 'gemini' 
        WHERE model LIKE 'gemini%' OR model LIKE 'models/gemini%';
    """)

def downgrade():
    op.drop_column('llm_configs', 'base_url')
    op.drop_column('llm_configs', 'provider')
