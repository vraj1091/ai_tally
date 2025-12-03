# TallyDash Pro - Tally Connection Options

Multiple secure ways to connect TallyDash Pro to your Tally ERP.

## Connection Methods

| Method | Security | Setup | Best For |
|--------|----------|-------|----------|
| **ODBC Connector** | ⭐⭐⭐⭐⭐ | Medium | Production use |
| **Secure Proxy** | ⭐⭐⭐⭐ | Easy | Development |
| **Basic Proxy** | ⭐⭐ | Easy | Quick testing |
| **Backup File** | ⭐⭐⭐⭐⭐ | Easiest | Offline analysis |

---

## Method 1: ODBC Connector (Most Secure) ⭐

Uses Windows ODBC driver - no open network ports!

### Setup ODBC:

1. **Open ODBC Data Sources:**
   - Press `Win+R`, type `odbcad32`, press Enter
   - Or search "ODBC Data Sources" in Start Menu

2. **Add New DSN:**
   - Go to "User DSN" or "System DSN" tab
   - Click "Add..."
   - Select "Tally ODBC Driver"
   - Configure:
     - Name: `Tally`
     - Server: `localhost` (or Tally server IP)
     - Port: `9000`
   - Click "OK"

3. **Enable ODBC in Tally:**
   - In Tally: `F12` → `Connectivity` → Enable ODBC Server

4. **Run ODBC Connector:**
   ```bash
   pip install pyodbc
   python tally_odbc_connector.py
   ```

---

## Method 2: Secure Proxy (Recommended)

Has authentication, rate limiting, and logging.

```bash
python secure_tally_proxy.py 192.168.1.3 19000
```

Features:
- 🔑 Authentication token required
- 🌐 Localhost-only connections
- ⏱️ Rate limiting (60 req/min)
- 📝 Request logging

---

## Method 3: Basic Proxy (Quick Setup)

Simple proxy for testing.

```bash
python tally_proxy.py 192.168.1.3 9000
```

---

## Method 4: Backup File (Safest)

No network connection needed!

1. In Tally: `Gateway` → `Export` → `Data` → `Day Book`
2. Export as XML
3. Upload to TallyDash Pro

---

## Why is a proxy needed?

- TallyDash Pro's backend runs in the cloud (HuggingFace)
- Your Tally runs locally on your computer
- The cloud cannot reach your local Tally
- BUT your browser CAN reach your local Tally!
- The proxy adds CORS headers so your browser can communicate with Tally

## Quick Start

### Step 1: Enable Tally Gateway

1. Open **Tally ERP 9 / Tally Prime**
2. Press **F12** (Configure)
3. Go to **Connectivity** → **Server**
4. Enable **"Act as Server"**
5. Set **Port: 9000**
6. Press **Enter** to save
7. **Restart Tally** for changes to take effect

### Step 2: Start the Proxy

**Windows:**
```
Double-click: start_proxy.bat
```

**Or manually:**
```bash
python tally_proxy.py
```

### Step 3: Use TallyDash Pro

1. Go to TallyDash Pro website
2. Click **"Live Tally"** mode
3. Your companies will appear automatically!

## Troubleshooting

### "Cannot connect to Tally"
- Make sure Tally is running
- Make sure Gateway is enabled (F12 → Server)
- Make sure port 9000 is set
- Restart Tally after enabling Gateway

### "Port 8765 already in use"
- Another program is using this port
- Close that program or change PROXY_PORT in tally_proxy.py

### "Python not found"
- Install Python 3 from https://www.python.org/downloads/
- Make sure to check "Add Python to PATH" during installation

## Technical Details

- Proxy runs on: `http://localhost:8765`
- Tally Gateway: `http://localhost:9000`
- The proxy simply forwards requests and adds CORS headers

## Security Note

This proxy only runs locally on your computer. It doesn't expose your Tally to the internet - it only allows your own browser to communicate with your own Tally installation.

