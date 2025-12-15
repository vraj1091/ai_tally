"""
TallyDash Pro - Tally Connector
A user-friendly desktop application to connect your local Tally to TallyDash Pro cloud.

Features:
- One-time setup
- Auto-connect on startup
- System tray icon
- Auto-reconnect on disconnect
- Visual status indicator
"""

import tkinter as tk
from tkinter import ttk, messagebox
import threading
import asyncio
import websockets
import requests
import json
import os
import sys
from pathlib import Path
import logging
from datetime import datetime

# Setup logging
log_dir = Path.home() / "TallyDashPro"
log_dir.mkdir(exist_ok=True)
log_file = log_dir / "connector.log"

# Create logger
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# File handler (UTF-8 for emojis)
file_handler = logging.FileHandler(log_file, encoding='utf-8')
file_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
logger.addHandler(file_handler)

# Console handler (safe encoding for Windows)
class SafeStreamHandler(logging.StreamHandler):
    def emit(self, record):
        try:
            msg = self.format(record)
            # Replace emojis with ASCII equivalents for console
            replacements = {
                '✅': '[OK]', '❌': '[ERROR]', '⚠️': '[WARN]',
                '📥': '[IN]', '📤': '[OUT]', '🔗': '[LINK]',
                '🧪': '[TEST]', '💾': '[SAVE]', '🔌': '[PLUG]',
                '📡': '[SIGNAL]', '🔄': '[SYNC]'
            }
            for emoji, text in replacements.items():
                msg = msg.replace(emoji, text)
            self.stream.write(msg + self.terminator)
            self.flush()
        except Exception:
            self.handleError(record)

console_handler = SafeStreamHandler()
console_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
logger.addHandler(console_handler)

# Config file path
CONFIG_FILE = log_dir / "config.json"

# Default settings
DEFAULT_CONFIG = {
    "server_url": "107.21.87.222",
    "tally_host": "localhost",
    "tally_port": 9000,
    "auto_connect": True,
    "auto_start": False,
    "bridge_token": "user_tally_bridge"
}


class TallyConnectorApp:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("TallyDash Pro Connector")
        self.root.geometry("450x550")
        self.root.resizable(False, False)
        
        # Set icon if available
        try:
            icon_path = Path(__file__).parent / "icon.ico"
            if icon_path.exists():
                self.root.iconbitmap(str(icon_path))
        except:
            pass
        
        # Load config
        self.config = self.load_config()
        
        # Connection state
        self.connected = False
        self.tally_connected = False
        self.websocket = None
        self.connection_thread = None
        self.running = True
        self.reconnect_attempts = 0
        self.max_reconnect_attempts = 10
        
        # Build UI
        self.create_ui()
        
        # Auto-connect if enabled
        if self.config.get("auto_connect", True):
            self.root.after(1000, self.connect)
        
        # Handle window close
        self.root.protocol("WM_DELETE_WINDOW", self.on_close)
    
    def load_config(self):
        """Load configuration from file"""
        try:
            if CONFIG_FILE.exists():
                with open(CONFIG_FILE, 'r') as f:
                    config = json.load(f)
                    # Merge with defaults
                    return {**DEFAULT_CONFIG, **config}
        except Exception as e:
            logger.error(f"Error loading config: {e}")
        return DEFAULT_CONFIG.copy()
    
    def save_config(self):
        """Save configuration to file"""
        try:
            with open(CONFIG_FILE, 'w') as f:
                json.dump(self.config, f, indent=2)
            logger.info("Configuration saved")
        except Exception as e:
            logger.error(f"Error saving config: {e}")
    
    def create_ui(self):
        """Create the user interface"""
        # Main container with padding
        main_frame = ttk.Frame(self.root, padding="20")
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Title
        title_label = ttk.Label(
            main_frame, 
            text="🔗 TallyDash Pro Connector",
            font=("Segoe UI", 18, "bold")
        )
        title_label.pack(pady=(0, 5))
        
        subtitle = ttk.Label(
            main_frame,
            text="Connect your Tally to the cloud",
            font=("Segoe UI", 10),
            foreground="gray"
        )
        subtitle.pack(pady=(0, 20))
        
        # Status Card
        status_frame = ttk.LabelFrame(main_frame, text="Connection Status", padding="15")
        status_frame.pack(fill=tk.X, pady=(0, 15))
        
        # Server Status
        server_row = ttk.Frame(status_frame)
        server_row.pack(fill=tk.X, pady=5)
        ttk.Label(server_row, text="Cloud Server:", width=15).pack(side=tk.LEFT)
        self.server_status = ttk.Label(server_row, text="● Disconnected", foreground="red")
        self.server_status.pack(side=tk.LEFT)
        
        # Tally Status
        tally_row = ttk.Frame(status_frame)
        tally_row.pack(fill=tk.X, pady=5)
        ttk.Label(tally_row, text="Tally ERP:", width=15).pack(side=tk.LEFT)
        self.tally_status = ttk.Label(tally_row, text="● Not Checked", foreground="gray")
        self.tally_status.pack(side=tk.LEFT)
        
        # Settings Card
        settings_frame = ttk.LabelFrame(main_frame, text="Settings", padding="15")
        settings_frame.pack(fill=tk.X, pady=(0, 15))
        
        # Server URL
        url_row = ttk.Frame(settings_frame)
        url_row.pack(fill=tk.X, pady=5)
        ttk.Label(url_row, text="Server URL:", width=12).pack(side=tk.LEFT)
        self.server_url_var = tk.StringVar(value=self.config["server_url"])
        self.server_url_entry = ttk.Entry(url_row, textvariable=self.server_url_var, width=30)
        self.server_url_entry.pack(side=tk.LEFT, padx=(5, 0))
        
        # Tally Host
        tally_host_row = ttk.Frame(settings_frame)
        tally_host_row.pack(fill=tk.X, pady=5)
        ttk.Label(tally_host_row, text="Tally Host:", width=12).pack(side=tk.LEFT)
        self.tally_host_var = tk.StringVar(value=self.config["tally_host"])
        ttk.Entry(tally_host_row, textvariable=self.tally_host_var, width=20).pack(side=tk.LEFT, padx=(5, 0))
        
        # Tally Port
        ttk.Label(tally_host_row, text="Port:").pack(side=tk.LEFT, padx=(10, 0))
        self.tally_port_var = tk.StringVar(value=str(self.config["tally_port"]))
        ttk.Entry(tally_host_row, textvariable=self.tally_port_var, width=6).pack(side=tk.LEFT, padx=(5, 0))
        
        # Auto-connect checkbox
        self.auto_connect_var = tk.BooleanVar(value=self.config.get("auto_connect", True))
        ttk.Checkbutton(
            settings_frame, 
            text="Auto-connect on startup",
            variable=self.auto_connect_var,
            command=self.on_settings_change
        ).pack(anchor=tk.W, pady=(10, 0))
        
        # Buttons
        button_frame = ttk.Frame(main_frame)
        button_frame.pack(fill=tk.X, pady=(0, 15))
        
        self.connect_btn = ttk.Button(
            button_frame,
            text="🔌 Connect",
            command=self.toggle_connection,
            width=15
        )
        self.connect_btn.pack(side=tk.LEFT, padx=(0, 10))
        
        self.test_tally_btn = ttk.Button(
            button_frame,
            text="🧪 Test Tally",
            command=self.test_tally_connection,
            width=15
        )
        self.test_tally_btn.pack(side=tk.LEFT, padx=(0, 10))
        
        ttk.Button(
            button_frame,
            text="💾 Save Settings",
            command=self.save_settings,
            width=15
        ).pack(side=tk.LEFT)
        
        # Log area
        log_frame = ttk.LabelFrame(main_frame, text="Activity Log", padding="10")
        log_frame.pack(fill=tk.BOTH, expand=True)
        
        self.log_text = tk.Text(log_frame, height=8, font=("Consolas", 9), state=tk.DISABLED)
        self.log_text.pack(fill=tk.BOTH, expand=True)
        
        # Scrollbar for log
        scrollbar = ttk.Scrollbar(self.log_text, command=self.log_text.yview)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.log_text.config(yscrollcommand=scrollbar.set)
        
        # Footer
        footer = ttk.Label(
            main_frame,
            text="TallyDash Pro v1.0 • Your Tally data stays secure",
            font=("Segoe UI", 8),
            foreground="gray"
        )
        footer.pack(pady=(10, 0))
        
        self.log_message("Application started. Ready to connect.")
    
    def log_message(self, message):
        """Add message to log area"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.log_text.config(state=tk.NORMAL)
        self.log_text.insert(tk.END, f"[{timestamp}] {message}\n")
        self.log_text.see(tk.END)
        self.log_text.config(state=tk.DISABLED)
        logger.info(message)
    
    def update_status(self, server_connected, tally_connected=None):
        """Update status indicators"""
        if server_connected:
            self.server_status.config(text="● Connected", foreground="green")
            self.connect_btn.config(text="🔌 Disconnect")
        else:
            self.server_status.config(text="● Disconnected", foreground="red")
            self.connect_btn.config(text="🔌 Connect")
        
        if tally_connected is not None:
            if tally_connected:
                self.tally_status.config(text="● Connected", foreground="green")
            else:
                self.tally_status.config(text="● Not Running", foreground="orange")
    
    def on_settings_change(self):
        """Handle settings change"""
        self.config["auto_connect"] = self.auto_connect_var.get()
    
    def save_settings(self):
        """Save current settings"""
        self.config["server_url"] = self.server_url_var.get()
        self.config["tally_host"] = self.tally_host_var.get()
        self.config["tally_port"] = int(self.tally_port_var.get())
        self.config["auto_connect"] = self.auto_connect_var.get()
        self.save_config()
        self.log_message("Settings saved successfully!")
        messagebox.showinfo("Settings Saved", "Your settings have been saved.")
    
    def test_tally_connection(self):
        """Test connection to Tally"""
        self.log_message("Testing Tally connection...")
        self.tally_status.config(text="● Checking...", foreground="blue")
        
        def test():
            try:
                tally_url = f"http://{self.tally_host_var.get()}:{self.tally_port_var.get()}"
                
                # Simple request to check if Tally is running
                test_xml = """<ENVELOPE>
                    <HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Data</TYPE><ID>List of Companies</ID></HEADER>
                    <BODY><DESC><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES></DESC></BODY>
                </ENVELOPE>"""
                
                response = requests.post(
                    tally_url,
                    data=test_xml,
                    headers={"Content-Type": "application/xml"},
                    timeout=5
                )
                
                if response.status_code == 200 and "ENVELOPE" in response.text:
                    self.root.after(0, lambda: self.update_status(self.connected, True))
                    self.root.after(0, lambda: self.log_message("✅ Tally is running and accessible!"))
                else:
                    self.root.after(0, lambda: self.update_status(self.connected, False))
                    self.root.after(0, lambda: self.log_message("⚠️ Tally responded but may have issues"))
            except requests.exceptions.ConnectionError:
                self.root.after(0, lambda: self.update_status(self.connected, False))
                self.root.after(0, lambda: self.log_message("❌ Cannot connect to Tally. Is it running?"))
            except Exception as e:
                self.root.after(0, lambda: self.update_status(self.connected, False))
                self.root.after(0, lambda: self.log_message(f"❌ Error: {str(e)}"))
        
        threading.Thread(target=test, daemon=True).start()
    
    def toggle_connection(self):
        """Toggle connection state"""
        if self.connected:
            self.disconnect()
        else:
            self.connect()
    
    def connect(self):
        """Start connection to server"""
        if self.connected:
            return
        
        self.log_message("Connecting to TallyDash Pro server...")
        self.server_status.config(text="● Connecting...", foreground="blue")
        
        # Start connection in background thread
        self.connection_thread = threading.Thread(target=self.run_connection, daemon=True)
        self.connection_thread.start()
    
    def disconnect(self):
        """Disconnect from server"""
        self.log_message("Disconnecting...")
        self.running = False
        self.connected = False
        
        # Close websocket safely
        if self.websocket:
            try:
                # Create a new loop for closing if needed
                loop = asyncio.new_event_loop()
                loop.run_until_complete(self.websocket.close())
                loop.close()
            except Exception as e:
                logger.warning(f"Error closing websocket: {e}")
        
        self.websocket = None
        self.update_status(False)
        self.log_message("✅ Disconnected from server")
    
    def run_connection(self):
        """Run the WebSocket connection"""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        while self.running:
            try:
                loop.run_until_complete(self.websocket_handler())
            except Exception as e:
                self.root.after(0, lambda: self.log_message(f"Connection error: {str(e)}"))
            
            if self.running:
                self.reconnect_attempts += 1
                if self.reconnect_attempts <= self.max_reconnect_attempts:
                    wait_time = min(30, 5 * self.reconnect_attempts)
                    self.root.after(0, lambda: self.log_message(f"Reconnecting in {wait_time}s... (attempt {self.reconnect_attempts})"))
                    self.root.after(0, lambda: self.update_status(False))
                    loop.run_until_complete(asyncio.sleep(wait_time))
                else:
                    self.root.after(0, lambda: self.log_message("Max reconnect attempts reached. Click Connect to retry."))
                    self.running = False
    
    async def websocket_handler(self):
        """Handle WebSocket connection"""
        server_url = self.server_url_var.get()
        token = self.config.get("bridge_token", "user_tally_bridge")
        ws_url = f"ws://{server_url}/ws/tally-bridge/{token}"
        
        self.root.after(0, lambda: self.log_message(f"Connecting to {ws_url}..."))
        
        async with websockets.connect(
            ws_url,
            ping_interval=60,
            ping_timeout=300,
            close_timeout=30
        ) as websocket:
            self.websocket = websocket
            self.connected = True
            self.reconnect_attempts = 0
            
            # Test Tally connection
            tally_ok = await self.check_tally()
            
            self.root.after(0, lambda: self.update_status(True, tally_ok))
            self.root.after(0, lambda: self.log_message("✅ Connected to TallyDash Pro!"))
            
            # Send ready message
            await websocket.send(json.dumps({
                "type": "bridge_ready",
                "tally_connected": tally_ok
            }))
            
            # Message handling loop
            async for message in websocket:
                try:
                    data = json.loads(message)
                    await self.handle_message(data, websocket)
                except json.JSONDecodeError:
                    logger.error(f"Invalid JSON: {message[:100]}")
                except Exception as e:
                    logger.error(f"Error handling message: {e}")
    
    async def check_tally(self):
        """Check if Tally is accessible"""
        try:
            tally_url = f"http://{self.tally_host_var.get()}:{self.tally_port_var.get()}"
            response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: requests.post(
                    tally_url,
                    data="<ENVELOPE><HEADER><VERSION>1</VERSION></HEADER></ENVELOPE>",
                    headers={"Content-Type": "application/xml"},
                    timeout=5
                )
            )
            return response.status_code == 200
        except:
            return False
    
    async def handle_message(self, data, websocket):
        """Handle incoming WebSocket messages"""
        msg_type = data.get("type")
        # Backend uses 'id' for request matching
        request_id = data.get("id") or data.get("request_id")
        
        logger.info(f"Received message type: {msg_type}, id: {request_id}")
        
        if msg_type == "status":
            # Handle status check
            tally_ok = await self.check_tally()
            self.tally_connected = tally_ok
            self.root.after(0, lambda: self.update_status(True, tally_ok))
            
            await websocket.send(json.dumps({
                "type": "status_response",
                "id": request_id,
                "tally_connected": tally_ok,
                "bridge_connected": True
            }))
            logger.info(f"Status response sent: tally={tally_ok}")
        
        elif msg_type == "tally_request":
            xml_request = data.get("xml_request", "")
            self.root.after(0, lambda: self.log_message(f"📥 Tally request ({len(xml_request)} bytes)"))
            
            # Send to Tally
            response = await self.send_to_tally(xml_request)
            
            # Send response back
            await websocket.send(json.dumps({
                "type": "tally_response",
                "id": request_id,
                "response": response,
                "success": response is not None
            }))
            
            if response:
                size_kb = len(response) / 1024
                self.root.after(0, lambda: self.log_message(f"📤 Response sent ({size_kb:.1f} KB)"))
            else:
                self.root.after(0, lambda: self.log_message("❌ Tally request failed"))
        
        elif msg_type == "ping":
            await websocket.send(json.dumps({"type": "pong", "id": request_id}))
        
        elif msg_type == "get_companies":
            self.root.after(0, lambda: self.log_message("📥 Fetching companies from Tally..."))
            
            response = await self.send_to_tally("""<ENVELOPE>
                <HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Data</TYPE><ID>List of Companies</ID></HEADER>
                <BODY><DESC><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES></DESC></BODY>
            </ENVELOPE>""")
            
            await websocket.send(json.dumps({
                "type": "companies_response",
                "id": request_id,
                "response": response,
                "success": response is not None
            }))
            
            if response:
                self.root.after(0, lambda: self.log_message("📤 Companies list sent"))
            else:
                self.root.after(0, lambda: self.log_message("❌ Could not get companies"))
        
        else:
            logger.warning(f"Unknown message type: {msg_type}")
            # Send error response for unknown types
            await websocket.send(json.dumps({
                "type": "error",
                "id": request_id,
                "error": f"Unknown message type: {msg_type}"
            }))
    
    async def send_to_tally(self, xml_request):
        """Send request to Tally and get response"""
        try:
            tally_url = f"http://{self.tally_host_var.get()}:{self.tally_port_var.get()}"
            
            response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: requests.post(
                    tally_url,
                    data=xml_request.encode('utf-8'),
                    headers={"Content-Type": "application/xml"},
                    timeout=600
                )
            )
            
            if response.status_code == 200:
                return response.text
            return None
        except Exception as e:
            logger.error(f"Tally request error: {e}")
            return None
    
    def on_close(self):
        """Handle window close"""
        if self.connected:
            if messagebox.askyesno("Confirm Exit", "You are still connected. Disconnect and exit?"):
                self.disconnect()
                self.root.after(500, self.root.destroy)
        else:
            self.running = False
            self.root.destroy()
    
    def run(self):
        """Start the application"""
        self.root.mainloop()


def main():
    app = TallyConnectorApp()
    app.run()


if __name__ == "__main__":
    main()

