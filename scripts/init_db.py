#!/usr/bin/env python3
"""Initialize the database with required tables."""
import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import Base
from app.models.core import LLMConfig

def init_db():
    """Initialize the database with required tables."""
    # Import all models to ensure they are registered with SQLAlchemy
    from app.models import core  # noqa: F401
    
    db_url = os.getenv("SQLALCHEMY_DATABASE_URL", "sqlite:///./nlq2sql_eval.db")
    print(f"Initializing database at: {db_url}")
    
    engine = create_engine(db_url)
    
    # Create all tables
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    
    print("Database initialized successfully.")
    
    # List all tables to verify
    with engine.connect() as conn:
        result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"))
        tables = [row[0] for row in result]
        print("\nTables in the database:")
        for table in tables:
            print(f"- {table}")

if __name__ == "__main__":
    init_db()
