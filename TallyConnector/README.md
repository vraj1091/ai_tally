# TallyDash Pro Connector

A user-friendly desktop application to connect your local Tally ERP to TallyDash Pro cloud.

## Features

- ✅ **One-Time Setup** - Configure once, auto-connects every time
- ✅ **User-Friendly GUI** - No command line required
- ✅ **Auto-Reconnect** - Automatically reconnects if connection drops
- ✅ **Status Indicators** - Visual status for server and Tally connection
- ✅ **Activity Log** - See what's happening in real-time
- ✅ **Secure** - Your Tally data stays on your computer

## Quick Start

### Option 1: Run with Python (Recommended)

1. **Install Python** (if not already installed)
   - Download from [python.org](https://www.python.org/downloads/)
   - During installation, check "Add Python to PATH"

2. **Double-click `RunConnector.bat`**
   - This will install dependencies and start the connector

### Option 2: Build Standalone EXE

1. Double-click `build_exe.bat`
2. Wait for the build to complete
3. Find `TallyDashProConnector.exe` in the `dist` folder
4. Copy the EXE anywhere and run it!

## Requirements

- Windows 10/11
- Tally ERP 9 or TallyPrime running with ODBC Server enabled
- Internet connection

## How to Enable Tally ODBC Server

1. Open Tally
2. Press **F12** (Configure)
3. Go to **Advanced Configuration**
4. Set **Enable ODBC Server** to **Yes**
5. Note the port (default: 9000)

## Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Server URL | TallyDash Pro server address | 107.21.87.222 |
| Tally Host | Your Tally computer | localhost |
| Tally Port | Tally ODBC port | 9000 |
| Auto-connect | Connect automatically on startup | Yes |

## Troubleshooting

### "Cannot connect to Tally"
- Make sure Tally is running
- Enable ODBC Server in Tally (F12 > Advanced Configuration)
- Check the port number matches

### "Connection error"
- Check your internet connection
- Verify the server URL is correct
- Try clicking "Connect" again

### Logs
Logs are saved to: `C:\Users\<YourName>\TallyDashPro\connector.log`

## Support

For help, contact support or visit our documentation.

---

Made with ❤️ for Indian businesses
