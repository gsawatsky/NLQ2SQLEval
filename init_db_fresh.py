from app.database.database import Base, engine, SessionLocal
from app.models.core import LLMConfig, NLQ, PromptSet, PromptComponent, ValidationRun, GeneratedResult

def init_db():
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
                "api_key": "your-openai-api-key",  # Replace with actual API key
                "base_url": "https://api.openai.com/v1",
                "default_parameters": {"temperature": 0.7, "max_tokens": 1000}
            },
            {
                "name": "Anthropic Claude 3 Opus",
                "provider": "anthropic",
                "model": "claude-3-opus-20240229",
                "api_key": "your-anthropic-api-key",  # Replace with actual API key
                "base_url": "https://api.anthropic.com",
                "default_parameters": {"temperature": 0.7, "max_tokens": 1000}
            },
            {
                "name": "Google Gemini Pro",
                "provider": "gemini",
                "model": "gemini-pro",
                "api_key": "your-google-api-key",  # Replace with actual API key
                "base_url": "https://generativelanguage.googleapis.com",
                "default_parameters": {"temperature": 0.7, "max_tokens": 1000}
            }
        ]
        
        # Add each config to the database
        for config_data in llm_configs:
            config = LLMConfig(**config_data)
            db.add(config)
        
        # Add a sample NLQ
        nlq = NLQ(nlq_text="Show me the total sales by product category")
        db.add(nlq)
        
        # Add a sample prompt set
        prompt_set = PromptSet(
            name="default",
            description="Default prompt set for testing"
        )
        db.add(prompt_set)
        
        # Add a sample prompt component
        prompt_component = PromptComponent(
            name="system_prompt",
            type="system",
            content="You are a helpful assistant that generates SQL queries."
        )
        db.add(prompt_component)
        
        # Commit the changes
        db.commit()
        
        print("Successfully initialized database with sample data.")
        
    except Exception as e:
        print(f"Error initializing database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
