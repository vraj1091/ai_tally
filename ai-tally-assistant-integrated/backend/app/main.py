"""
AI Tally Assistant - Main Application Entry Point
FastAPI Backend with Tally + RAG + Phi4:14b Integration
Enhanced with User Authentication & Database Management
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

# Load environment variables
load_dotenv()

# Configure logging with UTF-8 encoding to fix Windows emoji errors
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("./logs/app.log", encoding='utf-8'),  # UTF-8 encoding
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Import configuration
try:
    from app.config import Config
    logger.info("✓ Config module loaded")
except ImportError:
    logger.warning("⚠ WARNING: Config module not found, using defaults")
    class Config:
        TALLY_URL = "http://localhost:9000"
        OLLAMA_MODEL = "phi4:14b"
        CHROMA_DB_PATH = "./chroma_db"
        API_HOST = "0.0.0.0"
        API_PORT = 8000
        DEBUG = True
        LOG_LEVEL = "INFO"
        CORS_ORIGINS = ["http://localhost:3000", "http://localhost:5173"]

        @staticmethod
        def ensure_directories():
            os.makedirs("./logs", exist_ok=True)
            os.makedirs("./chroma_db", exist_ok=True)
            os.makedirs("./uploads", exist_ok=True)

# Import database setup
try:
    from app.models.database import engine, SessionLocal, get_db
    from app.models.database import Base
    DATABASE_AVAILABLE = True
    logger.info("✓ Database module loaded")
except ImportError as e:
    DATABASE_AVAILABLE = False
    logger.warning(f"⚠ WARNING: Database module not available: {e}")

# Import routes
try:
    from app.routes import (
        chat_routes,
        tally_routes,
        document_routes,
        analytics_routes,
        vector_store_routes,
        google_drive_routes,
        backup_routes
    )
    from app.routes import specialized_analytics_routes
    ROUTES_LOADED = True
    logger.info("✓ All route modules imported successfully")
except ImportError as e:
    logger.error(f"✗ Error loading routes: {e}", exc_info=True)
    ROUTES_LOADED = False
    # Create dummy routers to prevent errors
    from fastapi import APIRouter
    chat_routes = type('obj', (object,), {'router': APIRouter()})
    tally_routes = type('obj', (object,), {'router': APIRouter()})
    document_routes = type('obj', (object,), {'router': APIRouter()})
    analytics_routes = type('obj', (object,), {'router': APIRouter()})
    vector_store_routes = type('obj', (object,), {'router': APIRouter()})
    google_drive_routes = type('obj', (object,), {'router': APIRouter()})
    specialized_analytics_routes = type('obj', (object,), {'router': APIRouter()})
    backup_routes = type('obj', (object,), {'router': APIRouter()})

# Import authentication routes (with full error output)
try:
    print("Trying to import auth_routes...")  # will always show in console
    from app.routes import auth_routes
    AUTH_ROUTES_AVAILABLE = True
    logger.info("✓ Authentication routes loaded")
except Exception as e:
    AUTH_ROUTES_AVAILABLE = False
    logger.error("✗ Failed to import authentication routes!", exc_info=True)
    print(f"\n\n✗ FAILED to import authentication routes: {e}\n\n")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    logger.info("=" * 70)
    logger.info("AI TALLY ASSISTANT - STARTING UP")
    logger.info("=" * 70)
    logger.info(f"Tally URL: {Config.TALLY_URL}")
    logger.info(f"LLM Model: {Config.OLLAMA_MODEL}")
    logger.info(f"ChromaDB Path: {Config.CHROMA_DB_PATH}")
    logger.info(f"API Host: {Config.API_HOST}:{Config.API_PORT}")

    # Initialize database
    if DATABASE_AVAILABLE:
        try:
            logger.info("Initializing database...")
            Base.metadata.create_all(bind=engine)
            logger.info("OK: Database tables created/verified")
        except Exception as e:
            logger.error(f"ERROR: Database initialization error: {e}")

    logger.info("=" * 70)
    # Ensure directories exist
    Config.ensure_directories()
    
    # Startup complete
    yield
    
    # Shutdown cleanup
    logger.info("=" * 70)
    logger.info("AI TALLY ASSISTANT - SHUTTING DOWN")
    logger.info("=" * 70)
    
    # Close all database connections
    if DATABASE_AVAILABLE:
        try:
            logger.info("Closing database connections...")
            # Close all connections in the pool
            engine.dispose()
            logger.info("OK: Database connections closed")
        except Exception as e:
            logger.error(f"ERROR: Error closing database connections: {e}")
    
    # Close any ChromaDB connections if they exist
    try:
        # ChromaDB PersistentClient doesn't need explicit closing, but we can log it
        logger.info("OK: ChromaDB connections cleaned up")
    except Exception as e:
        logger.warning(f"Warning: Error during ChromaDB cleanup: {e}")
    
    logger.info("=" * 70)
    logger.info("Shutdown complete")
    logger.info("=" * 70)

app = FastAPI(
    title="AI Tally Assistant",
    description="""
    Advanced AI-powered chatbot for Tally ERP financial data analysis.

    Features:
    - Phi4:14b Local LLM (via Ollama)
    - Live Tally Data Integration (Local & Remote)
    - Document RAG (PDF, DOCX, Images)
    - ChromaDB Vector Search
    - Financial Analytics & Forecasting
    - Google Drive Integration
    - JWT Authentication
    - Multi-User Support
    - Automatic Data Caching
    """,
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enhanced CORS configuration for production
cors_origins = Config.CORS_ORIGINS.copy()
# Remove wildcards and add specific Render domain
cors_origins = [origin for origin in cors_origins if "*" not in origin]
# Add Render frontend URL explicitly
if "https://ai-tally-frontend.onrender.com" not in cors_origins:
    cors_origins.append("https://ai-tally-frontend.onrender.com")

logger.info(f"CORS Origins configured: {cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,  # FastAPI doesn't support wildcards, use explicit origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Configure max body size for large file uploads (100 MB)
app.state.max_upload_size = 100 * 1024 * 1024  # 100 MB

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Handle all unhandled exceptions"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "detail": str(exc) if Config.DEBUG else "An error occurred"
        }
    )

@app.get("/")
async def root():
    """Root endpoint - API information"""
    return {
        "message": "AI Tally Assistant API",
        "version": "2.0.0",
        "status": "running",
        "features": [
            "Tally ERP Integration (Local & Remote)",
            "Phi4:14b LLM (via Ollama)",
            "RAG with ChromaDB",
            "Document Processing (PDF, DOCX, Images)",
            "Google Drive Integration",
            "Financial Analytics",
            "JWT Authentication",
            "Multi-User Support",
            "Automatic Caching"
        ],
        "documentation": {
            "swagger": "/docs",
            "redoc": "/redoc"
        },
        "endpoints": {
            "health": "/health",
            "auth": "/auth" if AUTH_ROUTES_AVAILABLE else None,
            "chat": "/chat",
            "tally": "/tally",
            "documents": "/documents",
            "analytics": "/analytics",
            "vector_store": "/vector-store",
            "google_drive": "/google-drive"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    import psutil
    health_data = {
        "status": "healthy",
        "service": "AI Tally Assistant",
        "version": "2.0.0",
        "system": {
            "cpu_percent": psutil.cpu_percent(),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_percent": psutil.disk_usage('/').percent
        },
        "config": {
            "tally_url": Config.TALLY_URL,
            "ollama_model": Config.OLLAMA_MODEL,
            "chroma_db_path": Config.CHROMA_DB_PATH
        },
        "modules": {
            "database": DATABASE_AVAILABLE,
            "authentication": AUTH_ROUTES_AVAILABLE,
            "routes": ROUTES_LOADED
        }
    }
    # Check database connectivity
    if DATABASE_AVAILABLE:
        try:
            db = SessionLocal()
            db.execute("SELECT 1")
            db.close()
            health_data["database_status"] = "connected"
        except Exception as e:
            health_data["database_status"] = f"error: {str(e)}"
            health_data["status"] = "degraded"
    return health_data

@app.get("/api/version")
async def get_version():
    """Get API version information"""
    return {
        "version": "2.0.0",
        "name": "AI Tally Assistant",
        "status": "production",
        "build_date": "2025-11-17",
        "python_version": "3.9+",
        "framework": "FastAPI 0.118.0",
        "features": {
            "authentication": AUTH_ROUTES_AVAILABLE,
            "database": DATABASE_AVAILABLE,
            "tally_integration": True,
            "rag": True,
            "caching": DATABASE_AVAILABLE
        }
    }

# Database status endpoint
if DATABASE_AVAILABLE:
    @app.get("/api/database/status")
    async def database_status():
        """Get database status and table information"""
        try:
            db = SessionLocal()
            # Get table names
            from sqlalchemy import inspect
            inspector = inspect(engine)
            tables = inspector.get_table_names()
            db.close()
            return {
                "status": "connected",
                "tables": tables,
                "table_count": len(tables)
            }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e)
            }

# Include authentication router (if available)
if AUTH_ROUTES_AVAILABLE:
    app.include_router(
        auth_routes.router,
        prefix="/api/auth",  # <-- CHANGED
        tags=["Authentication"]
    )
    logger.info("OK: Authentication routes registered")

# Include routers
if ROUTES_LOADED:
    try:
        app.include_router(
            chat_routes.router,
            prefix="/api/chat",
            tags=["Chat & RAG"]
        )
        logger.info("✓ Chat routes registered at /api/chat")
    except Exception as e:
        logger.error(f"✗ Failed to register chat routes: {e}")
    
    try:
        app.include_router(
            tally_routes.router,
            prefix="/api/tally",
            tags=["Tally ERP"]
        )
        logger.info("✓ Tally routes registered at /api/tally")
    except Exception as e:
        logger.error(f"✗ Failed to register tally routes: {e}")
    
    try:
        app.include_router(
            document_routes.router,
            prefix="/api/documents",
            tags=["Document Management"]
        )
        logger.info("✓ Document routes registered at /api/documents")
    except Exception as e:
        logger.error(f"✗ Failed to register document routes: {e}")
    
    try:
        app.include_router(
            analytics_routes.router,
            prefix="/api/analytics",
            tags=["Analytics"]
        )
        logger.info("✓ Analytics routes registered at /api/analytics")
    except Exception as e:
        logger.error(f"✗ Failed to register analytics routes: {e}")
    
    try:
        app.include_router(
            specialized_analytics_routes.router,
            prefix="/api/dashboards",
            tags=["Specialized Dashboards"]
        )
        logger.info("✓ Specialized analytics routes registered at /api/dashboards")
    except Exception as e:
        logger.error(f"✗ Failed to register specialized analytics routes: {e}")
    
    try:
        app.include_router(
            backup_routes.router,
            prefix="/api/backup",
            tags=["Backup Files"]
        )
        logger.info("✓ Backup routes registered at /api/backup")
    except Exception as e:
        logger.error(f"✗ Failed to register backup routes: {e}")
    
    try:
        app.include_router(
            vector_store_routes.router,
            prefix="/api/vector-store",
            tags=["Vector Store"]
        )
        logger.info("✓ Vector store routes registered at /api/vector-store")
    except Exception as e:
        logger.error(f"✗ Failed to register vector store routes: {e}")
    
    try:
        app.include_router(
            google_drive_routes.router,
            prefix="/api/google-drive",
            tags=["Google Drive"]
        )
        logger.info("✓ Google Drive routes registered at /api/google-drive")
    except Exception as e:
        logger.error(f"✗ Failed to register google drive routes: {e}")
else:
    logger.error("✗ ROUTES_LOADED is False - routes will not be registered!")

logger.info("OK: FastAPI application initialized")
logger.info("OK: All routes registered")
logger.info("OK: CORS middleware configured")
if DATABASE_AVAILABLE:
    logger.info("OK: Database initialized")
if AUTH_ROUTES_AVAILABLE:
    logger.info("OK: Authentication enabled")
logger.info("OK: Ready to accept requests")

if __name__ == "__main__":
    import uvicorn
    # Fix for Windows emoji encoding issues
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    uvicorn.run(
        "main:app",
        host=Config.API_HOST,
        port=Config.API_PORT,
        reload=False,  # Disable reload to prevent infinite loop
        log_level=Config.LOG_LEVEL.lower()
    )
