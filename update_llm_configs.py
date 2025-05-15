import sqlite3
from pathlib import Path

def update_llm_configs():
    # Path to the database
    db_path = Path("app/nlq2sql_eval.db")
    
    if not db_path.exists():
        print(f"Error: Database file not found at {db_path}")
        return
    
    try:
        # Connect to the SQLite database
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # Add provider and base_url columns if they don't exist
        cursor.execute("""
        PRAGMA table_info(llm_configs);
        """)
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'provider' not in columns:
            cursor.execute("""
            ALTER TABLE llm_configs ADD COLUMN provider VARCHAR NOT NULL DEFAULT 'gemini';
            """)
            print("Added 'provider' column")
        
        if 'base_url' not in columns:
            cursor.execute("""
            ALTER TABLE llm_configs ADD COLUMN base_url VARCHAR;
            """)
            print("Added 'base_url' column")
        
        # Update existing rows with provider and base_url values
        cursor.execute("""
        UPDATE llm_configs 
        SET provider = 'gemini',
            base_url = 'https://generativelanguage.googleapis.com'
        WHERE model LIKE 'gemini%';
        """)
        
        # Commit the changes
        conn.commit()
        print("Successfully updated llm_configs table")
        
        # Display the updated table
        print("\nUpdated llm_configs table:")
        cursor.execute("SELECT * FROM llm_configs;")
        for row in cursor.fetchall():
            print(row)
            
    except sqlite3.Error as e:
        print(f"Database error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    update_llm_configs()
