# TallyDash Pro - Local Tally Proxy

This small proxy allows the TallyDash Pro web application (running in your browser) to communicate directly with Tally ERP running on your computer.

## Why is this needed?

- TallyDash Pro's backend runs in the cloud (HuggingFace)
- Your Tally runs locally on your computer
- The cloud cannot reach your local Tally
- BUT your browser CAN reach your local Tally!
- This proxy adds CORS headers so your browser can communicate with Tally

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

