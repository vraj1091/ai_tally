
import sqlite3
import os

DB_PATH = "database.db"

def fix_database():
    if not os.path.exists(DB_PATH):
        print(f"Database file {DB_PATH} not found.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if column exists
        cursor.execute("PRAGMA table_info(tally_cache)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if "last_updated" not in columns:
            print("Adding missing column 'last_updated' to 'tally_cache'...")
            cursor.execute("ALTER TABLE tally_cache ADD COLUMN last_updated DATETIME")
            print("Column added successfully.")
        else:
            print("Column 'last_updated' already exists.")
            
        # Check for 'source' column as well, just in case
        if "source" not in columns:
            print("Adding missing column 'source' to 'tally_cache'...")
            cursor.execute("ALTER TABLE tally_cache ADD COLUMN source VARCHAR(50) DEFAULT 'live'")
            print("Column added successfully.")
        else:
            print("Column 'source' already exists.")

        conn.commit()
        print("Database schema fix completed.")
        
    except Exception as e:
        print(f"Error fixing database: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    fix_database()
