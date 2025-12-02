"""
Hugging Face Spaces Entry Point - DIRECT IMPLEMENTATION
All routes defined directly here to avoid import issues
"""

import os
import sys
from pathlib import Path

# Add backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Set environment variables for Hugging Face
os.environ.setdefault("API_HOST", "0.0.0.0")
os.environ.setdefault("API_PORT", "7860")
os.environ.setdefault("DEBUG", "False")

# Import FastAPI and dependencies
from fastapi import FastAPI, HTTPException, Depends, File, UploadFile, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any, List
import logging
import json
import tempfile
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="AI Tally Assistant",
    version="2.0.0",
    description="AI-powered Tally ERP Assistant - HuggingFace Deployment",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration - Allow all origins for HuggingFace
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

logger.info("=" * 70)
logger.info("AI TALLY ASSISTANT - STARTING (DIRECT IMPLEMENTATION)")
logger.info("=" * 70)

# Try to import database (optional)
try:
    from app.models.database import get_db, User, TallyCache, SessionLocal
    DATABASE_AVAILABLE = True
    logger.info("✓ Database module loaded")
except Exception as e:
    DATABASE_AVAILABLE = False
    logger.warning(f"⚠ Database not available: {e}")
    
    # Create dummy dependencies
    def get_db():
        yield None
    
    class User:
        pass
    
    class TallyCache:
        pass

# Try to import services (optional)
try:
    from app.services.tbk_parser import TallyBackupParser
    PARSER_AVAILABLE = True
    logger.info("✓ TBK Parser available")
except Exception as e:
    PARSER_AVAILABLE = False
    logger.warning(f"⚠ TBK Parser not available: {e}")

# ==================== ROOT ROUTES ====================

@app.get("/")
async def root():
    """Root endpoint - API information"""
    return {
        "message": "AI Tally Assistant API - HuggingFace Deployment",
        "version": "2.0.0",
        "status": "running",
        "deployment": "huggingface",
        "database": DATABASE_AVAILABLE,
        "parser": PARSER_AVAILABLE,
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
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "AI Tally Assistant",
        "version": "2.0.0",
        "deployment": "huggingface",
        "modules": {
            "database": DATABASE_AVAILABLE,
            "parser": PARSER_AVAILABLE
        }
    }

# ==================== TALLY ROUTES ====================

@app.get("/api/tally/status")
async def get_tally_status():
    """
    Get Tally connection status
    Anonymous access allowed
    """
    logger.info("📡 Tally status check (anonymous)")
    return {
        "success": True,
        "connected": False,
        "connection_type": "none",
        "url": "",
        "message": "Not connected to Tally. Please upload a backup file to view data.",
        "backup_mode_available": True
    }

@app.get("/api/tally/companies")
async def get_tally_companies():
    """Get companies from Tally (live connection)"""
    logger.info("📋 Get Tally companies")
    return {
        "success": True,
        "companies": [],
        "message": "Not connected to Tally. Please upload a backup file."
    }

# ==================== BACKUP ROUTES ====================

@app.get("/api/backup/companies")
async def get_backup_companies(db = Depends(get_db)):
    """
    Get list of companies from uploaded backup files
    Anonymous access allowed
    """
    logger.info("📦 Fetching backup companies")
    
    if not DATABASE_AVAILABLE or db is None:
        logger.warning("Database not available")
        return {
            "success": True,
            "companies": [],
            "message": "Database not available. Please upload a backup file."
        }
    
    try:
        # Query cached companies
        cache_entry = db.query(TallyCache).filter_by(
            cache_key="companies",
            source="backup"
        ).first()
        
        if cache_entry:
            # Parse cached data
            if isinstance(cache_entry.cache_data, str):
                data = json.loads(cache_entry.cache_data)
            else:
                data = cache_entry.cache_data
            
            companies = data.get("companies", []) if isinstance(data, dict) else []
            
            logger.info(f"Found {len(companies)} companies from backup")
            return {
                "success": True,
                "companies": companies,
                "source": "backup",
                "message": f"Found {len(companies)} companies from uploaded backup"
            }
        else:
            logger.info("No backup companies found")
            return {
                "success": True,
                "companies": [],
                "message": "No backup data available. Please upload a backup file."
            }
            
    except Exception as e:
        logger.error(f"Error fetching backup companies: {e}", exc_info=True)
        return {
            "success": False,
            "companies": [],
            "error": str(e),
            "message": "Error fetching backup companies. Please try uploading again."
        }

@app.post("/api/backup/upload")
async def upload_backup_file(
    file: UploadFile = File(...),
    db = Depends(get_db)
):
    """
    Upload and parse a Tally backup file (.tbk, .001, .xml, .zip)
    """
    logger.info(f"📤 Backup upload started: {file.filename}")
    
    # Validate file extension
    valid_extensions = ('.tbk', '.001', '.002', '.003', '.004', '.005', '.zip', '.xml')
    if not file.filename.lower().endswith(valid_extensions):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Supported: {', '.join(valid_extensions)}"
        )
    
    if not DATABASE_AVAILABLE or db is None:
        raise HTTPException(
            status_code=503,
            detail="Database not available. Cannot store backup data."
        )
    
    if not PARSER_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="TBK Parser not available. Cannot process backup file."
        )
    
    temp_path = None
    try:
        # Check file size (100 MB limit)
        MAX_FILE_SIZE = 100 * 1024 * 1024
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.tbk') as temp_file:
            content = await file.read()
            file_size = len(content)
            
            if file_size > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=413,
                    detail=f"File too large. Max size: 100 MB, received: {file_size / (1024*1024):.2f} MB"
                )
            
            temp_file.write(content)
            temp_path = temp_file.name
        
        logger.info(f"File saved temporarily: {file_size / (1024*1024):.2f} MB")
        
        # Parse the backup file
        parser = TallyBackupParser()
        data = parser.parse_tbk_file(temp_path)
        
        logger.info(f"Parsed backup file:")
        logger.info(f"  - Companies: {len(data.get('companies', []))}")
        logger.info(f"  - Ledgers: {len(data.get('ledgers', []))}")
        logger.info(f"  - Vouchers: {len(data.get('vouchers', []))}")
        
        # Store in cache
        companies = data.get("companies", [])
        
        if companies:
            # Store companies cache
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
                    source="backup",
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(cache_entry)
            
            # Store ledgers and vouchers for each company
            for company in companies:
                company_name = company.get("name", "Unknown")
                
                # Store ledgers
                ledgers_cache = db.query(TallyCache).filter_by(
                    cache_key=f"{company_name}_ledgers",
                    source="backup"
                ).first()
                
                if ledgers_cache:
                    ledgers_cache.cache_data = json.dumps({"ledgers": data.get("ledgers", [])})
                    ledgers_cache.updated_at = datetime.utcnow()
                else:
                    ledgers_cache = TallyCache(
                        cache_key=f"{company_name}_ledgers",
                        cache_data=json.dumps({"ledgers": data.get("ledgers", [])}),
                        source="backup",
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    db.add(ledgers_cache)
                
                # Store vouchers
                vouchers_cache = db.query(TallyCache).filter_by(
                    cache_key=f"{company_name}_vouchers",
                    source="backup"
                ).first()
                
                if vouchers_cache:
                    vouchers_cache.cache_data = json.dumps({"vouchers": data.get("vouchers", [])})
                    vouchers_cache.updated_at = datetime.utcnow()
                else:
                    vouchers_cache = TallyCache(
                        cache_key=f"{company_name}_vouchers",
                        cache_data=json.dumps({"vouchers": data.get("vouchers", [])}),
                        source="backup",
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    db.add(vouchers_cache)
            
            db.commit()
            logger.info("✓ Backup data stored in cache")
        
        # Clean up temp file
        if temp_path and os.path.exists(temp_path):
            os.unlink(temp_path)
        
        return {
            "success": True,
            "message": "Backup file uploaded and parsed successfully",
            "filename": file.filename,
            "size_mb": round(file_size / (1024*1024), 2),
            "data": {
                "companies": len(companies),
                "ledgers": len(data.get("ledgers", [])),
                "vouchers": len(data.get("vouchers", [])),
                "stock_items": len(data.get("stock_items", []))
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing backup file: {e}", exc_info=True)
        # Clean up temp file on error
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except:
                pass
        
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process backup file: {str(e)}"
        )

# ==================== DASHBOARD ROUTES ====================

@app.get("/api/dashboards/ceo/{company_name}")
async def get_ceo_dashboard(
    company_name: str,
    refresh: bool = Query(False),
    source: str = Query("backup")
):
    """Get CEO dashboard data"""
    logger.info(f"📊 CEO Dashboard request for: {company_name}")
    
    return {
        "success": False,
        "message": "Dashboard data not available yet. Please upload a backup file.",
        "company": company_name,
        "data": {}
    }

# ==================== DEBUG ROUTES ====================

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
        "status": "running",
        "deployment": "huggingface_direct",
        "app_version": "2.0.0",
        "database_available": DATABASE_AVAILABLE,
        "parser_available": PARSER_AVAILABLE,
        "total_routes": len(routes),
        "routes": sorted(routes, key=lambda x: x['path'])
    }

@app.get("/api/version")
async def get_version():
    """Get API version information"""
    return {
        "version": "2.0.0",
        "name": "AI Tally Assistant",
        "deployment": "huggingface",
        "status": "production"
    }

# ==================== STARTUP LOGGING ====================

logger.info("✓ FastAPI app created")
logger.info("✓ CORS middleware configured")
logger.info("✓ All routes registered directly")
logger.info(f"✓ Database available: {DATABASE_AVAILABLE}")
logger.info(f"✓ Parser available: {PARSER_AVAILABLE}")
logger.info("=" * 70)
logger.info("✓ AI TALLY ASSISTANT - READY TO ACCEPT REQUESTS")
logger.info("=" * 70)

# Run server if executed directly (for local testing)
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 7860))
    logger.info(f"Starting server on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
