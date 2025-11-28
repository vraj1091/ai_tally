# AI Tally Assistant - Final Deployment Guide

## Prerequisites

- Python 3.9+
- Node.js 16+
- .NET 6.0+ Runtime (for TallyConnector)
- Docker (optional but recommended)
- Tally ERP installed and configured (remote access enabled)
- Ollama installed with Phi4:14b model

---

## Step 1: Backend Setup

1. Clone project repository.

2. Navigate to backend folder:
# AI Tally Assistant - Final Deployment Guide

## Prerequisites

- Python 3.9+
- Node.js 16+
- .NET 6.0+ Runtime (for TallyConnector)
- Docker (optional but recommended)
- Tally ERP installed and configured (remote access enabled)
- Ollama installed with Phi4:14b model

---

## Step 1: Backend Setup

1. Clone project repository.

2. Navigate to backend folder:
cd backend

text

3. Create and activate Python virtual environment:
python -m venv venv
venv\Scripts\activate # Windows
source venv/bin/activate # Linux/macOS

text

4. Install Python dependencies:
pip install -r requirements.txt

text

5. Copy `.env.example` to `.env` and update variables including:
- TALLY_HOST (IP of remote Tally server)
- TALLY_PORT (usually 9000)
- TALLY_REMOTE_ENABLED (set to True)
- TALLY_CONNECTOR_PATH (path to DLL folder)
- DB credentials
- OLLAMA_BASE_URL, OLLAMA_MODEL

6. Ensure TallyConnector DLLs are placed in `TALLY_CONNECTOR_PATH`.

---

## Step 2: Frontend Setup

1. Navigate to frontend folder:
cd ../frontend

text

2. Install dependencies:
npm install

text

3. Copy `.env.example` to `.env` and update API URLs if necessary.

---

## Step 3: Ollama Setup

1. Install Ollama:
ollama pull phi4:14b
ollama serve

text

2. Confirm Ollama service runs on configured port (default 11434).

---

## Step 4: Running the Application

- **Option 1: Locally**

In separate terminals run:

Terminal 1: Run Ollama server
ollama serve

Terminal 2: Run FastAPI backend
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

Terminal 3: Run React frontend
cd ../frontend
npm run dev

text

- **Option 2: Docker**

docker-compose up --build

text

---

## Step 5: Tally ERP Configuration

1. On the Tally server machine, open Tally.

2. Press F12 → Configure → Connectivity → Enable:
- TallyConnector (Enable Both / Server)
- ODBC Server: Yes
- Set port: 9000
- Enable remote access for client IPs

3. Keep Tally open while running the app.

---

## Step 6: Initialize and Use

1. Open app in browser `http://localhost:5173`.

2. Select company from dropdown to initialize chatbot.

3. Upload documents or use Google Drive integration.

4. Ask questions in chat interface and view analytics.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Tally connection fails | Verify Tally is running, port is open, firewall allows access |
| DLL errors | Ensure TallyConnector DLLs are accessible and compatible |
| Ollama not responding | Check Ollama server logs and model availability |
| Slow responses | Monitor system resources and increase RAM if needed |
| API CORS errors | Update CORS_ORIGINS in backend `.env` file |

---

## Additional Notes

- Secure production environment by adding authentication and HTTPS.

- Monitor logs in `logs/app.log` for backend errors.

- Regularly update models and dependencies.

---

# You're ready! Enjoy the powerful AI Tally Assistant.