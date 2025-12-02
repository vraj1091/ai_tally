"""
Hugging Face Spaces Entry Point
This file is used for Hugging Face Spaces deployment
"""

import os
import sys
from pathlib import Path

# Add backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Set environment variables for Hugging Face
os.environ.setdefault("API_HOST", "0.0.0.0")
os.environ.setdefault("API_PORT", "7860")  # Hugging Face uses port 7860
os.environ.setdefault("DEBUG", "False")

# Ensure CORS allows Hugging Face domain and common origins
# Hugging Face Spaces automatically sets SPACE_URL
hf_space_url = os.getenv("SPACE_URL", "")
cors_origins = os.getenv("CORS_ORIGINS", "")

# Add Hugging Face space URL if not already present
if hf_space_url and hf_space_url not in cors_origins:
    cors_origins = f"{cors_origins},{hf_space_url}".strip(",")

# Add localhost origins for development/testing (if not in production)
if cors_origins and "localhost" not in cors_origins.lower() and os.getenv("DEBUG", "False") == "True":
    cors_origins = f"{cors_origins},http://localhost:5173,http://localhost:3000".strip(",")
elif not cors_origins:
    # Default to localhost if no CORS_ORIGINS set
    cors_origins = "http://localhost:5173,http://localhost:3000"

# Update environment variable
if cors_origins:
    os.environ["CORS_ORIGINS"] = cors_origins

# Import and run the FastAPI app
from app.main import app

# Export for Hugging Face
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)

