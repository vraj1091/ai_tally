"""Simple connection test"""
import requests
import json

# Login
login_resp = requests.post("http://localhost:8000/api/auth/login", json={"email": "quicktest@mail.com", "password": "test123"})
token = login_resp.json()["access_token"]
print(f"Token: {token[:30]}...")

# Test connection
headers = {"Authorization": f"Bearer {token}"}
data = {"connection_type": "SERVER", "server_url": "http://10.167.153.150", "port": 9000}
print(f"\nSending: {json.dumps(data, indent=2)}")

resp = requests.post("http://localhost:8000/api/tally/connect", headers=headers, json=data, timeout=15)
print(f"\nStatus: {resp.status_code}")
print(f"Response: {resp.text}")

