"""
Quick User Creation Script
Creates a user in the database after schema recreation
"""
import sys
from pathlib import Path

# Fix Windows encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Add backend directory to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.models.database import SessionLocal, User
from app.routes.auth_routes import get_password_hash

def create_user(email="test@mail.com", username="test", password="test@123"):
    db = SessionLocal()
    try:
        # Check if user exists
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"User {email} already exists. Updating password...")
            existing.hashed_password = get_password_hash(password)
            db.commit()
            print(f"Password updated for {email}")
            return existing
        
        # Create new user
        hashed_password = get_password_hash(password)
        new_user = User(
            email=email,
            username=username,
            hashed_password=hashed_password,
            is_active=True
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        print(f"User created successfully!")
        print(f"  Email: {email}")
        print(f"  Username: {username}")
        print(f"  Password: {password}")
        return new_user
    except Exception as e:
        print(f"Error creating user: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        return None
    finally:
        db.close()

if __name__ == "__main__":
    create_user()

