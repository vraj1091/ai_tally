"""
Fix TallyCache Schema - Make user_id nullable
Run this script to update the existing database
"""

import sqlite3
import os

def fix_schema():
    db_path = "./database.db"
    
    if not os.path.exists(db_path):
        print("Database file not found. It will be created when you start the backend.")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check current schema
        cursor.execute("PRAGMA table_info(tally_cache)")
        columns = cursor.fetchall()
        
        if not columns:
            print("tally_cache table not found. It will be created when you start the backend.")
            return
        
        print("Current tally_cache schema:")
        for col in columns:
            print(f"  {col[1]}: {col[2]} (nullable: {col[3] == 0})")
        
        # For SQLite, we need to recreate the table to change column constraints
        # This is because SQLite doesn't support ALTER COLUMN
        
        print("\nRecreating tally_cache table with nullable user_id...")
        
        # Step 1: Backup existing data
        cursor.execute("SELECT * FROM tally_cache")
        existing_data = cursor.fetchall()
        print(f"  Backed up {len(existing_data)} rows")
        
        # Step 2: Rename old table
        cursor.execute("ALTER TABLE tally_cache RENAME TO tally_cache_old")
        print("  Renamed old table to tally_cache_old")
        
        # Step 3: Create new table with nullable user_id
        cursor.execute("""
            CREATE TABLE tally_cache (
                id INTEGER PRIMARY KEY,
                user_id INTEGER,
                cache_key VARCHAR(255) NOT NULL,
                cache_data TEXT NOT NULL,
                cached_at DATETIME,
                expires_at DATETIME,
                last_updated DATETIME,
                source VARCHAR(50) DEFAULT 'live',
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)
        print("  Created new tally_cache table with nullable user_id")
        
        # Step 4: Create index on cache_key (drop existing first if any)
        try:
            cursor.execute("DROP INDEX IF EXISTS ix_tally_cache_cache_key")
            cursor.execute("DROP INDEX IF EXISTS ix_tally_cache_id")
        except:
            pass
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_tally_cache_cache_key ON tally_cache (cache_key)")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_tally_cache_id ON tally_cache (id)")
        print("  Created indexes")
        
        # Step 5: Copy data from old table
        if existing_data:
            cursor.executemany("""
                INSERT INTO tally_cache (id, user_id, cache_key, cache_data, cached_at, expires_at, last_updated, source)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, existing_data)
            print(f"  Restored {len(existing_data)} rows")
        
        # Step 6: Drop old table
        cursor.execute("DROP TABLE tally_cache_old")
        print("  Dropped old table")
        
        conn.commit()
        print("\n[SUCCESS] Schema fix completed successfully!")
        
        # Verify new schema
        cursor.execute("PRAGMA table_info(tally_cache)")
        new_columns = cursor.fetchall()
        print("\nNew tally_cache schema:")
        for col in new_columns:
            print(f"  {col[1]}: {col[2]} (not null: {col[3]})")
            
    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Error: {e}")
        print("Rolling back changes...")
        
    finally:
        conn.close()

if __name__ == "__main__":
    print("=" * 50)
    print("TallyCache Schema Fix")
    print("=" * 50)
    fix_schema()

