#!/usr/bin/env python3
"""
TallyDash Pro - Local Tally Proxy
==================================
This small proxy runs on your computer and forwards requests to Tally,
adding the necessary CORS headers so your browser can communicate with Tally.

Usage:
  python tally_proxy.py                    # Connect to localhost:9000
  python tally_proxy.py 192.168.1.3        # Connect to Tally on another computer
  python tally_proxy.py 192.168.1.3 9000   # Custom IP and port

The proxy will run on http://localhost:8765
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.request
import urllib.error
import sys

# Parse command line arguments for Tally IP/port
TALLY_HOST = sys.argv[1] if len(sys.argv) > 1 else "localhost"
TALLY_PORT = sys.argv[2] if len(sys.argv) > 2 else "9000"
TALLY_URL = f"http://{TALLY_HOST}:{TALLY_PORT}"
PROXY_PORT = 8765

class TallyProxyHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()
    
    def do_POST(self):
        """Forward POST request to Tally"""
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
                
        except urllib.error.URLError as e:
            self.send_response(503)
            self.send_cors_headers()
            self.end_headers()
            error_msg = f"Cannot connect to Tally at {TALLY_URL}. Make sure Tally is running with Gateway enabled."
            self.wfile.write(error_msg.encode())
        except Exception as e:
            self.send_response(500)
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(str(e).encode())
    
    def do_GET(self):
        """Health check"""
        if self.path == '/status':
            self.send_response(200)
            self.send_cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"status": "running", "tally_url": "' + TALLY_URL.encode() + b'"}')
        else:
            self.send_response(200)
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(b'TallyDash Pro Proxy - Use POST to send Tally requests')
    
    def send_cors_headers(self):
        """Add CORS headers to allow browser access"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
    
    def log_message(self, format, *args):
        """Custom logging"""
        print(f"[Tally Proxy] {args[0]}")

def main():
    print("=" * 60)
    print("  TallyDash Pro - Local Tally Proxy")
    print("=" * 60)
    print(f"  Proxy URL:  http://localhost:{PROXY_PORT}")
    print(f"  Tally URL:  {TALLY_URL}")
    print("=" * 60)
    print()
    print("  This proxy allows your browser to connect to Tally.")
    print("  Keep this window open while using TallyDash Pro.")
    print()
    print("  Press Ctrl+C to stop.")
    print("=" * 60)
    print()
    
    try:
        server = HTTPServer(('localhost', PROXY_PORT), TallyProxyHandler)
        print(f"✓ Proxy started on http://localhost:{PROXY_PORT}")
        print("  Waiting for requests...")
        print()
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n✓ Proxy stopped.")
    except OSError as e:
        if "address already in use" in str(e).lower():
            print(f"✗ Port {PROXY_PORT} is already in use. Stop other programs using this port.")
        else:
            print(f"✗ Error starting proxy: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()

