#!/usr/bin/env python3
"""Script to list all tables in the database."""
import os
import sys
from sqlalchemy import create_engine, text

def get_db_connection_string() -> str:
    """Get the database connection string from environment or config."""
    return os.getenv("SQLALCHEMY_DATABASE_URL", "sqlite:///./nlq2sql_eval.db")

def list_tables():
    """List all tables in the database."""
    db_url = get_db_connection_string()
    print(f"Connecting to database: {db_url}")
    
    engine = create_engine(db_url)
    with engine.connect() as conn:
        # For SQLite
        if db_url.startswith('sqlite'):
            result = conn.execute(text("""
                SELECT name FROM sqlite_master 
                WHERE type='table' 
                ORDER BY name;
            """))
            tables = [row[0] for row in result]
        # Add support for other databases if needed
        else:
            raise ValueError(f"Unsupported database: {db_url}")
        
        print("\nTables in the database:")
        for table in tables:
            print(f"- {table}")
            
            # Show columns for each table
            if db_url.startswith('sqlite'):
                columns = conn.execute(text(f'PRAGMA table_info("{table}")')).fetchall()
                for col in columns:
                    print(f"  - {col[1]}: {col[2]}")
            print()

if __name__ == "__main__":
    list_tables()
