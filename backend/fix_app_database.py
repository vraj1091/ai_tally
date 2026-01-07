"""
Fix app/database.db - Recreate with correct schema
"""
import sys
from pathlib import Path

# Fix Windows encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Add backend directory to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.models.database import Base, engine, SessionLocal
from app.models.database import User, TallyConnection, TallyCache

# Path to app database
app_db_path = backend_dir / "app" / "database.db"

if app_db_path.exists():
    print(f"Found app database at: {app_db_path}")
    # Backup
    backup_path = app_db_path.with_suffix('.db.backup')
    if backup_path.exists():
        backup_path.unlink()
    app_db_path.rename(backup_path)
    print(f"Backed up to: {backup_path}")

# Recreate with correct schema
print("\nRecreating app/database.db with correct schema...")

# Temporarily change DB_URL to point to app/database.db
from app.config import Config
original_db_url = Config.DB_URL
Config.DB_URL = "sqlite:///./app/database.db"

# Recreate engine with new URL
from sqlalchemy import create_engine
app_engine = create_engine(Config.DB_URL)

try:
    Base.metadata.drop_all(bind=app_engine)
    Base.metadata.create_all(bind=app_engine)
    print("Database created successfully!")
    
    # Verify
    from sqlalchemy import inspect
    inspector = inspect(app_engine)
    columns = [col['name'] for col in inspector.get_columns('tally_cache')]
    print(f"\nColumns in tally_cache: {columns}")
    
    required = ['id', 'user_id', 'cache_key', 'cache_data', 'cached_at', 'expires_at', 'last_updated', 'source']
    missing = [col for col in required if col not in columns]
    
    if missing:
        print(f"WARNING: Missing columns: {missing}")
    else:
        print("All required columns present!")
    
    app_engine.dispose()
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\nDone! App database fixed.")

