from app.database.database import SessionLocal, Base, engine
from app.models.core import LLMConfig

# Import all models to ensure they are registered with SQLAlchemy
from app.models import core  # noqa

def main():
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    # Create a new session
    db = SessionLocal()
    
    try:
        # Add sample LLM configurations
        llm_configs = [
            {
                "name": "OpenAI GPT-4",
                "provider": "openai",
                "model": "gpt-4-turbo-preview",
                "api_key": "your-openai-api-key",  # You'll need to replace this with your actual API key
                "base_url": "https://api.openai.com/v1",
                "default_parameters": {"temperature": 0.7, "max_tokens": 1000}
            },
            {
                "name": "Anthropic Claude 3 Opus",
                "provider": "anthropic",
                "model": "claude-3-opus-20240229",
                "api_key": "your-anthropic-api-key",  # You'll need to replace this with your actual API key
                "base_url": "https://api.anthropic.com",
                "default_parameters": {"temperature": 0.7, "max_tokens": 1000}
            },
            {
                "name": "Google Gemini Pro",
                "provider": "gemini",
                "model": "gemini-pro",
                "api_key": "your-google-api-key",  # You'll need to replace this with your actual API key
                "base_url": "https://generativelanguage.googleapis.com",
                "default_parameters": {"temperature": 0.7, "max_tokens": 1000}
            }
        ]
        
        # Add each config to the database
        for config_data in llm_configs:
            config = LLMConfig(**config_data)
            db.add(config)
        
        # Commit the changes
        db.commit()
        print("Successfully initialized database with sample LLM configurations.")
        
    except Exception as e:
        print(f"Error initializing database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
