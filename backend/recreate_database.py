"""
Recreate Database with Correct Schema
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
    print("Database models imported successfully")
except ImportError as e:
    print(f"Error importing database models: {e}")
    sys.exit(1)

# Find database file
db_path = Path(backend_dir) / "database.db"
if not db_path.exists():
    db_path = Path(backend_dir).parent / "database.db"

if db_path.exists():
    print(f"Found existing database at: {db_path}")
    response = input("Delete and recreate database? This will lose all data! (yes/no): ")
    if response.lower() != 'yes':
        print("Cancelled. Database not recreated.")
        sys.exit(0)
    
    # Backup old database
    backup_path = db_path.with_suffix('.db.backup')
    if backup_path.exists():
        backup_path.unlink()
    db_path.rename(backup_path)
    print(f"Backed up old database to: {backup_path}")

# Recreate database with correct schema
print("\nCreating database with correct schema...")
try:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("Database created successfully with all columns!")
    
    # Verify schema
    from sqlalchemy import inspect
    inspector = inspect(engine)
    columns = [col['name'] for col in inspector.get_columns('tally_cache')]
    print(f"\nColumns in tally_cache table: {columns}")
    
    required_columns = ['id', 'user_id', 'cache_key', 'cache_data', 'cached_at', 'expires_at', 'last_updated', 'source']
    missing = [col for col in required_columns if col not in columns]
    
    if missing:
        print(f"WARNING: Missing columns: {missing}")
    else:
        print("All required columns are present!")
    
except Exception as e:
    print(f"Error creating database: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\nDatabase recreation complete!")
print("You will need to:")
print("1. Register a new user (old users are deleted)")
print("2. Re-upload backup files if needed")
print("3. Re-configure Tally connection")

