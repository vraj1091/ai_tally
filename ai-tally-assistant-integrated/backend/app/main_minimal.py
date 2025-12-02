"""
MINIMAL FastAPI App for HuggingFace - Routes Directly Defined
This bypasses the complex import structure
"""

from fastapi import FastAPI, HTTPException, Depends, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
import logging
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="AI Tally Assistant",
    version="2.0.0",
    description="AI-powered Tally ERP Assistant"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for now
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import database (with fallback)
try:
    from app.models.database import get_db, User
    DATABASE_AVAILABLE = True
    logger.info("✓ Database available")
except Exception as e:
    DATABASE_AVAILABLE = False
    logger.warning(f"⚠ Database not available: {e}")
    # Create dummy get_db
    def get_db():
        return None

# Import auth (with fallback)
try:
    from app.routes.auth_routes import get_current_user
    AUTH_AVAILABLE = True
    logger.info("✓ Auth available")
except Exception as e:
    AUTH_AVAILABLE = False
    logger.warning(f"⚠ Auth not available: {e}")
    # Create dummy get_current_user
    async def get_current_user():
        return None

# ==================== BASIC ROUTES ====================

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "AI Tally Assistant API",
        "version": "2.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "tally_status": "/api/tally/status",
            "backup_companies": "/api/backup/companies",
            "backup_upload": "/api/backup/upload",
            "debug": "/api/debug/routes"
        }
    }

@app.get("/health")
async def health():
    """Health check"""
    return {
        "status": "healthy",
        "database": DATABASE_AVAILABLE,
        "auth": AUTH_AVAILABLE
    }

# ==================== TALLY ROUTES ====================

@app.get("/api/tally/status")
async def get_tally_status():
    """Get Tally connection status - anonymous access"""
    logger.info("📡 Tally status check")
    return {
        "success": True,
        "connected": False,
        "connection_type": "none",
        "url": "",
        "message": "Not connected to Tally. Please configure connection or upload backup file."
    }

@app.get("/api/tally/companies")
async def get_tally_companies():
    """Get companies from Tally"""
    return {
        "success": True,
        "companies": [],
        "message": "No companies available. Connect to Tally or upload backup."
    }

# ==================== BACKUP ROUTES ====================

@app.get("/api/backup/companies")
async def get_backup_companies(db: Session = Depends(get_db)):
    """Get companies from uploaded backup files"""
    logger.info("📦 Fetching backup companies")
    
    if not DATABASE_AVAILABLE or db is None:
        return {
            "success": True,
            "companies": [],
            "message": "Database not available. Please upload a backup file."
        }
    
    try:
        from app.models.database import TallyCache
        import json
        
        # Try to get cached companies
        cache_entry = db.query(TallyCache).filter_by(
            cache_key="companies",
            source="backup"
        ).first()
        
        if cache_entry:
            if isinstance(cache_entry.cache_data, str):
                data = json.loads(cache_entry.cache_data)
            else:
                data = cache_entry.cache_data
            
            companies = data.get("companies", []) if isinstance(data, dict) else []
            return {
                "success": True,
                "companies": companies,
                "message": f"Found {len(companies)} companies from backup"
            }
    except Exception as e:
        logger.error(f"Error fetching backup companies: {e}")
    
    return {
        "success": True,
        "companies": [],
        "message": "No backup data available. Please upload a backup file."
    }

@app.post("/api/backup/upload")
async def upload_backup(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload Tally backup file"""
    logger.info(f"📤 Backup upload: {file.filename}")
    
    if not DATABASE_AVAILABLE or db is None:
        raise HTTPException(
            status_code=503,
            detail="Database not available. Cannot process backup file."
        )
    
    try:
        from app.services.tbk_parser import TallyBackupParser
        from app.models.database import TallyCache
        import tempfile
        import json
        from datetime import datetime
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.tbk') as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name
        
        # Parse the file
        parser = TallyBackupParser()
        data = parser.parse_tbk_file(temp_path)
        
        # Store in cache
        companies = data.get("companies", [])
        for company in companies:
            company_name = company.get("name", "Unknown")
            
            # Store company data
            cache_entry = db.query(TallyCache).filter_by(
                cache_key="companies",
                source="backup"
            ).first()
            
            if cache_entry:
                cache_entry.cache_data = json.dumps(data)
                cache_entry.updated_at = datetime.utcnow()
            else:
                cache_entry = TallyCache(
                    cache_key="companies",
                    cache_data=json.dumps(data),
                    source="backup"
                )
                db.add(cache_entry)
            
            db.commit()
        
        # Clean up
        os.unlink(temp_path)
        
        return {
            "success": True,
            "message": f"Successfully uploaded and parsed backup file",
            "companies": len(companies),
            "ledgers": len(data.get("ledgers", [])),
            "vouchers": len(data.get("vouchers", []))
        }
        
    except Exception as e:
        logger.error(f"Error uploading backup: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process backup file: {str(e)}"
        )

# ==================== DASHBOARD ROUTES ====================

@app.get("/api/dashboards/ceo/{company_name}")
async def get_ceo_dashboard(company_name: str):
    """Get CEO dashboard data"""
    logger.info(f"📊 CEO Dashboard request for: {company_name}")
    return {
        "success": False,
        "message": "No data available. Please connect to Tally or upload backup.",
        "data": {}
    }

# ==================== DEBUG ROUTES ====================

@app.get("/api/debug/routes")
async def debug_routes():
    """Debug endpoint to check registered routes"""
    routes = []
    for route in app.routes:
        if hasattr(route, 'path') and hasattr(route, 'methods'):
            routes.append({
                "path": route.path,
                "methods": list(route.methods) if route.methods else []
            })
    return {
        "status": "minimal_app_running",
        "database_available": DATABASE_AVAILABLE,
        "auth_available": AUTH_AVAILABLE,
        "total_routes": len(routes),
        "routes": routes
    }

logger.info("=" * 70)
logger.info("✓ MINIMAL FastAPI app initialized")
logger.info("✓ All basic routes registered")
logger.info("✓ Ready to accept requests")
logger.info("=" * 70)

