"""
QUICK FIX: Reset Tally Connection to Localhost
Run this to fix the 192.168.1.100 issue immediately!
"""

import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.models.database import engine, TallyConnection, User
from sqlalchemy.orm import Session

def reset_all_connections_to_localhost():
    """Reset all Tally connections to localhost"""
    print("=" * 70)
    print("RESETTING ALL TALLY CONNECTIONS TO LOCALHOST")
    print("=" * 70)
    
    with Session(engine) as db:
        try:
            # Get all Tally connections
            connections = db.query(TallyConnection).all()
            
            if not connections:
                print("\n✓ No existing connections found")
                print("  App will use localhost:9000 by default")
                print("\n" + "=" * 70)
                return
            
            print(f"\nFound {len(connections)} connection(s):")
            
            for conn in connections:
                user = db.query(User).filter(User.id == conn.user_id).first()
                old_url = conn.server_url or "localhost"
                
                print(f"\n  User: {user.email if user else 'Unknown'}")
                print(f"  Old: {old_url}:{conn.port}")
                
                # Reset to localhost
                conn.connection_type = "localhost"
                conn.server_url = None  # None means use localhost
                conn.port = 9000
                
                print(f"  New: localhost:9000 ✓")
            
            db.commit()
            
            print("\n" + "=" * 70)
            print("✅ SUCCESS! All connections reset to localhost:9000")
            print("=" * 70)
            print("\n🚀 Restart your backend server:")
            print("   cd backend")
            print("   uvicorn app.main:app --reload")
            print("\n✓ Should connect immediately!")
            
        except Exception as e:
            print(f"\n❌ ERROR: {e}")
            print("\nTrying alternative method...")
            
            # Alternative: Delete all connections (will default to localhost)
            try:
                db.query(TallyConnection).delete()
                db.commit()
                print("✓ Deleted all connections - will use localhost by default")
            except Exception as e2:
                print(f"❌ Alternative method failed: {e2}")
                print("\nManual fix:")
                print("1. Delete backend/tally_assistant.db")
                print("2. Restart backend - will recreate with localhost")

if __name__ == "__main__":
    reset_all_connections_to_localhost()
    input("\nPress Enter to exit...")

