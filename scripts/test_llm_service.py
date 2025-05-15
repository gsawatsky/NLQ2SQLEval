#!/usr/bin/env python3
"""Test script for the LLMService with different providers."""
import os
import asyncio
import logging
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add the project root to the Python path
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.core import LLMConfig
from app.services.llm_service import LLMService

# Load environment variables
load_dotenv()

# Database setup
DATABASE_URL = os.getenv("SQLALCHEMY_DATABASE_URL", "sqlite:///./nlq2sql_eval.db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Initialize the LLM service
llm_service = LLMService()

# Sample test prompt
TEST_PROMPT = """
You are a helpful assistant that helps with SQL queries. 
Please explain what the following SQL query does:

SELECT * FROM customers WHERE status = 'active';

Keep your response concise.
"""

async def test_llm_config(config_name: str, db):
    """Test an LLM configuration by name."""
    logger.info(f"Testing LLM configuration: {config_name}")
    
    # Get the LLM configuration from the database
    llm_config = db.query(LLMConfig).filter(LLMConfig.name == config_name).first()
    if not llm_config:
        logger.error(f"LLM configuration '{config_name}' not found in the database.")
        return
    
    logger.info(f"Using provider: {llm_config.provider}, model: {llm_config.model}")
    
    try:
        # Test synchronous generation
        logger.info("Testing synchronous generation...")
        response, response_time = llm_service.generate(llm_config, TEST_PROMPT)
        logger.info(f"Synchronous response ({response_time}ms):\n{response}\n")
        
        # Test asynchronous generation
        logger.info("Testing asynchronous generation...")
        response, response_time = await llm_service.agenerate(llm_config, TEST_PROMPT)
        logger.info(f"Asynchronous response ({response_time}ms):\n{response}\n")
        
    except Exception as e:
        logger.error(f"Error testing LLM configuration '{config_name}': {e}", exc_info=True)

async def main():
    """Main function to run the tests."""
    db = SessionLocal()
    try:
        # List all LLM configurations in the database
        configs = db.query(LLMConfig).all()
        if not configs:
            logger.warning("No LLM configurations found in the database.")
            return
        
        logger.info(f"Found {len(configs)} LLM configurations in the database.")
        
        # Test each configuration
        for config in configs:
            await test_llm_config(config.name, db)
            logger.info("-" * 80)
            
    except Exception as e:
        logger.error(f"An error occurred: {e}", exc_info=True)
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(main())
