"""
AI Tally Assistant - Backend Runner
Run locally: python main.py
Also works for Hugging Face Spaces deployment
"""
import uvicorn
import sys
import os
from pathlib import Path

# Add backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Detect environment
IS_HUGGINGFACE = os.getenv("SPACE_ID") is not None or os.getenv("SPACE_URL") is not None
IS_PRODUCTION = os.getenv("RENDER") is not None or IS_HUGGINGFACE

# Set default port based on environment
DEFAULT_PORT = 7860 if IS_HUGGINGFACE else 8000
PORT = int(os.getenv("PORT", os.getenv("API_PORT", DEFAULT_PORT)))

# Set environment variables
os.environ.setdefault("API_HOST", "0.0.0.0")
os.environ.setdefault("API_PORT", str(PORT))

# Configure CORS
hf_space_url = os.getenv("SPACE_URL", "")
cors_origins = os.getenv("CORS_ORIGINS", "")

if hf_space_url and hf_space_url not in cors_origins:
    cors_origins = f"{cors_origins},{hf_space_url}".strip(",")

if not cors_origins:
    cors_origins = "http://localhost:5173,http://localhost:3000"

os.environ["CORS_ORIGINS"] = cors_origins

# Import the FastAPI app
from app.main import app

# Run server
if __name__ == "__main__":
    # Fix Windows encoding
    if sys.platform == "win32":
        try:
            sys.stdout.reconfigure(encoding='utf-8')
            sys.stderr.reconfigure(encoding='utf-8')
        except:
            pass
    
    print("=" * 50)
    print("AI Tally Assistant - Backend Server")
    print("=" * 50)
    print(f"URL: http://localhost:{PORT}")
    print(f"Docs: http://localhost:{PORT}/docs")
    print(f"Environment: {'Production' if IS_PRODUCTION else 'Development'}")
    print("=" * 50)
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=PORT,
        reload=False
    )
