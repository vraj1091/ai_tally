"""
Auto-Recreate Database (Non-Interactive)
This will delete the existing database and create a new one with all columns
"""
import os
import sys
from pathlib import Path

# Fix Windows encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Add backend directory to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Import database components
try:
    from app.models.database import Base, engine, SessionLocal
    from app.models.database import User, TallyConnection, TallyCache
    print("[OK] Database models imported successfully")
except ImportError as e:
    print(f"[ERROR] Error importing database models: {e}")
    sys.exit(1)

# Find database file
db_path = Path(backend_dir) / "database.db"
if not db_path.exists():
    db_path = Path(backend_dir).parent / "database.db"

if db_path.exists():
    print(f"[INFO] Found existing database at: {db_path}")
    # Backup old database
    backup_path = db_path.with_suffix('.db.backup')
    if backup_path.exists():
        backup_path.unlink()
    db_path.rename(backup_path)
    print(f"[OK] Backed up old database to: {backup_path}")
else:
    print("[INFO] No existing database found, creating new one...")

# Recreate database with correct schema
print("\n[INFO] Creating database with correct schema...")
try:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("[OK] Database created successfully with all columns!")
    
    # Verify schema
    from sqlalchemy import inspect
    inspector = inspect(engine)
    
    tables = inspector.get_table_names()
    print(f"\n[INFO] Created tables: {tables}")
    
    if 'tally_cache' in tables:
        columns = [col['name'] for col in inspector.get_columns('tally_cache')]
        print(f"[INFO] Columns in tally_cache table: {columns}")
        
        required_columns = ['id', 'user_id', 'cache_key', 'cache_data', 'cached_at', 'expires_at', 'last_updated', 'source']
        missing = [col for col in required_columns if col not in columns]
        
        if missing:
            print(f"[WARNING] Missing columns: {missing}")
        else:
            print("[OK] All required columns are present!")
    else:
        print("[ERROR] tally_cache table not created!")
    
except Exception as e:
    print(f"[ERROR] Error creating database: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n[SUCCESS] Database recreation complete!")
print("[INFO] Next steps:")
print("1. Restart the backend server")
print("2. Register a new user (old users are deleted)")
print("3. Re-upload backup files if needed")
print("4. Re-configure Tally connection")


