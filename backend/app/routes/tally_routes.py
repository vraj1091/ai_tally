"""
Tally Routes - Direct Tally ERP Access
Enhanced with user-specific connections and caching
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.services.tally_service import TallyDataService
from app.config import Config
from app.models.database import get_db, User
from app.models.schemas import ConnectionTypeEnum, TallyConnectionBase
from app.routes.auth_routes import get_current_user
from typing import Optional, List
from datetime import datetime
from fastapi import Header
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# Global connection state (in-memory cache for demo purposes)
_current_tally_url = "http://localhost:9000"

def get_current_tally_url():
    """Get the currently configured Tally URL"""
    return _current_tally_url

def set_current_tally_url(url: str):
    """Set the current Tally URL"""
    global _current_tally_url
    _current_tally_url = url
    logger.info(f"📝 Tally URL updated to: {url}")


# ==================== REQUEST/RESPONSE MODELS ====================

class TallyConnectionRequest(TallyConnectionBase):
    """Tally connection request - inherits validator from base"""
    pass


class TallyConnectionResponse(BaseModel):
    """Tally connection response"""
    connected: bool
    connection_type: str
    url: str
    message: str


# ==================== CONNECTION MANAGEMENT ====================

@router.post("/connect", response_model=TallyConnectionResponse)
async def connect_to_tally(
    request: TallyConnectionRequest,
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
):
    """
    Configure Tally connection (supports anonymous access for demo)
    """
    try:
        # Try to get user from token, but allow anonymous
        current_user = None
        if authorization and authorization.startswith("Bearer "):
            try:
                token = authorization.replace("Bearer ", "").strip()
                from app.config import Config
                import jwt
                payload = jwt.decode(token, Config.SECRET_KEY, algorithms=[Config.ALGORITHM])
                user_id = payload.get("user_id")
                if user_id:
                    from app.models.database import User
                    current_user = db.query(User).filter(User.id == user_id).first()
            except Exception as e:
                logger.warning(f"Token validation failed: {e}")
        
        logger.info("="*60)
        logger.info(f"🔌 CONNECT REQUEST from user: {current_user.email if current_user else 'anonymous'}")
        logger.info(f"   Connection type: {request.connection_type}")
        logger.info(f"   Server URL: {request.server_url}")
        logger.info(f"   Port: {request.port}")
        
        # Build connection URL
        conn_type = str(request.connection_type.value) if hasattr(request.connection_type, 'value') else str(request.connection_type)
        if conn_type.upper() == "LOCALHOST":
            connection_url = f"http://localhost:{request.port}"
        else:
            # Check if URL is a tunnel URL (Cloudflare, ngrok) - don't add port
            server_url = request.server_url or ""
            is_tunnel_url = any(x in server_url.lower() for x in ['trycloudflare.com', 'ngrok', 'cloudflare', 'tunnel', '.app', 'localhost.run'])
            is_https = server_url.startswith('https://')
            
            if is_tunnel_url or is_https:
                # Tunnel URLs already handle port forwarding internally
                connection_url = server_url
                logger.info(f"   🔗 Detected tunnel/HTTPS URL - not adding port")
            else:
                # Regular HTTP URL - add port
                connection_url = f"{server_url}:{request.port}" if server_url else f"http://localhost:{request.port}"
        
        logger.info(f"🌐 Connection URL: {connection_url}")
        
        # Direct connection test using requests
        import requests
        import os
        is_connected = False
        message = ""
        
        # Check if this is a local/private IP being accessed from cloud
        is_private_ip = any(x in connection_url for x in ['192.168.', '10.', '172.16.', '172.17.', '172.18.', '172.19.', '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.', '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.'])
        is_localhost = 'localhost' in connection_url or '127.0.0.1' in connection_url
        is_cloud = os.environ.get('SPACE_ID') or os.environ.get('RENDER') or os.environ.get('RAILWAY_ENVIRONMENT')
        
        if is_cloud and (is_private_ip or is_localhost):
            is_connected = False
            message = f"Cannot connect to {connection_url} from cloud. Use ngrok to expose your Tally: 1) Install ngrok, 2) Run 'ngrok http 9000', 3) Use the ngrok URL here."
        else:
            try:
                # Test the connection URL directly
                response = requests.get(connection_url, timeout=10)
                if response.status_code == 200:
                    is_connected = True
                    message = "Connected to Tally successfully"
                else:
                    message = f"Tally responded with status {response.status_code}"
            except requests.exceptions.Timeout:
                message = "Connection timeout - Tally server not responding"
            except requests.exceptions.ConnectionError as e:
                if is_private_ip or is_localhost:
                    message = f"Cannot reach {connection_url}. If running on cloud, use ngrok to expose your Tally server to the internet."
                else:
                    message = f"Cannot reach Tally server at {connection_url}"
            except Exception as e:
                message = f"Connection error: {str(e)}"
        logger.info(f"📊 Direct connection test: {is_connected} - {message}")
        
        # Only save to DB if user is authenticated AND connection works
        if current_user and is_connected:
            try:
                tally_service = TallyDataService(url=connection_url, db=db, user=current_user)
                connection = tally_service.create_connection(
                    connection_type=request.connection_type,
                    server_url=request.server_url,
                    port=request.port
                )
                logger.info(f"✅ Connection saved to DB with ID: {connection.id}")
            except Exception as e:
                logger.warning(f"Could not save connection to DB: {e}")
        elif not current_user:
            logger.info("ℹ️ Anonymous user - skipping DB save")
        
        is_connected_detailed = is_connected
        
        # Save URL to global state if connected
        if is_connected:
            set_current_tally_url(connection_url)

        response_data = TallyConnectionResponse(
            connected=is_connected_detailed,
            connection_type=request.connection_type,
            url=connection_url,
            message=message
        )
        
        logger.info(f"✅ RETURNING: connected={is_connected_detailed}, url={connection_url}")
        logger.info("="*60)
        return response_data
        
    except Exception as e:
        logger.error("="*60)
        logger.error(f"❌ ERROR connecting to Tally: {e}", exc_info=True)
        logger.error("="*60)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reset-to-localhost")
async def reset_to_localhost(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Quick fix: Reset Tally connection to localhost
    """
    try:
        from models.database import TallyConnection, ConnectionType
        
        logger.info(f"Resetting connection to localhost for user {current_user.email}")
        
        # Deactivate ALL existing connections first
        db.query(TallyConnection).filter(
            TallyConnection.user_id == current_user.id
        ).update({"is_active": False})
        db.commit()
        
        # Create new localhost connection
        connection = TallyConnection(
            user_id=current_user.id,
            connection_type=ConnectionType.LOCALHOST,
            server_url=None,
            port=9000,
            is_active=True
        )
        db.add(connection)
        db.commit()
        db.refresh(connection)
        
        # Test the connection immediately
        tally_service = TallyDataService(db=db, user=current_user)
        is_connected, test_message = tally_service.check_connection_status()
        
        logger.info(f"Connection test result: {is_connected} - {test_message}")
        
        return {
            "success": True,
            "connected": is_connected,
            "message": "Connection reset to localhost:9000",
            "test_message": test_message,
            "url": "http://localhost:9000"
        }
    except Exception as e:
        logger.error(f"Error resetting connection: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/connector-status")
def get_connector_status():
    """
    Check TallyConnector DLL availability (no authentication required)
    """
    try:
        status = TallyDataService.get_tallyconnector_status()
        return {
            "success": True,
            **status
        }
    except Exception as e:
        logger.error(f"Error getting connector status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/refresh")
async def refresh_tally_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Force refresh all Tally data (bypass cache)
    """
    try:
        tally_service = TallyDataService(db=db, user=current_user)
        
        if not tally_service.connected:
            raise HTTPException(status_code=503, detail="Not connected to Tally")
        
        # Clear all cache first
        tally_service.clear_cache()
        
        # Get companies fresh from Tally (bypass cache)
        companies = tally_service.get_all_companies(use_cache=False)
        
        refreshed_count = 0
        for company in companies:
            company_name = company.get('name')
            if company_name:
                # Force fresh data fetch
                tally_service.get_ledgers_for_company(company_name, use_cache=False)
                refreshed_count += 1
        
        return {
            "success": True,
            "message": f"✓ Refreshed data for {refreshed_count} companies",
            "companies": [c.get('name') for c in companies],
            "count": refreshed_count,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error refreshing Tally data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
def get_tally_status(
    db: Session = Depends(get_db)
):
    """
    Get Tally connection status - allows anonymous access for initial status checks
    Returns status even if not connected (for backup mode support)
    """
    connected = False
    message = "Tally not connected - use backup file mode"
    tally_url = get_current_tally_url()
    connection_type = "remote" if "192." in tally_url or "10." in tally_url else "localhost"
    
    try:
        logger.info(f"📡 STATUS CHECK - Current URL: {tally_url}")
        
        # Try to connect to current Tally URL
        import requests
        try:
            response = requests.get(tally_url, timeout=5)
            if response.status_code == 200:
                connected = True
                message = "Connected to Tally"
            else:
                message = f"Tally responded with status {response.status_code}"
        except requests.exceptions.Timeout:
            message = "Tally not responding (timeout)"
        except requests.exceptions.ConnectionError:
            message = f"Cannot reach Tally at {tally_url}"
        except Exception as conn_error:
            logger.info(f"   Connection test failed: {conn_error}")
            connected = False
            message = f"Tally not connected: {str(conn_error)}"
        
        return {
            "success": True,
            "connected": connected,
            "is_connected": connected,
            "message": message,
            "connection_type": connection_type,
            "last_sync": datetime.utcnow().isoformat() if connected else None,
            "tally_url": tally_url
        }
    except Exception as e:
        logger.error(f"❌ Error checking Tally status: {e}", exc_info=True)
        # Return success response with connected=False - don't raise 500 error
        return {
            "success": True,
            "connected": False,
            "is_connected": False,
            "message": f"Status check failed: {str(e)}. Please ensure backend is running properly.",
            "connection_type": "unknown",
            "last_sync": None,
            "tally_url": tally_url
        }


# Helper function to get optional user (for anonymous backup access)
def get_optional_user(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Get user if authenticated, otherwise return None (for anonymous backup access)"""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        from jose import JWTError, jwt
        import os
        
        # Get secret key and algorithm from environment or defaults (same as auth_routes)
        SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
        ALGORITHM = "HS256"
        
        token = authorization.replace("Bearer ", "").strip()
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
        
        user = db.query(User).filter(User.email == email).first()
        return user
    except Exception as e:
        logger.debug(f"Optional user authentication failed: {e}")
        return None


@router.post("/refresh-companies")
async def refresh_companies(
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    Refresh company list from Tally (clears company cache and fetches fresh data)
    Use this when you've changed the active company in Tally
    """
    try:
        logger.info("🔄 REFRESH COMPANIES REQUEST")
        
        tally_service = TallyDataService(db=db, user=current_user)
        
        # Clear company cache specifically
        if current_user:
            tally_service.clear_cache("companies")
        
        # Check connection
        is_connected, status_msg = tally_service.check_connection_status()
        
        if not is_connected:
            return {
                "success": False,
                "connected": False,
                "message": "Cannot connect to Tally. Please ensure Tally is running with Gateway enabled on port 9000.",
                "companies": [],
                "timestamp": datetime.now().isoformat()
            }
        
        # Fetch fresh companies from Tally (bypass cache)
        companies = tally_service.get_all_companies(use_cache=False)
        
        logger.info(f"✓ Refreshed {len(companies)} companies from Tally")
        
        return {
            "success": True,
            "connected": True,
            "message": f"✓ Refreshed {len(companies)} companies from Tally",
            "companies": companies,
            "count": len(companies),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error refreshing companies: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/companies")
def get_companies(
    use_cache: bool = Query(True, description="Use cached data if unavailable"),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    Get all available companies from Tally
    Allows anonymous access for cached/backup data
    """
    try:
        # Allow anonymous access for cached data
        if current_user is None:
            logger.info("📋 GET COMPANIES (anonymous - using cached/backup data)")
        else:
            logger.info(f"📋 GET COMPANIES (authenticated user: {current_user.email})")
        
        tally_service = TallyDataService(db=db, user=current_user)
        companies = tally_service.get_all_companies(use_cache=use_cache)
        is_connected, message = tally_service.check_connection_status()
        source = "live" if is_connected else "cache"
        
        # If not connected and no user, explicitly use backup/cache source
        if not is_connected and current_user is None:
            source = "backup"
            logger.info(f"📋 Using backup/cache source for anonymous access")
        
        return {
            "companies": companies,
            "count": len(companies),
            "source": source,
            "message": message
        }
    except Exception as e:
        logger.error(f"Error fetching companies: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/debug-connection")
def debug_tally_connection():
    """
    Debug Tally connection with detailed diagnostics (no auth required)
    """
    try:
        import requests
        import os
        
        tally_url = get_current_tally_url()
        
        diagnostics = {
            "timestamp": datetime.utcnow().isoformat(),
            "current_tally_url": tally_url,
            "is_cloud": bool(os.environ.get('SPACE_ID') or os.environ.get('RENDER')),
            "tests": []
        }
        
        # Test 1: Check if Tally URL is accessible
        test1 = {"name": "Tally URL Accessibility", "status": "unknown", "details": "", "url": tally_url}
        try:
            response = requests.get(tally_url, timeout=5)
            test1["status"] = "success"
            test1["details"] = f"Tally is accessible, got response code: {response.status_code}"
        except requests.exceptions.ConnectionError:
            test1["status"] = "failed"
            test1["details"] = f"Cannot connect to {tally_url}. Tally might not be running or URL is incorrect."
        except requests.exceptions.Timeout:
            test1["status"] = "failed"
            test1["details"] = f"Connection timed out. Tally at {tally_url} is not responding."
        except Exception as e:
            test1["status"] = "error"
            test1["details"] = str(e)
        diagnostics["tests"].append(test1)
        
        # Test 2: Check for private IP from cloud
        is_private_ip = any(x in tally_url for x in ['192.168.', '10.', '172.'])
        is_localhost = 'localhost' in tally_url or '127.0.0.1' in tally_url
        is_cloud = diagnostics["is_cloud"]
        
        test2 = {"name": "Network Accessibility", "status": "unknown", "details": ""}
        if is_cloud and (is_private_ip or is_localhost):
            test2["status"] = "failed"
            test2["details"] = "Cloud server cannot reach local/private IPs. Use ngrok to expose your Tally."
        else:
            test2["status"] = "success"
            test2["details"] = "Network configuration is correct for this environment."
        diagnostics["tests"].append(test2)
        
        # Overall status
        all_success = all(test["status"] == "success" for test in diagnostics["tests"])
        diagnostics["overall_status"] = "✓ All tests passed" if all_success else "✗ Some tests failed"
        diagnostics["tally_ready"] = all_success
        
        # Add help for troubleshooting
        if not all_success:
            diagnostics["help"] = {
                "ngrok_instructions": "1) Install ngrok from ngrok.com, 2) Run 'ngrok http 9000', 3) Use the https URL shown",
                "local_testing": "Run the backend locally (python run.py) to test with local Tally"
            }
        
        return diagnostics
        
    except Exception as e:
        logger.error(f"Error in debug endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== LEGACY ENDPOINT (Backward Compatible) ====================

@router.post("/connect/legacy", response_model=TallyConnectionResponse)
async def connect_to_tally_legacy(request: TallyConnectionRequest):
    """
    Legacy: Connect to Tally without user authentication (backward compatible)
    """
    try:
        url = f"http://localhost:{request.port}" if request.connection_type == "localhost" else f"{request.server_url}:{request.port}"
        logger.info(f"Legacy connection attempt to: {url}")
        tally_service = TallyDataService(url=url)

        if tally_service.connected:
            return TallyConnectionResponse(
                connected=True,
                connection_type=request.connection_type,
                url=url,
                message=f"✓ Connected to Tally at {url} (legacy mode)"
            )
        else:
            return TallyConnectionResponse(
                connected=False,
                connection_type=request.connection_type,
                url=url,
                message=f"✗ Could not connect to Tally at {url}"
            )
    except Exception as e:
        logger.error(f"Error in legacy connection: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== DATA RETRIEVAL ENDPOINTS ====================

@router.get("/ledgers/{company_name}")
def get_ledgers(
    company_name: str,
    use_cache: bool = Query(True, description="Use cached data if unavailable"),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    Get all ledgers for a company
    """
    try:
        tally_service = TallyDataService(db=db, user=current_user)
        ledgers = tally_service.get_ledgers_for_company(company_name, use_cache=use_cache)
        is_connected, message = tally_service.check_connection_status()
        source = "live" if is_connected else "cache"

        return {
            "company": company_name,
            "ledgers": ledgers,
            "count": len(ledgers),
            "source": source,
            "message": message
        }
    except Exception as e:
        logger.error(f"Error fetching ledgers: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/vouchers/{company_name}")
def get_vouchers(
    company_name: str,
    from_date: Optional[str] = Query(None, description="Start date (YYYYMMDD)"),
    to_date: Optional[str] = Query(None, description="End date (YYYYMMDD)"),
    voucher_type: Optional[str] = Query(None, description="Voucher type filter"),
    use_cache: bool = Query(True, description="Use cached data if unavailable"),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    Get vouchers/transactions for a company
    """
    try:
        tally_service = TallyDataService(db=db, user=current_user)
        vouchers = tally_service.get_vouchers_for_company(
            company_name=company_name,
            from_date=from_date,
            to_date=to_date,
            voucher_type=voucher_type,
            use_cache=use_cache
        )
        is_connected, message = tally_service.check_connection_status()
        source = "live" if is_connected else "cache"

        return {
            "company": company_name,
            "vouchers": vouchers,
            "count": len(vouchers),
            "filters": {
                "from_date": from_date,
                "to_date": to_date,
                "voucher_type": voucher_type
            },
            "source": source,
            "message": message
        }
    except Exception as e:
        logger.error(f"Error fetching vouchers: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary/{company_name}")
def get_financial_summary(
    company_name: str,
    use_cache: bool = Query(True, description="Use cached data if unavailable"),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    Get financial summary for a company
    """
    try:
        tally_service = TallyDataService(db=db, user=current_user)
        summary = tally_service.get_financial_summary(company_name, use_cache=use_cache)

        if not summary:
            raise HTTPException(
                status_code=404,
                detail=f"No data found for company: {company_name}"
            )
        
        is_connected, message = tally_service.check_connection_status()
        source = "live" if is_connected else "cache"

        return {
            "company": company_name,
            "summary": summary,
            "source": source,
            "message": message
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== CACHE MANAGEMENT ====================

@router.get("/cache/info")
def get_cache_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get information about cached Tally data for current user
    """
    try:
        tally_service = TallyDataService(db=db, user=current_user)
        cache_info = tally_service.get_cache_info()
        return {
            "cache_entries": cache_info,
            "total_entries": len(cache_info)
        }
    except Exception as e:
        logger.error(f"Error getting cache info: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/cache")
async def clear_cache(
    cache_key: Optional[str] = Query(None, description="Specific cache key to clear"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Clear cached Tally data for current user
    """
    try:
        tally_service = TallyDataService(db=db, user=current_user)
        tally_service.clear_cache(cache_key)
        return {
            "success": True,
            "message": f"Cache cleared successfully" + (f" for key: {cache_key}" if cache_key else " (all entries)")
        }
    except Exception as e:
        logger.error(f"Error clearing cache: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== CONNECTION INFO ====================

@router.get("/connection/info")
def get_connection_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's Tally connection information
    """
    try:
        logger.info(f"📋 CONNECTION INFO for user: {current_user.email}")
        
        # Get ALL connections for debugging
        from app.models.database import TallyConnection
        all_connections = db.query(TallyConnection).filter(
            TallyConnection.user_id == current_user.id
        ).all()
        
        logger.info(f"   Found {len(all_connections)} total connections")
        for conn in all_connections:
            logger.info(f"   - ID:{conn.id} Type:{conn.connection_type.value} URL:{conn.server_url} Port:{conn.port} Active:{conn.is_active}")
        
        tally_service = TallyDataService(db=db, user=current_user)
        connection = tally_service.get_active_connection()

        if not connection:
            logger.info("   ⚠️ No active connection found")
            return {
                "configured": False,
                "message": "No Tally connection configured",
                "all_connections_count": len(all_connections)
            }

        logger.info(f"   ✅ Active connection: ID={connection.id}, Type={connection.connection_type.value}")
        
        is_connected, status_message = tally_service.check_connection_status()
        logger.info(f"   Connection status: {is_connected} - {status_message}")

        return {
            "configured": True,
            "connection_id": connection.id,
            "connection_type": connection.connection_type.value,
            "server_url": connection.server_url,
            "port": connection.port,
            "is_active": connection.is_active,
            "is_connected": is_connected,
            "last_connected": connection.last_connected.isoformat() if connection.last_connected else None,
            "created_at": connection.created_at.isoformat(),
            "url": tally_service.get_connection_url(connection),
            "status_message": status_message,
            "all_connections_count": len(all_connections)
        }
    except Exception as e:
        logger.error(f"❌ Error getting connection info: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ==================== RAG/DOCUMENTS ====================

@router.get("/stock-items/{company_name}")
def get_stock_items(
    company_name: str,
    use_cache: bool = Query(True, description="Use cached data if unavailable"),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    Get all stock/inventory items for a company
    """
    try:
        tally_service = TallyDataService(db=db, user=current_user)
        stock_items = tally_service.get_stock_items_for_company(company_name, use_cache=use_cache)
        is_connected, message = tally_service.check_connection_status()
        source = "live" if is_connected else "cache"

        return {
            "company": company_name,
            "stock_items": stock_items,
            "count": len(stock_items),
            "source": source,
            "message": message
        }
    except Exception as e:
        logger.error(f"Error fetching stock items: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/all-data/{company_name}")
def get_all_company_data(
    company_name: str,
    use_cache: bool = Query(True, description="Use cached data if unavailable"),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    Get ALL Tally data for a company (ledgers, vouchers, stock items, summary)
    """
    try:
        logger.info(f"Fetching ALL data for company: {company_name}")
        tally_service = TallyDataService(db=db, user=current_user)
        is_connected, status_message = tally_service.check_connection_status()
        source = "live" if is_connected else "cache"
        
        # Fetch all data types
        data = {
            "company": company_name,
            "ledgers": [],
            "vouchers": [],
            "stock_items": [],
            "summary": {},
            "counts": {},
            "source": source,
            "connected": is_connected,
            "message": status_message
        }
        
        # 1. Fetch Ledgers
        try:
            data["ledgers"] = tally_service.get_ledgers_for_company(company_name, use_cache=use_cache)
            data["counts"]["ledgers"] = len(data["ledgers"])
            logger.info(f"✓ Loaded {data['counts']['ledgers']} ledgers")
        except Exception as e:
            logger.error(f"Error fetching ledgers: {e}")
            data["counts"]["ledgers"] = 0
        
        # 2. Fetch Vouchers (fetches ALL data in safe batches)
        try:
            # Fetch ALL vouchers - will be done in monthly batches to prevent Tally crashes
            from datetime import datetime, timedelta
            default_to_date = datetime.now().strftime('%Y%m%d')
            # Default to 3 years ago (1095 days)
            default_from_date = (datetime.now() - timedelta(days=1095)).strftime('%Y%m%d')
            
            data["vouchers"] = tally_service.get_vouchers_for_company(
                company_name=company_name,
                from_date=default_from_date,  # Default to 1 year ago
                to_date=default_to_date,      # Default to today
                use_cache=use_cache
            )
            data["counts"]["vouchers"] = len(data["vouchers"])
            logger.info(f"✓ Loaded {data['counts']['vouchers']} vouchers (ALL data fetched in safe batches from {default_from_date} to {default_to_date})")
        except Exception as e:
            logger.error(f"Error fetching vouchers: {e}")
            data["counts"]["vouchers"] = 0
        
        # 3. Fetch Stock Items
        try:
            data["stock_items"] = tally_service.get_stock_items_for_company(company_name, use_cache=use_cache)
            data["counts"]["stock_items"] = len(data["stock_items"])
            logger.info(f"✓ Loaded {data['counts']['stock_items']} stock items")
        except Exception as e:
            logger.error(f"Error fetching stock items: {e}")
            data["counts"]["stock_items"] = 0
        
        # 4. Fetch Financial Summary
        try:
            data["summary"] = tally_service.get_financial_summary(company_name, use_cache=use_cache)
            logger.info(f"✓ Financial summary loaded")
        except Exception as e:
            logger.error(f"Error fetching summary: {e}")
            data["summary"] = {}
        
        logger.info(f"ALL DATA FETCHED: Ledgers={data['counts'].get('ledgers', 0)}, "
                   f"Vouchers={data['counts'].get('vouchers', 0)}, "
                   f"Stock={data['counts'].get('stock_items', 0)}")
        
        return data
    except Exception as e:
        logger.error(f"Error fetching all company data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/documents/{company_name}")
def get_tally_documents(
    company_name: str,
    use_cache: bool = Query(True, description="Use cached data if unavailable"),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    Convert Tally data to LangChain documents for RAG
    """
    try:
        tally_service = TallyDataService(db=db, user=current_user)
        documents = tally_service.convert_tally_data_to_documents(
            company_name=company_name,
            use_cache=use_cache
        )
        is_connected, message = tally_service.check_connection_status()

        doc_list = []
        for doc in documents:
            doc_list.append({
                "page_content": doc.page_content,
                "metadata": doc.metadata
            })

        return {
            "company": company_name,
            "documents": doc_list,
            "count": len(doc_list),
            "source": "live" if is_connected else "cache",
            "message": message
        }
    except Exception as e:
        logger.error(f"Error generating documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))
