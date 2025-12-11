"""
Fix ALL Database Files - Add missing columns to all database.db files
"""
import sqlite3
import sys
from pathlib import Path

# Fix Windows encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

def fix_database(db_path: Path):
    """Fix a single database file"""
    if not db_path.exists():
        print(f"  Database not found: {db_path}")
        return False
    
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # Check if last_updated column exists
        cursor.execute("PRAGMA table_info(tally_cache)")
        columns = [col[1] for col in cursor.fetchall()]
        
        fixed = False
        
        # Add missing columns
        if 'last_updated' not in columns:
            print(f"  Adding 'last_updated' column to {db_path.name}...")
            cursor.execute("ALTER TABLE tally_cache ADD COLUMN last_updated DATETIME DEFAULT CURRENT_TIMESTAMP")
            fixed = True
        else:
            print(f"  'last_updated' already exists in {db_path.name}")
        
        if 'source' not in columns:
            print(f"  Adding 'source' column to {db_path.name}...")
            cursor.execute("ALTER TABLE tally_cache ADD COLUMN source VARCHAR(50) DEFAULT 'live'")
            fixed = True
        else:
            print(f"  'source' already exists in {db_path.name}")
        
        conn.commit()
        
        # Verify
        cursor.execute("PRAGMA table_info(tally_cache)")
        columns = [col[1] for col in cursor.fetchall()]
        print(f"  Updated columns in {db_path.name}: {columns}")
        
        conn.close()
        return fixed
        
    except sqlite3.OperationalError as e:
        print(f"  Error fixing {db_path.name}: {e}")
        return False
    except Exception as e:
        print(f"  Unexpected error with {db_path.name}: {e}")
        return False

# Find all database files
backend_dir = Path(__file__).parent
db_files = [
    backend_dir / "database.db",
    backend_dir / "app" / "database.db",
]

print("Fixing all database files...\n")

fixed_count = 0
for db_path in db_files:
    if db_path.exists():
        print(f"Fixing: {db_path}")
        if fix_database(db_path):
            fixed_count += 1
        print()

if fixed_count > 0:
    print(f"Fixed {fixed_count} database file(s)!")
else:
    print("All databases already have correct schema.")

print("\nDone!")

