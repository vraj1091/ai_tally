# 🔌 Tally Connector - WebSocket Bridge

This connector bridges your **local Tally ERP** to the **cloud backend** via WebSocket.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Browser App    │────▶│   EC2 Backend   │◀────│ TallyConnector  │
│  (Frontend)     │     │   (WebSocket)   │     │ (This Script)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │   Tally ERP     │
                                                │ (localhost:9000)│
                                                └─────────────────┘
```

## Prerequisites

1. **Tally ERP** running on your local PC
2. **Tally Gateway Server** enabled (port 9000)
3. **Python 3.8+** installed

## Setup

### Step 1: Install Dependencies

```bash
cd TallyConnector
pip install -r requirements.txt
```

### Step 2: Enable Tally Gateway Server

In Tally:
1. Press `F12` (Configure)
2. Go to **Advanced Configuration**
3. Set **Enable ODBC Server** to `Yes`
4. Set **Port** to `9000`

### Step 3: Run the Connector

```bash
python tally_connector.py
```

## Configuration

Edit `tally_connector.py` to change:

```python
BACKEND_URL = "ws://13.234.136.42:8000"  # Your EC2 backend
TALLY_URL = "http://localhost:9000"       # Local Tally Gateway
```

## Usage

1. Start Tally ERP on your PC
2. Run `python tally_connector.py`
3. Open the web app in browser
4. The app will automatically use live Tally data!

## Troubleshooting

### "Cannot connect to Tally"
- Make sure Tally is running
- Enable Gateway Server in Tally (F12 → Advanced Configuration)
- Check if port 9000 is not blocked

### "Connection closed"
- Check your internet connection
- Verify the backend URL is correct
- The connector will auto-reconnect

### "WebSocket error"
- Check if EC2 security group allows port 8000
- Verify backend is running: `http://13.234.136.42/health`

## Security Note

This connector runs on your local PC and connects to:
- **Tally** on `localhost:9000` (local only)
- **Backend** via WebSocket (encrypted in transit)

Your Tally data is transmitted securely to the backend for processing.
