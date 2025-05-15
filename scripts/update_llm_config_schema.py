"""Script to manually update the LLMConfig table schema."""
import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from typing import Set

def get_db_connection_string() -> str:
    """Get the database connection string from environment or config."""
    # Default to SQLite if not specified
    return os.getenv("SQLALCHEMY_DATABASE_URL", "sqlite:///./nlq2sql_eval.db")

def get_existing_columns(conn, table_name: str) -> Set[str]:
    """Get the set of existing columns in a table."""
    # SQLite PRAGMA doesn't support parameters, so we need to use string formatting
    # with proper escaping to prevent SQL injection
    safe_table_name = table_name.replace('"', '""')
    result = conn.execute(
        text(f'PRAGMA table_info("{safe_table_name}")')
    )
    return {row[1] for row in result}

def update_llm_config_schema(engine: Engine):
    """Update the LLMConfig table schema."""
    with engine.connect() as conn:
        existing_columns = get_existing_columns(conn, 'llm_configs')
        
        try:
            # Add provider column if it doesn't exist
            if 'provider' not in existing_columns:
                print("Adding 'provider' column to llm_configs table...")
                conn.execute(text("""
                    ALTER TABLE llm_configs 
                    ADD COLUMN provider TEXT NOT NULL DEFAULT 'openai'
                """))
                
                # Set provider to 'gemini' for existing Gemini models
                conn.execute(text("""
                    UPDATE llm_configs 
                    SET provider = 'gemini' 
                    WHERE model LIKE 'gemini%%' OR model LIKE 'models/gemini%%';
                """))
                
            # Add base_url column if it doesn't exist
            if 'base_url' not in existing_columns:
                print("Adding 'base_url' column to llm_configs table...")
                conn.execute(text("""
                    ALTER TABLE llm_configs 
                    ADD COLUMN base_url TEXT
                """))
            
            # Commit the changes
            conn.commit()
            print("Database schema updated successfully.")
            
        except Exception as e:
            conn.rollback()
            print(f"Error updating database schema: {e}")
            raise

def main() -> int:
    """Run the schema update."""
    db_url = get_db_connection_string()
    print(f"Connecting to database: {db_url}")
    
    try:
        engine = create_engine(db_url)
        with engine.begin() as conn:
            update_llm_config_schema(engine)
        print("Schema update completed successfully.")
        return 0
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    sys.exit(main())
