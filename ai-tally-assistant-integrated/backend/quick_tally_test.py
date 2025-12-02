"""
Quick Tally Connection Test
Tests connection in 3 seconds or less
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.custom_tally_connector import CustomTallyConnector
from app.config import Config
import time

def test_connection():
    print("=" * 70)
    print("QUICK TALLY CONNECTION TEST")
    print("=" * 70)
    print(f"Tally URL: {Config.TALLY_URL}")
    print(f"Timeout: {Config.TALLY_TIMEOUT} seconds")
    print(f"Host: {Config.TALLY_HOST}")
    print(f"Port: {Config.TALLY_PORT}")
    print("=" * 70)
    
    try:
        print("\n⏱️  Testing connection (max 3 seconds)...")
        start_time = time.time()
        
        connector = CustomTallyConnector(Config.TALLY_HOST, Config.TALLY_PORT)
        is_connected, message = connector.test_connection()
        
        elapsed = time.time() - start_time
        print(f"⏱️  Test completed in {elapsed:.2f} seconds")
        
        if is_connected:
            print(f"✅ SUCCESS: {message}")
            
            # Try to get companies
            print("\n📊 Fetching companies...")
            companies = connector.get_companies()
            print(f"✅ Found {len(companies)} companies:")
            for i, company in enumerate(companies[:5], 1):  # Show first 5
                print(f"   {i}. {company['name']}")
            if len(companies) > 5:
                print(f"   ... and {len(companies) - 5} more")
                
            print("\n" + "=" * 70)
            print("🎉 TALLY CONNECTION SUCCESSFUL!")
            print("=" * 70)
            return True
        else:
            print(f"❌ FAILED: {message}")
            print("\n" + "=" * 70)
            print("⚠️  TALLY CONNECTION FAILED")
            print("=" * 70)
            print_troubleshooting()
            return False
            
    except Exception as e:
        elapsed = time.time() - start_time
        print(f"⏱️  Failed after {elapsed:.2f} seconds")
        print(f"❌ ERROR: {str(e)}")
        print("\n" + "=" * 70)
        print("⚠️  TALLY CONNECTION FAILED")
        print("=" * 70)
        print_troubleshooting()
        return False

def print_troubleshooting():
    """Print troubleshooting steps"""
    print("\n🔧 TROUBLESHOOTING:")
    print("")
    
    if Config.TALLY_HOST == "localhost" or Config.TALLY_HOST == "127.0.0.1":
        print("✅ Using localhost - Tally should be on THIS computer")
        print("")
        print("   1. Check if Tally is running")
        print("   2. Open a company in Tally")
        print("   3. Enable Gateway in Tally:")
        print("      - Press F1 (Help)")
        print("      - Go to Settings → Connectivity")
        print("      - Enable 'Gateway' or 'Act as TallyPrime Server'")
        print("      - Port should be: 9000")
        print("   4. Check Windows Firewall allows port 9000")
    else:
        print(f"⚠️  Using remote IP: {Config.TALLY_HOST}")
        print("")
        print("   1. Verify IP is correct:")
        print(f"      ping {Config.TALLY_HOST}")
        print("      (Should get responses, not 'Request timed out')")
        print("")
        print("   2. Ensure Tally is running on that computer")
        print("")
        print("   3. Enable Gateway on the REMOTE computer:")
        print("      - Press F1 → Settings → Connectivity")
        print("      - Enable 'Act as TallyPrime Server'")
        print("      - Port: 9000")
        print("")
        print("   4. Check firewall on REMOTE computer allows port 9000")
        print("")
        print("   💡 TIP: If you want to use Tally on THIS computer,")
        print("      edit backend/.env and change:")
        print(f"      TALLY_HOST={Config.TALLY_HOST}")
        print("      to:")
        print("      TALLY_HOST=localhost")
    
    print("")
    print("=" * 70)

if __name__ == "__main__":
    success = test_connection()
    sys.exit(0 if success else 1)

