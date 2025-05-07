from app.database.database import engine, Base
import app.models.core  # Ensure models are imported so Base.metadata.create_all can see them

def init_db():
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    init_db()
    print("Database tables created.")
