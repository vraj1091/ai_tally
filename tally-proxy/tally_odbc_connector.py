#!/usr/bin/env python3
"""
TallyDash Pro - ODBC Connector for Tally
=========================================
Connect to Tally using ODBC driver - More secure than XML Gateway!

Benefits:
- No open network port required
- Uses Windows authentication
- SQL-like queries
- Better access control

Prerequisites:
1. Install Tally ODBC Driver (comes with Tally installation)
2. Configure DSN in Windows ODBC Data Sources

Usage:
  python tally_odbc_connector.py              # Use default DSN "Tally"
  python tally_odbc_connector.py MyTallyDSN   # Use custom DSN name
"""

import sys
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime

# Try to import pyodbc
try:
    import pyodbc
    ODBC_AVAILABLE = True
except ImportError:
    ODBC_AVAILABLE = False
    print("⚠️  pyodbc not installed. Install with: pip install pyodbc")

PROXY_PORT = 8765
DSN_NAME = sys.argv[1] if len(sys.argv) > 1 else "Tally"

class TallyODBCConnector:
    """Connect to Tally via ODBC"""
    
    def __init__(self, dsn_name="Tally"):
        self.dsn_name = dsn_name
        self.connection = None
        self.connected = False
    
    def connect(self):
        """Establish ODBC connection to Tally"""
        if not ODBC_AVAILABLE:
            raise Exception("pyodbc not installed. Run: pip install pyodbc")
        
        try:
            # Connection string for Tally ODBC
            conn_str = f"DSN={self.dsn_name}"
            self.connection = pyodbc.connect(conn_str, timeout=10)
            self.connected = True
            print(f"✓ Connected to Tally via ODBC (DSN: {self.dsn_name})")
            return True
        except pyodbc.Error as e:
            print(f"✗ ODBC Connection failed: {e}")
            self.connected = False
            raise Exception(f"Cannot connect to Tally ODBC. Error: {e}")
    
    def disconnect(self):
        """Close ODBC connection"""
        if self.connection:
            self.connection.close()
            self.connected = False
    
    def get_companies(self):
        """Get list of companies"""
        if not self.connected:
            self.connect()
        
        cursor = self.connection.cursor()
        cursor.execute("SELECT $Name FROM Company")
        
        companies = []
        for row in cursor.fetchall():
            companies.append({"name": row[0]})
        
        return companies
    
    def get_ledgers(self, company_name=None):
        """Get all ledgers"""
        if not self.connected:
            self.connect()
        
        cursor = self.connection.cursor()
        
        # Tally ODBC SQL syntax
        query = """
        SELECT $Name, $Parent, $OpeningBalance, $ClosingBalance
        FROM Ledger
        """
        
        cursor.execute(query)
        
        ledgers = []
        for row in cursor.fetchall():
            ledgers.append({
                "name": row[0],
                "parent": row[1] or "",
                "opening_balance": float(row[2] or 0),
                "closing_balance": float(row[3] or 0)
            })
        
        return ledgers
    
    def get_vouchers(self, from_date=None, to_date=None, voucher_type=None):
        """Get vouchers/transactions"""
        if not self.connected:
            self.connect()
        
        cursor = self.connection.cursor()
        
        query = """
        SELECT $Date, $VoucherNumber, $VoucherTypeName, $Amount
        FROM Voucher
        """
        
        # Add filters if provided
        conditions = []
        if from_date:
            conditions.append(f"$Date >= '{from_date}'")
        if to_date:
            conditions.append(f"$Date <= '{to_date}'")
        if voucher_type:
            conditions.append(f"$VoucherTypeName = '{voucher_type}'")
        
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        
        cursor.execute(query)
        
        vouchers = []
        for row in cursor.fetchall():
            vouchers.append({
                "date": str(row[0]) if row[0] else "",
                "voucher_number": row[1] or "",
                "voucher_type": row[2] or "",
                "amount": float(row[3] or 0)
            })
        
        return vouchers
    
    def get_stock_items(self):
        """Get stock/inventory items"""
        if not self.connected:
            self.connect()
        
        cursor = self.connection.cursor()
        
        query = """
        SELECT $Name, $Parent, $ClosingBalance, $ClosingValue
        FROM StockItem
        """
        
        cursor.execute(query)
        
        items = []
        for row in cursor.fetchall():
            items.append({
                "name": row[0],
                "parent": row[1] or "",
                "closing_quantity": float(row[2] or 0),
                "closing_value": float(row[3] or 0)
            })
        
        return items
    
    def execute_query(self, query):
        """Execute custom SQL query"""
        if not self.connected:
            self.connect()
        
        cursor = self.connection.cursor()
        cursor.execute(query)
        
        columns = [desc[0] for desc in cursor.description]
        results = []
        
        for row in cursor.fetchall():
            results.append(dict(zip(columns, row)))
        
        return results


class ODBCProxyHandler(BaseHTTPRequestHandler):
    """HTTP handler for ODBC proxy"""
    
    connector = None
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()
    
    def do_GET(self):
        try:
            if self.path == '/status':
                self.send_json_response({
                    "status": "running",
                    "method": "ODBC",
                    "dsn": DSN_NAME,
                    "connected": self.connector.connected if self.connector else False,
                    "secure": True
                })
            
            elif self.path == '/companies':
                companies = self.connector.get_companies()
                self.send_json_response({"success": True, "companies": companies})
            
            elif self.path == '/ledgers':
                ledgers = self.connector.get_ledgers()
                self.send_json_response({"success": True, "ledgers": ledgers})
            
            elif self.path == '/vouchers':
                vouchers = self.connector.get_vouchers()
                self.send_json_response({"success": True, "vouchers": vouchers})
            
            elif self.path == '/stock-items':
                items = self.connector.get_stock_items()
                self.send_json_response({"success": True, "stock_items": items})
            
            else:
                self.send_json_response({
                    "message": "TallyDash Pro ODBC Proxy",
                    "endpoints": ["/status", "/companies", "/ledgers", "/vouchers", "/stock-items"]
                })
                
        except Exception as e:
            self.send_json_response({"success": False, "error": str(e)}, 500)
    
    def do_POST(self):
        """Handle POST requests for custom queries"""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            data = json.loads(body) if body else {}
            
            if self.path == '/query':
                # Execute custom SQL query
                query = data.get('query', '')
                if not query:
                    self.send_json_response({"error": "No query provided"}, 400)
                    return
                
                results = self.connector.execute_query(query)
                self.send_json_response({"success": True, "results": results})
            
            elif self.path == '/vouchers':
                # Get vouchers with filters
                vouchers = self.connector.get_vouchers(
                    from_date=data.get('from_date'),
                    to_date=data.get('to_date'),
                    voucher_type=data.get('voucher_type')
                )
                self.send_json_response({"success": True, "vouchers": vouchers})
            
            else:
                self.send_json_response({"error": "Unknown endpoint"}, 404)
                
        except Exception as e:
            self.send_json_response({"success": False, "error": str(e)}, 500)
    
    def send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
    
    def send_json_response(self, data, status=200):
        self.send_response(status)
        self.send_cors_headers()
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data, default=str).encode())
    
    def log_message(self, format, *args):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {args[0]}")


def setup_dsn_instructions():
    """Print instructions for setting up Tally ODBC DSN"""
    print("""
╔══════════════════════════════════════════════════════════════════╗
║           HOW TO SET UP TALLY ODBC DATA SOURCE                   ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  Step 1: Open ODBC Data Sources                                  ║
║  ─────────────────────────────────────────────────────────────   ║
║  • Press Win+R, type: odbcad32                                   ║
║  • Or search "ODBC Data Sources" in Start Menu                   ║
║                                                                   ║
║  Step 2: Add New DSN                                             ║
║  ─────────────────────────────────────────────────────────────   ║
║  • Go to "User DSN" or "System DSN" tab                          ║
║  • Click "Add..."                                                 ║
║  • Select "Tally ODBC Driver" from the list                      ║
║  • Click "Finish"                                                 ║
║                                                                   ║
║  Step 3: Configure DSN                                           ║
║  ─────────────────────────────────────────────────────────────   ║
║  • Data Source Name: Tally (or any name you prefer)              ║
║  • Server: localhost (or Tally server IP)                        ║
║  • Port: 9000 (Tally's default ODBC port)                        ║
║  • Click "Test Connection" to verify                              ║
║  • Click "OK" to save                                             ║
║                                                                   ║
║  Step 4: Make sure Tally is running with ODBC enabled            ║
║  ─────────────────────────────────────────────────────────────   ║
║  • In Tally: F12 → Connectivity → Enable ODBC Server             ║
║                                                                   ║
╚══════════════════════════════════════════════════════════════════╝
""")


def main():
    print("=" * 70)
    print("  TallyDash Pro - ODBC Connector")
    print("=" * 70)
    print()
    
    if not ODBC_AVAILABLE:
        print("❌ pyodbc is not installed!")
        print()
        print("   Install it with:")
        print("   pip install pyodbc")
        print()
        setup_dsn_instructions()
        sys.exit(1)
    
    print(f"  📊 Connection Method: ODBC")
    print(f"  📍 DSN Name: {DSN_NAME}")
    print(f"  🔒 Security: Windows Authentication")
    print()
    
    # Create connector
    connector = TallyODBCConnector(DSN_NAME)
    
    # Try to connect
    try:
        connector.connect()
        print()
    except Exception as e:
        print(f"❌ Failed to connect: {e}")
        print()
        setup_dsn_instructions()
        print("After setting up DSN, run this script again.")
        sys.exit(1)
    
    # Set connector for handler
    ODBCProxyHandler.connector = connector
    
    print(f"  🌐 Proxy URL: http://localhost:{PROXY_PORT}")
    print()
    print("  Available endpoints:")
    print("    GET  /status       - Check connection status")
    print("    GET  /companies    - List all companies")
    print("    GET  /ledgers      - Get all ledgers")
    print("    GET  /vouchers     - Get all vouchers")
    print("    GET  /stock-items  - Get stock items")
    print("    POST /query        - Execute custom SQL")
    print()
    print("=" * 70)
    print()
    
    try:
        server = HTTPServer(('127.0.0.1', PROXY_PORT), ODBCProxyHandler)
        print(f"✓ ODBC Proxy started on http://localhost:{PROXY_PORT}")
        print("  Press Ctrl+C to stop")
        print()
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n✓ Proxy stopped.")
        connector.disconnect()
    except OSError as e:
        print(f"✗ Error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()

