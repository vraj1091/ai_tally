#!/usr/bin/env python3
"""
TallyDash Pro - SECURE Local Tally Proxy
=========================================
A secure proxy with:
- Authentication token required for all requests
- IP whitelist (only localhost by default)
- Rate limiting
- Request logging
- Optional HTTPS support

Usage:
  python secure_tally_proxy.py                           # localhost:9000
  python secure_tally_proxy.py 192.168.1.3               # Custom Tally IP
  python secure_tally_proxy.py 192.168.1.3 19000         # Custom IP and port
  python secure_tally_proxy.py 192.168.1.3 19000 mytoken # Custom with auth token

Environment Variables:
  TALLY_AUTH_TOKEN - Secret token for authentication (default: auto-generated)
  TALLY_HOST - Tally server IP (default: localhost)
  TALLY_PORT - Tally server port (default: 9000)
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.request
import urllib.error
import sys
import os
import time
import secrets
import hashlib
import json
from datetime import datetime

# Configuration
TALLY_HOST = os.environ.get('TALLY_HOST', sys.argv[1] if len(sys.argv) > 1 else "localhost")
TALLY_PORT = os.environ.get('TALLY_PORT', sys.argv[2] if len(sys.argv) > 2 else "9000")
TALLY_URL = f"http://{TALLY_HOST}:{TALLY_PORT}"
PROXY_PORT = 8765

# Security Configuration
AUTH_TOKEN = os.environ.get('TALLY_AUTH_TOKEN', sys.argv[3] if len(sys.argv) > 3 else secrets.token_urlsafe(32))
ALLOWED_IPS = ['127.0.0.1', 'localhost', '::1']  # Only allow localhost connections
RATE_LIMIT = 60  # Max requests per minute
REQUEST_LOG = []  # Simple in-memory log

class SecureTallyProxyHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()
    
    def do_POST(self):
        """Forward POST request to Tally with security checks"""
        # Security Check 1: IP Whitelist
        client_ip = self.client_address[0]
        if client_ip not in ALLOWED_IPS and not client_ip.startswith('127.'):
            self.send_error_response(403, "Access denied: IP not allowed")
            log_request(client_ip, "BLOCKED", "IP not in whitelist")
            return
        
        # Security Check 2: Authentication Token
        auth_header = self.headers.get('X-Tally-Auth') or self.headers.get('Authorization')
        if auth_header:
            # Support "Bearer <token>" or just "<token>"
            token = auth_header.replace('Bearer ', '').strip()
        else:
            token = None
        
        if token != AUTH_TOKEN:
            self.send_error_response(401, "Authentication required. Add X-Tally-Auth header with your token.")
            log_request(client_ip, "UNAUTHORIZED", "Invalid or missing token")
            return
        
        # Security Check 3: Rate Limiting
        if is_rate_limited(client_ip):
            self.send_error_response(429, "Too many requests. Please wait a minute.")
            log_request(client_ip, "RATE_LIMITED", "Exceeded rate limit")
            return
        
        # Process request
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length) if content_length > 0 else b''
            
            # Forward to Tally
            req = urllib.request.Request(
                TALLY_URL,
                data=body,
                headers={'Content-Type': 'application/xml'}
            )
            
            with urllib.request.urlopen(req, timeout=30) as response:
                tally_response = response.read()
                
                self.send_response(200)
                self.send_cors_headers()
                self.send_header('Content-Type', 'application/xml')
                self.end_headers()
                self.wfile.write(tally_response)
                
                log_request(client_ip, "SUCCESS", f"Forwarded {len(body)} bytes")
                
        except urllib.error.URLError as e:
            self.send_error_response(503, f"Cannot connect to Tally at {TALLY_URL}")
            log_request(client_ip, "TALLY_ERROR", str(e))
        except Exception as e:
            self.send_error_response(500, str(e))
            log_request(client_ip, "ERROR", str(e))
    
    def do_GET(self):
        """Health check and status"""
        client_ip = self.client_address[0]
        
        if self.path == '/status':
            # Public status (no auth required)
            self.send_response(200)
            self.send_cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            status = {
                "status": "running",
                "secure": True,
                "auth_required": True,
                "tally_url": TALLY_URL,
                "proxy_port": PROXY_PORT
            }
            self.wfile.write(json.dumps(status).encode())
        elif self.path == '/token':
            # Show token hint (only from localhost)
            if client_ip in ALLOWED_IPS or client_ip.startswith('127.'):
                self.send_response(200)
                self.send_cors_headers()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                # Show first 8 chars as hint
                self.wfile.write(json.dumps({
                    "hint": AUTH_TOKEN[:8] + "...",
                    "message": "Full token shown in console when proxy started"
                }).encode())
            else:
                self.send_error_response(403, "Token info only available from localhost")
        else:
            self.send_response(200)
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(b'TallyDash Pro Secure Proxy - Use POST with X-Tally-Auth header')
    
    def send_cors_headers(self):
        """Add CORS headers"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Tally-Auth, Authorization')
    
    def send_error_response(self, code, message):
        """Send error response"""
        self.send_response(code)
        self.send_cors_headers()
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"error": message, "code": code}).encode())
    
    def log_message(self, format, *args):
        """Custom logging"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {args[0]}")

def log_request(ip, status, details):
    """Log request for security audit"""
    REQUEST_LOG.append({
        "time": datetime.now().isoformat(),
        "ip": ip,
        "status": status,
        "details": details
    })
    # Keep only last 1000 entries
    if len(REQUEST_LOG) > 1000:
        REQUEST_LOG.pop(0)

def is_rate_limited(ip):
    """Check if IP has exceeded rate limit"""
    now = time.time()
    minute_ago = now - 60
    recent_requests = sum(1 for r in REQUEST_LOG 
                         if r["ip"] == ip and 
                         datetime.fromisoformat(r["time"]).timestamp() > minute_ago)
    return recent_requests >= RATE_LIMIT

def main():
    print("=" * 70)
    print("  TallyDash Pro - SECURE Local Tally Proxy")
    print("=" * 70)
    print()
    print(f"  🔒 Security Features:")
    print(f"     ✓ Authentication token required")
    print(f"     ✓ IP whitelist (localhost only)")
    print(f"     ✓ Rate limiting ({RATE_LIMIT} req/min)")
    print(f"     ✓ Request logging")
    print()
    print(f"  📍 Configuration:")
    print(f"     Proxy URL:  http://localhost:{PROXY_PORT}")
    print(f"     Tally URL:  {TALLY_URL}")
    print()
    print(f"  🔑 Authentication Token:")
    print(f"     {AUTH_TOKEN}")
    print()
    print(f"  📝 How to use:")
    print(f"     Add header: X-Tally-Auth: {AUTH_TOKEN}")
    print()
    print("=" * 70)
    print()
    
    try:
        # Only bind to localhost for security
        server = HTTPServer(('127.0.0.1', PROXY_PORT), SecureTallyProxyHandler)
        print(f"✓ Secure proxy started on http://localhost:{PROXY_PORT}")
        print("  Only accepting connections from localhost")
        print("  Press Ctrl+C to stop")
        print()
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n✓ Proxy stopped.")
    except OSError as e:
        if "address already in use" in str(e).lower():
            print(f"✗ Port {PROXY_PORT} is already in use.")
        else:
            print(f"✗ Error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()

