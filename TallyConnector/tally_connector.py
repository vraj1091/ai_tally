#!/usr/bin/env python3
"""
Tally Connector - WebSocket Bridge for Live Tally Connection
Connects your local Tally ERP to the cloud backend via WebSocket

Usage:
    python tally_connector.py

Requirements:
    pip install websockets requests
"""

import asyncio
import json
import sys
import requests
import websockets
from datetime import datetime

# Configuration
# Use port 80 (nginx) instead of 8000 - nginx proxies /ws/ to backend
BACKEND_URL = "ws://107.21.87.222"  # Your EC2 backend (via nginx on port 80)
TALLY_URL = "http://localhost:9000"  # Local Tally Gateway
USER_TOKEN = "user_tally_bridge"     # Unique identifier for this bridge

class TallyConnector:
    def __init__(self):
        self.ws = None
        self.tally_connected = False
        self.running = True
        
    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] [{level}] {message}")
    
    def test_tally_connection(self):
        """Test if Tally is accessible"""
        try:
            # Simple test request to Tally
            test_xml = """<ENVELOPE>
                <HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Data</TYPE><ID>Tally Test</ID></HEADER>
                <BODY><DESC><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES></DESC></BODY>
            </ENVELOPE>"""
            
            response = requests.post(
                TALLY_URL,
                data=test_xml,
                headers={'Content-Type': 'application/xml'},
                timeout=5
            )
            
            if response.status_code == 200 and len(response.text) > 50:
                self.log("✅ Tally is accessible", "SUCCESS")
                self.tally_connected = True
                return True
            else:
                self.log(f"❌ Tally responded but with unexpected content", "ERROR")
                return False
                
        except requests.exceptions.ConnectionError:
            self.log(f"❌ Cannot connect to Tally at {TALLY_URL}", "ERROR")
            self.log("   Make sure Tally is running with Gateway Server enabled", "INFO")
            return False
        except Exception as e:
            self.log(f"❌ Error testing Tally: {e}", "ERROR")
            return False
    
    def send_to_tally(self, xml_request):
        """Send XML request to Tally and return response"""
        try:
            response = requests.post(
                TALLY_URL,
                data=xml_request,
                headers={'Content-Type': 'application/xml'},
                timeout=600  # 10 minutes for very large data (up to 2GB)
            )
            return {
                'success': True,
                'data': response.text,
                'status_code': response.status_code
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    async def handle_message(self, message):
        """Handle incoming WebSocket message from backend"""
        try:
            data = json.loads(message)
            msg_type = data.get('type', '')
            msg_id = data.get('id', '')
            
            self.log(f"📨 Received: {msg_type}", "DEBUG")
            
            if msg_type == 'ping':
                # Respond to ping
                await self.ws.send(json.dumps({
                    'type': 'pong',
                    'id': msg_id
                }))
                
            elif msg_type == 'tally_request':
                # Forward request to Tally
                # Backend sends 'payload', fallback to 'xml' for compatibility
                xml_request = data.get('payload', data.get('xml', ''))
                self.log(f"📤 Forwarding request to Tally...", "INFO")
                
                result = self.send_to_tally(xml_request)
                
                await self.ws.send(json.dumps({
                    'type': 'tally_response',
                    'id': msg_id,
                    'success': result.get('success', False),
                    'content': result.get('data', ''),
                    'error': result.get('error', None)
                }))
                
                if result['success']:
                    self.log(f"✅ Tally response sent ({len(result.get('data', ''))} bytes)", "SUCCESS")
                else:
                    self.log(f"❌ Tally request failed: {result.get('error', 'Unknown error')}", "ERROR")
                    
            elif msg_type == 'status':
                # Send status - use tally_connected to match frontend expectation
                await self.ws.send(json.dumps({
                    'type': 'status_response',
                    'id': msg_id,
                    'success': True,
                    'connected': True,
                    'tally_connected': self.tally_connected,
                    'tally_url': TALLY_URL
                }))
            
            elif msg_type == 'get_companies':
                # Fetch companies from Tally
                self.log("📤 Fetching companies from Tally...", "INFO")
                
                companies_xml = """<ENVELOPE>
                    <HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>Companies</ID></HEADER>
                    <BODY><DESC><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES>
                    <TDL><TDLMESSAGE><COLLECTION NAME="Companies"><TYPE>Company</TYPE><FETCH>Name,StartingFrom,BooksFrom</FETCH></COLLECTION></TDLMESSAGE></TDL>
                    </DESC></BODY></ENVELOPE>"""
                
                result = self.send_to_tally(companies_xml)
                
                companies = []
                if result['success']:
                    # Parse XML response to extract company names
                    import re
                    company_matches = re.findall(r'<NAME[^>]*>([^<]+)</NAME>', result.get('data', ''))
                    companies = [{'name': name} for name in company_matches if name]
                    self.log(f"✅ Found {len(companies)} companies", "SUCCESS")
                
                await self.ws.send(json.dumps({
                    'type': 'companies_response',
                    'id': msg_id,
                    'success': result.get('success', False),
                    'companies': companies,
                    'error': result.get('error', None)
                }))
                
        except json.JSONDecodeError:
            self.log(f"❌ Invalid JSON message", "ERROR")
        except Exception as e:
            self.log(f"❌ Error handling message: {e}", "ERROR")
    
    async def connect(self):
        """Connect to backend WebSocket"""
        ws_url = f"{BACKEND_URL}/ws/tally-bridge/{USER_TOKEN}"
        self.log(f"🔌 Connecting to {ws_url}...", "INFO")
        
        try:
            # max_size=2GB to handle very large Tally backups
            # ping_interval=30 to keep connection alive
            # close_timeout=300 for slow responses
            async with websockets.connect(
                ws_url, 
                ping_interval=30,
                ping_timeout=120,
                close_timeout=300,
                max_size=2 * 1024 * 1024 * 1024  # 2GB max message size
            ) as websocket:
                self.ws = websocket
                self.log("✅ Connected to backend!", "SUCCESS")
                
                # Send initial status
                await websocket.send(json.dumps({
                    'type': 'bridge_ready',
                    'tally_connected': self.tally_connected,
                    'tally_url': TALLY_URL
                }))
                
                self.log("🎉 Tally Bridge is ready!", "SUCCESS")
                self.log(f"   Tally URL: {TALLY_URL}", "INFO")
                self.log(f"   Backend: {BACKEND_URL}", "INFO")
                self.log("   Press Ctrl+C to stop", "INFO")
                print("-" * 50)
                
                # Listen for messages
                async for message in websocket:
                    await self.handle_message(message)
                    
        except websockets.exceptions.ConnectionClosed:
            self.log("🔌 Connection closed", "WARNING")
        except Exception as e:
            self.log(f"❌ Connection error: {e}", "ERROR")
    
    async def run(self):
        """Main run loop with reconnection"""
        while self.running:
            try:
                # Test Tally connection
                self.test_tally_connection()
                
                # Connect to backend
                await self.connect()
                
                # Wait before reconnecting
                self.log("🔄 Reconnecting in 5 seconds...", "INFO")
                await asyncio.sleep(5)
                
            except KeyboardInterrupt:
                self.log("👋 Shutting down...", "INFO")
                self.running = False
                break
            except Exception as e:
                self.log(f"❌ Error: {e}", "ERROR")
                await asyncio.sleep(5)


def main():
    print("=" * 50)
    print("   TALLY CONNECTOR - WebSocket Bridge")
    print("=" * 50)
    print(f"Backend: {BACKEND_URL}")
    print(f"Tally:   {TALLY_URL}")
    print("=" * 50)
    print()
    
    connector = TallyConnector()
    
    try:
        asyncio.run(connector.run())
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")
        sys.exit(0)


if __name__ == "__main__":
    main()

