"""Complete test of Tally connection API"""
import requests
import json
import sys

BASE_URL = "http://localhost:8000"

print("=" * 70)
print("COMPLETE TALLY CONNECTION TEST")
print("=" * 70)

# Step 1: Test backend is running
print("\n[1] Testing backend health...")
try:
    response = requests.get(f"{BASE_URL}/api/tally/status", timeout=5)
    print(f"   Status: {response.status_code}")
except Exception as e:
    print(f"   ERROR: Backend not responding: {e}")
    sys.exit(1)

# Step 2: Login
print("\n[2] Logging in...")
login_url = f"{BASE_URL}/api/auth/login"
login_data = {"email": "quicktest@mail.com", "password": "test123"}

try:
    login_response = requests.post(login_url, json=login_data, timeout=5)
    if login_response.status_code != 200:
        print(f"   ERROR: Login failed: {login_response.status_code}")
        print(f"   Response: {login_response.text}")
        sys.exit(1)
    
    token = login_response.json().get("access_token")
    print(f"   SUCCESS: Logged in, token: {token[:30]}...")
except Exception as e:
    print(f"   ERROR: Login exception: {e}")
    sys.exit(1)

# Step 3: Test connection with SERVER enum
print("\n[3] Testing Tally connection with SERVER enum...")
connect_url = f"{BASE_URL}/api/tally/connect"
headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
connect_data = {
    "connection_type": "SERVER",
    "server_url": "http://10.167.153.150",
    "port": 9000
}

print(f"   Request URL: {connect_url}")
print(f"   Request Data: {json.dumps(connect_data, indent=2)}")

try:
    connect_response = requests.post(connect_url, headers=headers, json=connect_data, timeout=10)
    print(f"   Response Status: {connect_response.status_code}")
    print(f"   Response Body: {connect_response.text[:500]}")
    
    if connect_response.status_code == 200:
        result = connect_response.json()
        print(f"\n   ✅ SUCCESS! Connection established!")
        print(f"   Connected: {result.get('connected', False)}")
        print(f"   Message: {result.get('message', 'N/A')}")
    elif connect_response.status_code == 422:
        error_detail = connect_response.json()
        print(f"\n   ❌ VALIDATION ERROR:")
        print(f"   {json.dumps(error_detail, indent=2)}")
    else:
        print(f"\n   ❌ ERROR: Status {connect_response.status_code}")
        print(f"   Response: {connect_response.text}")
        
except Exception as e:
    print(f"   ERROR: Exception during connection: {e}")
    import traceback
    traceback.print_exc()

# Step 4: Test status endpoint
print("\n[4] Testing status endpoint...")
try:
    status_response = requests.get(f"{BASE_URL}/api/tally/status", headers=headers, timeout=5)
    print(f"   Status Code: {status_response.status_code}")
    print(f"   Response: {status_response.text[:200]}")
except Exception as e:
    print(f"   ERROR: {e}")

print("\n" + "=" * 70)
print("TEST COMPLETE")
print("=" * 70)

