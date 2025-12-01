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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Configure user-specific Tally connection (local or remote)
    """
    try:
        logger.info("="*60)
        logger.info(f"🔌 CONNECT REQUEST from user: {current_user.email}")
        logger.info(f"   Connection type: {request.connection_type}")
        logger.info(f"   Server URL: {request.server_url}")
        logger.info(f"   Port: {request.port}")
        
        tally_service = TallyDataService(db=db, user=current_user)
        
        # Create/update connection in database
        connection = tally_service.create_connection(
            connection_type=request.connection_type,
            server_url=request.server_url,
            port=request.port
        )
        logger.info(f"✅ Connection saved to DB with ID: {connection.id}")
        
        # Build connection URL
        connection_url = tally_service.get_connection_url(connection)
        logger.info(f"🌐 Connection URL: {connection_url}")
        
        # Test the connection immediately
        logger.info("🔍 Testing connection...")
        is_connected = tally_service.check_connection()
        logger.info(f"📊 Connection test result: {is_connected}")
        
        # Get detailed status message
        is_connected_detailed, message = tally_service.check_connection_status()
        logger.info(f"📝 Detailed status: {is_connected_detailed} - {message}")

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
async def get_connector_status():
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
        
        # Get companies and refresh their data
        companies = tally_service.get_companies()
        
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
            "count": refreshed_count,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error refreshing Tally data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def get_tally_status(
    db: Session = Depends(get_db)
):
    """
    Get Tally connection status - allows anonymous access for initial status checks
    Returns status even if not connected (for backup mode support)
    """
    try:
        # Allow anonymous access - try to get user if token is provided, but don't require it
        user = None
        try:
            from app.routes.auth_routes import get_current_user
            from fastapi import Header
            from typing import Optional
            
            # Try to get auth token from header
            try:
                # This will work if token is provided, but won't fail if not
                # We'll handle it gracefully
                pass  # Skip auth check for status endpoint
            except:
                pass
        except:
            pass
        
        logger.info("📡 STATUS CHECK (anonymous or authenticated)")
        
        # Use default service (no user required) - just check if Tally is accessible
        # Try localhost as fallback, but don't fail if it doesn't work
        connected = False
        message = "Tally not connected - use backup file mode"
        connection_type = "localhost"
        tally_url = "http://localhost:9000"
        
        try:
            from app.services.custom_tally_connector import CustomTallyConnector
            connector = CustomTallyConnector()
            connected, message = connector.test_connection()
            logger.info(f"   Localhost connection result: {connected}")
        except Exception as conn_error:
            logger.info(f"   Localhost connection test skipped: {conn_error}")
            connected = False
            message = "Tally not connected - use backup file mode"
        
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
        # Return success=False but don't raise exception - allow frontend to handle gracefully
        return {
            "success": False,
            "connected": False,
            "is_connected": False,
            "message": f"Status check error: {str(e)}",
            "connection_type": "unknown",
            "last_sync": None,
            "tally_url": None
        }


# Helper function to get optional user (for anonymous backup access)
async def get_optional_user(
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

@router.get("/companies")
async def get_companies(
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
async def debug_tally_connection():
    """
    Debug Tally connection with detailed diagnostics (no auth required)
    """
    try:
        from app.services.custom_tally_connector import CustomTallyConnector
        import requests
        
        diagnostics = {
            "timestamp": datetime.utcnow().isoformat(),
            "tests": []
        }
        
        # Test 1: Check if port 9000 is accessible
        test1 = {"name": "Port 9000 Accessibility", "status": "unknown", "details": ""}
        try:
            response = requests.get("http://localhost:9000", timeout=5)
            test1["status"] = "success"
            test1["details"] = f"Port is accessible, got response code: {response.status_code}"
        except requests.exceptions.ConnectionError:
            test1["status"] = "failed"
            test1["details"] = "Cannot connect to port 9000. Tally might not be running or Gateway is disabled."
        except requests.exceptions.Timeout:
            test1["status"] = "failed"
            test1["details"] = "Connection timed out. Tally is not responding on port 9000."
        except Exception as e:
            test1["status"] = "error"
            test1["details"] = str(e)
        diagnostics["tests"].append(test1)
        
        # Test 2: Try custom connector
        test2 = {"name": "Custom Connector Test", "status": "unknown", "details": ""}
        try:
            connector = CustomTallyConnector(host="localhost", port=9000)
            is_connected, message = connector.test_connection()
            test2["status"] = "success" if is_connected else "failed"
            test2["details"] = message
        except Exception as e:
            test2["status"] = "error"
            test2["details"] = str(e)
        diagnostics["tests"].append(test2)
        
        # Test 3: Try to get companies
        test3 = {"name": "Get Companies Test", "status": "unknown", "details": "", "company_count": 0}
        try:
            connector = CustomTallyConnector(host="localhost", port=9000)
            companies = connector.get_companies()
            test3["status"] = "success"
            test3["company_count"] = len(companies)
            test3["details"] = f"Successfully retrieved {len(companies)} companies"
            if companies:
                test3["sample_companies"] = [c['name'] for c in companies[:3]]
        except Exception as e:
            test3["status"] = "error"
            test3["details"] = str(e)
        diagnostics["tests"].append(test3)
        
        # Overall status
        all_success = all(test["status"] == "success" for test in diagnostics["tests"])
        diagnostics["overall_status"] = "✓ All tests passed" if all_success else "✗ Some tests failed"
        diagnostics["tally_ready"] = all_success
        
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
async def get_ledgers(
    company_name: str,
    use_cache: bool = Query(True, description="Use cached data if unavailable"),
    current_user: User = Depends(get_current_user),
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
async def get_vouchers(
    company_name: str,
    from_date: Optional[str] = Query(None, description="Start date (YYYYMMDD)"),
    to_date: Optional[str] = Query(None, description="End date (YYYYMMDD)"),
    voucher_type: Optional[str] = Query(None, description="Voucher type filter"),
    use_cache: bool = Query(True, description="Use cached data if unavailable"),
    current_user: User = Depends(get_current_user),
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
async def get_financial_summary(
    company_name: str,
    use_cache: bool = Query(True, description="Use cached data if unavailable"),
    current_user: User = Depends(get_current_user),
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
async def get_cache_info(
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
async def get_connection_info(
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
async def get_stock_items(
    company_name: str,
    use_cache: bool = Query(True, description="Use cached data if unavailable"),
    current_user: User = Depends(get_current_user),
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
async def get_all_company_data(
    company_name: str,
    use_cache: bool = Query(True, description="Use cached data if unavailable"),
    current_user: User = Depends(get_current_user),
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
            # Default to 10 years ago to get all historical data (fetched in safe batches)
            default_from_date = (datetime.now() - timedelta(days=3650)).strftime('%Y%m%d')
            
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
async def get_tally_documents(
    company_name: str,
    use_cache: bool = Query(True, description="Use cached data if unavailable"),
    current_user: User = Depends(get_current_user),
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