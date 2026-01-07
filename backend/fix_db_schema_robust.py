import sqlite3
import os
import sys

DB_PATH = 'database.db'

def fix_schema():
    print(f"Checking database at {os.path.abspath(DB_PATH)}")
    
    if not os.path.exists(DB_PATH):
        print("Database file not found!")
        return

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Check tally_cache table
        cursor.execute("PRAGMA table_info(tally_cache)")
        columns = {row[1] for row in cursor.fetchall()}
        print(f"Current columns in tally_cache: {columns}")
        
        required_columns = {
            'last_updated': 'DATETIME DEFAULT CURRENT_TIMESTAMP',
            'source': 'VARCHAR(50) DEFAULT "live"',
            'cached_at': 'DATETIME DEFAULT CURRENT_TIMESTAMP',
            'expires_at': 'DATETIME'
        }
        
        for col, col_def in required_columns.items():
            if col not in columns:
                print(f"Adding missing column: {col}")
                try:
                    cursor.execute(f"ALTER TABLE tally_cache ADD COLUMN {col} {col_def}")
                    print(f"Successfully added {col}")
                except Exception as e:
                    print(f"Error adding {col}: {e}")
            else:
                print(f"Column {col} already exists")
                
        conn.commit()
        
        # Verify again
        cursor.execute("PRAGMA table_info(tally_cache)")
        final_columns = {row[1] for row in cursor.fetchall()}
        print(f"Final columns: {final_columns}")
        
        conn.close()
        print("Schema fix completed.")
        
    except Exception as e:
        print(f"Database error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    fix_schema()
