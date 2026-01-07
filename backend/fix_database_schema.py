"""
Fix Database Schema - Add missing columns to tally_cache table
"""
import sqlite3
import os
import sys
from pathlib import Path

# Fix Windows encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Add backend directory to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Find database file
db_path = Path(backend_dir) / "database.db"
if not db_path.exists():
    # Try parent directory
    db_path = Path(backend_dir).parent / "database.db"

if not db_path.exists():
    print(f"Database file not found at {db_path}")
    print("   Database will be created automatically on next server start.")
    sys.exit(0)

print(f"Found database at: {db_path}")

try:
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    # Check if last_updated column exists
    cursor.execute("PRAGMA table_info(tally_cache)")
    columns = [col[1] for col in cursor.fetchall()]
    
    print(f"Current columns in tally_cache: {columns}")
    
    # Add missing columns
    if 'last_updated' not in columns:
        print("Adding 'last_updated' column...")
        cursor.execute("ALTER TABLE tally_cache ADD COLUMN last_updated DATETIME DEFAULT CURRENT_TIMESTAMP")
        print("   Added 'last_updated' column")
    else:
        print("   'last_updated' column already exists")
    
    if 'source' not in columns:
        print("Adding 'source' column...")
        cursor.execute("ALTER TABLE tally_cache ADD COLUMN source VARCHAR(50) DEFAULT 'live'")
        print("   Added 'source' column")
    else:
        print("   'source' column already exists")
    
    conn.commit()
    print("\nDatabase schema updated successfully!")
    
    # Verify
    cursor.execute("PRAGMA table_info(tally_cache)")
    columns = [col[1] for col in cursor.fetchall()]
    print(f"Updated columns: {columns}")
    
    conn.close()
    
except sqlite3.OperationalError as e:
    print(f"Error: {e}")
    print("\nSolution: The database may need to be recreated.")
    print("   Delete database.db and restart the server to create a fresh database.")
    sys.exit(1)
except Exception as e:
    print(f"Unexpected error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

