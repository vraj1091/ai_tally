"""
Configuration Module for AI Tally Assistant
Supports both local and remote Tally connections
"""

import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
load_dotenv()

class Config:
    """Application configuration"""
    
    # ===== TALLY CONFIGURATION (SUPPORTS REMOTE) =====
    TALLY_HOST = os.getenv("TALLY_HOST", "localhost")
    TALLY_PORT = int(os.getenv("TALLY_PORT", "9000"))
    TALLY_URL = f"http://{TALLY_HOST}:{TALLY_PORT}"
    TALLY_TIMEOUT = 30  # 30 seconds for Tally Gateway response
    
    # Remote Tally Support
    TALLY_REMOTE_ENABLED = os.getenv("TALLY_REMOTE_ENABLED", "True") == "True"
    
    # TallyConnector DLL Path
    TALLY_CONNECTOR_PATH = os.getenv("TALLY_CONNECTOR_PATH", "./TallyConnector")
    
    # ===== OLLAMA CONFIGURATION (CPU Mode) =====
    # Use host.docker.internal on Docker, or localhost on bare metal
    OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11434")
    # Use phi4:14b - requires ~20GB RAM (server has 32GB)
    OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "phi4:14b")
    OLLAMA_TEMPERATURE = 0.3
    OLLAMA_TOP_P = 0.9
    OLLAMA_TOP_K = 40
    
    # ===== CHROMADB CONFIGURATION =====
    CHROMA_DB_PATH = os.getenv("CHROMA_DB_PATH", "./chroma_db")
    EMBEDDINGS_MODEL = os.getenv(
        "EMBEDDINGS_MODEL",
        "sentence-transformers/all-MiniLM-L6-v2"
    )
    
    # ===== DATABASE CONFIGURATION =====
    # Using SQLite for simplicity (no MySQL setup required)
    DB_URL = os.getenv("DB_URL", "sqlite:///./database.db")
    
    # MySQL config (optional - uncomment if you want to use MySQL)
    # DB_HOST = os.getenv("DB_HOST", "localhost")
    # DB_PORT = int(os.getenv("DB_PORT", "3306"))
    # DB_USER = os.getenv("DB_USER", "root")
    # DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    # DB_NAME = os.getenv("DB_NAME", "tally_cache")
    # DB_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    
    # ===== API CONFIGURATION =====
    API_HOST = os.getenv("API_HOST", "0.0.0.0")
    API_PORT = int(os.getenv("API_PORT", "8000"))
    DEBUG = os.getenv("DEBUG", "False") == "True"
    
    # ===== RAG CONFIGURATION =====
    CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "512"))
    CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "50"))
    TOP_K_RETRIEVAL = int(os.getenv("TOP_K_RETRIEVAL", "5"))
    
    # ===== FILE UPLOAD CONFIGURATION =====
    MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", "52428800"))  # 50MB
    ALLOWED_EXTENSIONS = os.getenv(
        "ALLOWED_EXTENSIONS",
        "pdf,docx,txt,md,png,jpg,jpeg,xml"
    ).split(",")
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "./uploads")
    
    # ===== GOOGLE DRIVE CONFIGURATION =====
    GOOGLE_CREDENTIALS = os.getenv("GOOGLE_CREDENTIALS", "./credentials.json")
    GOOGLE_DRIVE_FOLDER_ID = os.getenv("GOOGLE_DRIVE_FOLDER_ID", "")
    
    # ===== CORS CONFIGURATION =====
    CORS_ORIGINS_STR = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:3000,http://13.235.113.207:5173,http://13.235.113.207:3000,http://13.235.113.207,https://ai-tally-frontend.onrender.com"
    )
    # Split and clean CORS origins
    CORS_ORIGINS = [origin.strip() for origin in CORS_ORIGINS_STR.split(",") if origin.strip()]
    
    # Add EC2 and common origins
    ec2_origins = [
        "http://13.234.114.139:5173",
        "http://13.234.114.139:3000",
        "http://13.234.114.139",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]
    for origin in ec2_origins:
        if origin not in CORS_ORIGINS:
            CORS_ORIGINS.append(origin)
    
    # ===== LOGGING =====
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    
    # ===== CACHE CONFIGURATION =====
    CACHE_TTL = int(os.getenv("CACHE_TTL", "300"))
    CACHE_ENABLED = os.getenv("CACHE_ENABLED", "True") == "True"
    
    # ===== ENSURE DIRECTORIES EXIST =====
    @classmethod
    def ensure_directories(cls):
        """Create necessary directories if they don't exist"""
        Path(cls.CHROMA_DB_PATH).mkdir(parents=True, exist_ok=True)
        Path(cls.UPLOAD_FOLDER).mkdir(parents=True, exist_ok=True)
        Path(cls.TALLY_CONNECTOR_PATH).mkdir(parents=True, exist_ok=True)
        Path("./logs").mkdir(parents=True, exist_ok=True)

# Create directories on import
Config.ensure_directories()

