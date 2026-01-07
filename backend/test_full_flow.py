"""Complete test of the Tally connection flow"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
import requests
import json

BASE_URL = "http://localhost:8000/api"

print("=" * 70)
print("COMPLETE APPLICATION TEST")
print("=" * 70)

# Step 1: Login
print("\n[1/5] Testing Login...")
login_data = {"email": "quicktest@mail.com", "password": "test123"}
try:
    login_response = requests.post(f"{BASE_URL}/auth/login", json=login_data, timeout=10)
    print(f"   Status: {login_response.status_code}")
    if login_response.status_code == 200:
        token = login_response.json()["access_token"]
        print(f"   [OK] Login successful! Token: {token[:30]}...")
        headers = {"Authorization": f"Bearer {token}"}
    else:
        print(f"   [FAIL] Login failed: {login_response.text}")
        exit(1)
except Exception as e:
    print(f"   [ERROR] Login error: {e}")
    exit(1)

# Step 2: Test connection with SERVER enum
print("\n[2/5] Testing Tally Connection (SERVER enum)...")
connect_data = {
    "connection_type": "SERVER",  # Uppercase as frontend sends
    "server_url": "http://10.167.153.150",
    "port": 9000
}
try:
    connect_response = requests.post(
        f"{BASE_URL}/tally/connect",
        headers=headers,
        json=connect_data,
        timeout=30
    )
    print(f"   Status: {connect_response.status_code}")
    print(f"   Response: {json.dumps(connect_response.json(), indent=2)}")
    if connect_response.status_code == 200:
        print("   [OK] Connection configured successfully!")
    else:
        print(f"   [FAIL] Connection failed!")
        exit(1)
except Exception as e:
    print(f"   [ERROR] Connection error: {e}")
    exit(1)

# Step 3: Check connection status
print("\n[3/5] Checking Connection Status...")
try:
    status_response = requests.get(f"{BASE_URL}/tally/status", headers=headers, timeout=5)
    print(f"   Status: {status_response.status_code}")
    print(f"   Response: {json.dumps(status_response.json(), indent=2)}")
    if status_response.status_code == 200:
        print("   [OK] Status check successful!")
except Exception as e:
    print(f"   [ERROR] Status check error: {e}")

# Step 4: Test with lowercase (should also work due to validator)
print("\n[4/5] Testing with lowercase 'server' (validator test)...")
connect_data_lower = {
    "connection_type": "server",  # Lowercase - validator should convert
    "server_url": "http://10.167.153.150",
    "port": 9000
}
try:
    connect_response2 = requests.post(
        f"{BASE_URL}/tally/connect",
        headers=headers,
        json=connect_data_lower,
        timeout=30
    )
    print(f"   Status: {connect_response2.status_code}")
    if connect_response2.status_code == 200:
        print("   [OK] Lowercase also works (validator working)!")
    else:
        print(f"   Response: {connect_response2.text}")
except Exception as e:
    print(f"   [WARN] Lowercase test error: {e}")

# Step 5: Get companies (test data retrieval)
print("\n[5/5] Testing Data Retrieval (Companies)...")
try:
    companies_response = requests.get(f"{BASE_URL}/tally/companies", headers=headers, timeout=10)
    print(f"   Status: {companies_response.status_code}")
    if companies_response.status_code == 200:
        companies = companies_response.json()
        print(f"   [OK] Retrieved {len(companies)} companies")
        if companies:
            print(f"   First company: {companies[0]}")
    else:
        print(f"   Response: {companies_response.text}")
except Exception as e:
    print(f"   [WARN] Companies retrieval error: {e}")

print("\n" + "=" * 70)
print("TEST COMPLETE")
print("=" * 70)

