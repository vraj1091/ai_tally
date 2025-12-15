"""
AI Tally Assistant - Main Application Entry Point
FastAPI Backend with Tally + RAG + Phi4:14b Integration
Enhanced with User Authentication & Database Management
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
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

# Ensure directories exist before logging
os.makedirs("./logs", exist_ok=True)
os.makedirs("./uploads", exist_ok=True)
os.makedirs("./chroma_db", exist_ok=True)
os.makedirs("./data/backups", exist_ok=True)

# Configure logging with UTF-8 encoding to fix Windows emoji errors
try:
    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "INFO"),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler("./logs/app.log", encoding='utf-8'),
            logging.StreamHandler()
        ]
    )
except Exception:
    # Fallback to console-only logging
    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "INFO"),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
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

# Import routes - with individual error handling
from fastapi import APIRouter
ROUTES_LOADED = True

# Helper to create dummy router (includes both router and ws_router for ws_bridge_routes compatibility)
def create_dummy_router():
    return type('obj', (object,), {'router': APIRouter(), 'ws_router': APIRouter()})

# Track which routes loaded successfully
loaded_routes = []
failed_routes = []

try:
    from app.routes import chat_routes
    loaded_routes.append("chat_routes")
    logger.info("✓ chat_routes loaded successfully")
except Exception as e:
    logger.error(f"✗ chat_routes FAILED: {type(e).__name__}: {e}")
    failed_routes.append(f"chat_routes: {e}")
    chat_routes = create_dummy_router()

try:
    from app.routes import tally_routes
    loaded_routes.append("tally_routes")
    logger.info("✓ tally_routes loaded successfully")
except Exception as e:
    logger.error(f"✗ tally_routes FAILED: {type(e).__name__}: {e}")
    failed_routes.append(f"tally_routes: {e}")
    tally_routes = create_dummy_router()

try:
    from app.routes import document_routes
    loaded_routes.append("document_routes")
    logger.info("✓ document_routes loaded successfully")
except Exception as e:
    logger.error(f"✗ document_routes FAILED: {type(e).__name__}: {e}")
    failed_routes.append(f"document_routes: {e}")
    document_routes = create_dummy_router()

try:
    from app.routes import analytics_routes
    loaded_routes.append("analytics_routes")
    logger.info("✓ analytics_routes loaded successfully")
except Exception as e:
    logger.error(f"✗ analytics_routes FAILED: {type(e).__name__}: {e}")
    failed_routes.append(f"analytics_routes: {e}")
    analytics_routes = create_dummy_router()

try:
    from app.routes import vector_store_routes
    loaded_routes.append("vector_store_routes")
    logger.info("✓ vector_store_routes loaded successfully")
except Exception as e:
    logger.error(f"✗ vector_store_routes FAILED: {type(e).__name__}: {e}")
    failed_routes.append(f"vector_store_routes: {e}")
    vector_store_routes = create_dummy_router()

try:
    from app.routes import google_drive_routes
    loaded_routes.append("google_drive_routes")
    logger.info("✓ google_drive_routes loaded successfully")
except Exception as e:
    logger.error(f"✗ google_drive_routes FAILED: {type(e).__name__}: {e}")
    failed_routes.append(f"google_drive_routes: {e}")
    google_drive_routes = create_dummy_router()

try:
    from app.routes import backup_routes
    loaded_routes.append("backup_routes")
    logger.info("✓ backup_routes loaded successfully")
except Exception as e:
    logger.error(f"✗ backup_routes FAILED: {type(e).__name__}: {e}")
    failed_routes.append(f"backup_routes: {e}")
    backup_routes = create_dummy_router()

try:
    from app.routes import specialized_analytics_routes
    loaded_routes.append("specialized_analytics_routes")
    logger.info("✓ specialized_analytics_routes loaded successfully")
except Exception as e:
    logger.error(f"✗ specialized_analytics_routes FAILED: {type(e).__name__}: {e}")
    failed_routes.append(f"specialized_analytics_routes: {e}")
    specialized_analytics_routes = create_dummy_router()

# WebSocket bridge routes for real-time Tally connection
try:
    from app.routes import ws_bridge_routes
    loaded_routes.append("ws_bridge_routes")
    logger.info("✓ ws_bridge_routes loaded successfully")
except Exception as e:
    logger.error(f"✗ ws_bridge_routes FAILED: {type(e).__name__}: {e}")
    failed_routes.append(f"ws_bridge_routes: {e}")
    ws_bridge_routes = create_dummy_router()

logger.info(f"Route import complete: {len(loaded_routes)} loaded, {len(failed_routes)} failed")
if failed_routes:
    logger.error(f"Failed routes: {failed_routes}")

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


# ==================== SECURITY MIDDLEWARE ====================
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses"""
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        
        # Cache control for API responses
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
            response.headers["Pragma"] = "no-cache"
        
        return response


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
            # Use checkfirst=True to avoid "table already exists" errors
            from sqlalchemy import inspect
            inspector = inspect(engine)
            existing_tables = inspector.get_table_names()
            logger.info(f"Existing tables: {existing_tables}")
            
            # Only create tables that don't exist
            Base.metadata.create_all(bind=engine, checkfirst=True)
            logger.info("OK: Database tables created/verified")
        except Exception as e:
            # Ignore "already exists" errors - these are fine
            error_msg = str(e).lower()
            if "already exists" in error_msg:
                logger.info("Database tables already exist - continuing...")
            else:
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

# Enhanced CORS configuration - Allow ALL origins for flexibility
# Get from environment or use defaults
cors_env = os.getenv("CORS_ORIGINS", "")
cors_origins = [origin.strip() for origin in cors_env.split(",") if origin.strip()]

# Add common development and production origins
default_origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://13.235.113.207:5173",  # EC2 Frontend
    "http://13.235.113.207:3000",  # EC2 Frontend alt
    "http://13.235.113.207",       # EC2 Base
    "https://ai-tally-frontend.onrender.com",
]

for origin in default_origins:
    if origin not in cors_origins:
        cors_origins.append(origin)

logger.info(f"CORS Origins configured: {cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,  # Use configured origins only (SECURITY)
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With", "Accept", "Origin"],
    expose_headers=["Content-Disposition", "Content-Length"],
)

# Add security headers middleware
app.add_middleware(SecurityHeadersMiddleware)
logger.info("✓ Security headers middleware added")

# Configure max body size for large file uploads (2 GB)
# Note: This is informational; actual limit is handled by route-level validation
app.state.max_upload_size = 2 * 1024 * 1024 * 1024  # 2 GB

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
        "routes_loaded": loaded_routes,
        "routes_failed": failed_routes,
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
            "debug_routes": "/api/debug/routes",
            "auth": "/api/auth" if AUTH_ROUTES_AVAILABLE else None,
            "chat": "/api/chat",
            "tally": "/api/tally",
            "tally_status": "/api/tally/status",
            "backup": "/api/backup",
            "backup_companies": "/api/backup/companies",
            "documents": "/api/documents",
            "analytics": "/api/analytics",
            "dashboards": "/api/dashboards",
            "ai_insights": "/api/ai",
            "vector_store": "/api/vector-store",
            "google_drive": "/api/google-drive",
            "websocket_bridge": "/ws/tally-bridge/{user_token}",
            "websocket_test": "/ws/test"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    import psutil
    import platform
    
    # Get disk path based on OS (Windows uses C:\, Linux/Mac uses /)
    disk_path = "C:\\" if platform.system() == "Windows" else "/"
    
    try:
        disk_percent = psutil.disk_usage(disk_path).percent
    except Exception:
        disk_percent = 0.0  # Fallback if disk check fails
    
    health_data = {
        "status": "healthy",
        "service": "AI Tally Assistant",
        "version": "2.0.0",
        "system": {
            "cpu_percent": psutil.cpu_percent(),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_percent": disk_percent,
            "os": platform.system()
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
            from sqlalchemy import text
            db = SessionLocal()
            db.execute(text("SELECT 1"))
            db.close()
            health_data["database_status"] = "connected"
        except Exception as e:
            health_data["database_status"] = f"error: {str(e)}"
            health_data["status"] = "degraded"
    
    # Check Ollama AI status
    try:
        import requests
        ollama_resp = requests.get(f"{Config.OLLAMA_BASE_URL}/api/tags", timeout=5)
        if ollama_resp.status_code == 200:
            models = ollama_resp.json().get("models", [])
            model_names = [m.get("name", "") for m in models]
            health_data["ollama_status"] = "running"
            health_data["ollama_models"] = model_names
            if Config.OLLAMA_MODEL not in str(model_names):
                health_data["ollama_warning"] = f"Model {Config.OLLAMA_MODEL} not found. Available: {model_names}"
        else:
            health_data["ollama_status"] = "error"
    except Exception as e:
        health_data["ollama_status"] = "not_available"
        health_data["status"] = "degraded"
    
    # Check WebSocket bridge status
    try:
        from app.routes.ws_bridge_routes import bridge_manager
        connected_bridges = len(bridge_manager.connections)
        health_data["bridge_connections"] = connected_bridges
    except:
        health_data["bridge_connections"] = 0
    
    return health_data

@app.get("/api/debug/routes")
async def debug_routes():
    """Debug endpoint to list all registered routes"""
    routes = []
    for route in app.routes:
        if hasattr(route, 'path') and hasattr(route, 'methods'):
            routes.append({
                "path": route.path,
                "methods": list(route.methods) if route.methods else [],
                "name": route.name if hasattr(route, 'name') else None
            })
    return {
        "total_routes": len(routes),
        "loaded_modules": loaded_routes,
        "failed_modules": failed_routes,
        "routes": routes
    }

@app.get("/api/version")
async def get_version():
    """Get API version information"""
    return {
        "version": "2.1.0",
        "name": "TallyDash Pro",
        "status": "production",
        "build_date": "2025-12-15",
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

# Include routers (always register - each has real or dummy router)
app.include_router(
    chat_routes.router,
    prefix="/api/chat",
    tags=["Chat & RAG"]
)
app.include_router(
    tally_routes.router,
    prefix="/api/tally",
    tags=["Tally ERP"]
)
app.include_router(
    document_routes.router,
    prefix="/api/documents",
    tags=["Document Management"]
)
app.include_router(
    analytics_routes.router,
    prefix="/api/analytics",
    tags=["Analytics"]
)
app.include_router(
    specialized_analytics_routes.router,
    prefix="/api/dashboards",
    tags=["Specialized Dashboards"]
)
app.include_router(
    backup_routes.router,
    prefix="/api/backup",
    tags=["Backup Files"]
)
app.include_router(
    vector_store_routes.router,
    prefix="/api/vector-store",
    tags=["Vector Store"]
)
app.include_router(
    google_drive_routes.router,
    prefix="/api/google-drive",
    tags=["Google Drive"]
)

# WebSocket bridge routes for real-time Tally access
try:
    # HTTP API routes at /api/bridge
    app.include_router(
        ws_bridge_routes.router,
        prefix="/api/bridge",
        tags=["WebSocket Bridge API"]
    )
    logger.info("✓ WebSocket Bridge HTTP routes registered at /api/bridge")
    
    # WebSocket routes at root (for /ws/tally-bridge/{token})
    # Check if ws_router exists (it won't if using dummy router from older code)
    if hasattr(ws_bridge_routes, 'ws_router'):
        app.include_router(
            ws_bridge_routes.ws_router,
            prefix="",
            tags=["WebSocket Bridge WS"]
        )
        logger.info("✓ WebSocket Bridge WS routes registered at /ws/tally-bridge/{token}")
    else:
        logger.warning("⚠ ws_router not found in ws_bridge_routes - WebSocket connections won't work!")
        
except Exception as e:
    logger.error(f"⚠ WebSocket Bridge routes FAILED: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()

# Import and register AI insights routes
try:
    from app.routes import ai_insights_routes
    app.include_router(
        ai_insights_routes.router,
        prefix="/api/ai",
        tags=["AI Insights"]
    )
    logger.info("✓ AI Insights routes loaded")
except ImportError as e:
    logger.warning(f"⚠ AI Insights routes not available: {e}")

# Import and register analytics drill-down routes
try:
    app.include_router(
        ai_insights_routes.router,
        prefix="/api/analytics",
        tags=["Analytics Drill-Down"]
    )
except:
    pass

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
        "app.main:app",
        host=Config.API_HOST,
        port=Config.API_PORT,
        reload=False,
        log_level=Config.LOG_LEVEL.lower()
    )

