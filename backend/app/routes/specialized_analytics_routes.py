"""
🎯 SPECIALIZED ANALYTICS ROUTES
Each dashboard type gets unique data endpoints
Supports: live, backup, and bridge data sources
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Header
from sqlalchemy.orm import Session
from typing import Optional
from app.models.database import get_db, User, TallyCache
from app.routes.auth_routes import get_current_user
from app.services.tally_service import TallyDataService
from app.services.specialized_analytics import SpecializedAnalytics
import logging
import json
import asyncio

logger = logging.getLogger(__name__)
router = APIRouter()

# Import bridge manager for bridge mode
try:
    from app.routes.ws_bridge_routes import bridge_manager, get_tally_data_via_bridge
    BRIDGE_AVAILABLE = True
except ImportError:
    BRIDGE_AVAILABLE = False
    bridge_manager = None
    logger.warning("Bridge routes not available")


# Helper to fetch Tally data via Bridge
async def fetch_tally_via_bridge(bridge_token: str, data_type: str, company_name: str = None) -> Optional[dict]:
    """
    Fetch Tally data via the WebSocket bridge
    
    Args:
        bridge_token: User's bridge token
        data_type: Type of data to fetch (ledgers, vouchers, trial_balance, etc.)
        company_name: Optional company name
    
    Returns:
        Dict with Tally data or None if bridge not connected
    """
    if not BRIDGE_AVAILABLE or not bridge_manager:
        logger.warning("Bridge not available")
        return None
    
    if not bridge_manager.is_connected(bridge_token):
        logger.warning(f"Bridge not connected: {bridge_token}")
        return None
    
    # Build XML request based on data type
    xml_requests = {
        'companies': """<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>All Companies</ID></HEADER><BODY><DESC><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES><TDL><TDLMESSAGE><COLLECTION NAME="All Companies"><TYPE>Company</TYPE><FETCH>Name</FETCH></COLLECTION></TDLMESSAGE></TDL></DESC></BODY></ENVELOPE>""",
        
        'ledgers': f"""<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>All Ledgers</ID></HEADER><BODY><DESC><STATICVARIABLES><SVCURRENTCOMPANY>{company_name or ''}</SVCURRENTCOMPANY><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES><TDL><TDLMESSAGE><COLLECTION NAME="All Ledgers"><TYPE>Ledger</TYPE><FETCH>NAME, PARENT, OPENINGBALANCE, CLOSINGBALANCE</FETCH></COLLECTION></TDLMESSAGE></TDL></DESC></BODY></ENVELOPE>""",
        
        'trial_balance': f"""<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Data</TYPE><ID>Trial Balance</ID></HEADER><BODY><DESC><STATICVARIABLES><SVCURRENTCOMPANY>{company_name or ''}</SVCURRENTCOMPANY><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES><TDL><TDLMESSAGE><REPORT NAME="Trial Balance"><OPTION>XML</OPTION></REPORT></TDLMESSAGE></TDL></DESC></BODY></ENVELOPE>""",
        
        'profit_loss': f"""<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Data</TYPE><ID>Profit and Loss</ID></HEADER><BODY><DESC><STATICVARIABLES><SVCURRENTCOMPANY>{company_name or ''}</SVCURRENTCOMPANY><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES><TDL><TDLMESSAGE><REPORT NAME="Profit and Loss"><OPTION>XML</OPTION></REPORT></TDLMESSAGE></TDL></DESC></BODY></ENVELOPE>""",
        
        'balance_sheet': f"""<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Data</TYPE><ID>Balance Sheet</ID></HEADER><BODY><DESC><STATICVARIABLES><SVCURRENTCOMPANY>{company_name or ''}</SVCURRENTCOMPANY><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES><TDL><TDLMESSAGE><REPORT NAME="Balance Sheet"><OPTION>XML</OPTION></REPORT></TDLMESSAGE></TDL></DESC></BODY></ENVELOPE>""",
        
        'vouchers': f"""<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>All Vouchers</ID></HEADER><BODY><DESC><STATICVARIABLES><SVCURRENTCOMPANY>{company_name or ''}</SVCURRENTCOMPANY><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES><TDL><TDLMESSAGE><COLLECTION NAME="All Vouchers"><TYPE>Voucher</TYPE><FETCH>DATE, VOUCHERTYPENAME, VOUCHERNUMBER, PARTYLEDGERNAME, AMOUNT</FETCH></COLLECTION></TDLMESSAGE></TDL></DESC></BODY></ENVELOPE>""",
        
        'groups': f"""<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>All Groups</ID></HEADER><BODY><DESC><STATICVARIABLES><SVCURRENTCOMPANY>{company_name or ''}</SVCURRENTCOMPANY><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES><TDL><TDLMESSAGE><COLLECTION NAME="All Groups"><TYPE>Group</TYPE><FETCH>NAME, PARENT</FETCH></COLLECTION></TDLMESSAGE></TDL></DESC></BODY></ENVELOPE>""",
        
        'stock_items': f"""<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>All Stock Items</ID></HEADER><BODY><DESC><STATICVARIABLES><SVCURRENTCOMPANY>{company_name or ''}</SVCURRENTCOMPANY><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES><TDL><TDLMESSAGE><COLLECTION NAME="All Stock Items"><TYPE>StockItem</TYPE><FETCH>NAME, PARENT, OPENINGBALANCE, CLOSINGBALANCE, OPENINGVALUE, CLOSINGVALUE</FETCH></COLLECTION></TDLMESSAGE></TDL></DESC></BODY></ENVELOPE>"""
    }
    
    xml_request = xml_requests.get(data_type, xml_requests['ledgers'])
    
    try:
        response = await bridge_manager.send_to_bridge(bridge_token, {
            'type': 'tally_request',
            'method': 'POST',
            'payload': xml_request,
            'headers': {'Content-Type': 'text/xml'},
            'timeout': 120
        })
        
        if response.get('success'):
            return {
                'success': True,
                'data': response.get('content', ''),
                'source': 'bridge'
            }
        else:
            logger.error(f"Bridge request failed: {response.get('error')}")
            return None
    except Exception as e:
        logger.error(f"Error fetching via bridge: {e}")
        return None


# Helper function to get optional user (for anonymous dashboard access)
async def get_optional_user_dashboard(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Get user if authenticated, otherwise return None - ALWAYS allows anonymous access"""
    # No authorization = anonymous access (allowed)
    if not authorization:
        return None
    
    # Check for Bearer token (case-insensitive)
    auth_lower = authorization.lower() if authorization else ""
    if not auth_lower.startswith("bearer "):
        return None
    
    try:
        from jose import jwt
        import os
        
        SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
        ALGORITHM = "HS256"
        
        # Extract token (skip "Bearer " - 7 chars)
        token = authorization[7:].strip() if len(authorization) > 7 else ""
        
        # Skip empty or demo tokens - allow anonymous
        if not token or len(token) < 10 or token.startswith("demo-token-"):
            return None
            
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_email = payload.get("sub")
        if user_email:
            user = db.query(User).filter(User.email == user_email).first()
            return user
    except Exception as e:
        # ANY error = allow anonymous access
        logger.debug(f"Token validation skipped: {e}")
    return None


# Helper function to get backup data directly from cache
def get_backup_data_direct(db: Session, company_name: str, user_id: Optional[int] = None) -> Optional[dict]:
    """Get backup data directly from cache - searches all users if not found for current user"""
    try:
        # First try exact match with user
        cache_entry = db.query(TallyCache).filter(
            TallyCache.source == "backup",
            TallyCache.cache_key == f"backup_data_{company_name}"
        ).first()
        
        # If not found, search all backup entries
        if not cache_entry:
            all_entries = db.query(TallyCache).filter(
                TallyCache.source == "backup"
            ).all()
            
            company_name_lower = company_name.lower()
            for entry in all_entries:
                try:
                    data = json.loads(entry.cache_data) if isinstance(entry.cache_data, str) else entry.cache_data
                    cached_company = data.get("company", {}).get("name", "")
                    if cached_company.lower() == company_name_lower:
                        cache_entry = entry
                        break
                except:
                    continue
        
        if cache_entry:
            return json.loads(cache_entry.cache_data) if isinstance(cache_entry.cache_data, str) else cache_entry.cache_data
        
        return None
    except Exception as e:
        logger.error(f"Error getting backup data: {e}")
        return None


# Helper for auto-fallback to backup when live fails
async def get_dashboard_with_fallback(
    dashboard_type: str,
    analytics_method: str,
    company_name: str,
    source: str,
    refresh: bool,
    db: Session,
    current_user: Optional[User],
    bridge_token: Optional[str] = None
):
    """Try live/bridge mode first, automatically fallback to backup if live fails"""
    actual_source = source
    fallback_used = False
    
    try:
        # BRIDGE MODE - Fetch data via WebSocket bridge
        if source == "bridge" and bridge_token:
            logger.info(f"{dashboard_type} Dashboard - Using BRIDGE for {company_name}")
            
            if not BRIDGE_AVAILABLE or not bridge_manager:
                raise HTTPException(status_code=503, detail="Bridge service not available")
            
            if not bridge_manager.is_connected(bridge_token):
                raise HTTPException(status_code=503, detail="Bridge not connected. Run TallyConnector on your PC.")
            
            # Fetch raw data via bridge - we'll need ledgers and trial balance
            bridge_data = {}
            
            # Fetch ledgers
            ledgers_response = await fetch_tally_via_bridge(bridge_token, 'ledgers', company_name)
            if ledgers_response and ledgers_response.get('success'):
                bridge_data['ledgers_xml'] = ledgers_response.get('data', '')
            
            # Fetch trial balance
            tb_response = await fetch_tally_via_bridge(bridge_token, 'trial_balance', company_name)
            if tb_response and tb_response.get('success'):
                bridge_data['trial_balance_xml'] = tb_response.get('data', '')
            
            # Fetch profit & loss
            pl_response = await fetch_tally_via_bridge(bridge_token, 'profit_loss', company_name)
            if pl_response and pl_response.get('success'):
                bridge_data['profit_loss_xml'] = pl_response.get('data', '')
            
            # Fetch balance sheet
            bs_response = await fetch_tally_via_bridge(bridge_token, 'balance_sheet', company_name)
            if bs_response and bs_response.get('success'):
                bridge_data['balance_sheet_xml'] = bs_response.get('data', '')
            
            # Parse bridge data and calculate analytics
            from app.services.bridge_analytics import BridgeAnalytics
            bridge_analytics = BridgeAnalytics(bridge_data)
            method = getattr(bridge_analytics, analytics_method, None)
            
            if method:
                data = method(company_name)
            else:
                # Fallback to basic parsing
                data = bridge_analytics.get_basic_analytics(company_name)
            
            return {
                "success": True, 
                "data": data, 
                "company": company_name, 
                "source": "bridge",
                "fallback_used": False
            }
        
        # BACKUP MODE
        if source == "backup":
            logger.info(f"{dashboard_type} Dashboard - Using backup data for {company_name}")
            tally_service = TallyDataService(url="http://localhost:9000", db=db, user=current_user)
            tally_service.connected = False
        else:
            # LIVE MODE
            tally_service = TallyDataService(db=db, user=current_user)
            # Check if Tally is actually connected
            if not tally_service.connected:
                logger.warning(f"{dashboard_type} Dashboard - Tally not connected, trying backup...")
                actual_source = "backup"
                fallback_used = True
        
        analytics_service = SpecializedAnalytics(tally_service)
        method = getattr(analytics_service, analytics_method)
        data = method(company_name, use_cache=not refresh, source=actual_source)
        
        # If live returned empty data, try backup
        if source == "live" and not fallback_used:
            is_empty = (
                not data or 
                (isinstance(data, dict) and data.get('executive_summary', {}).get('total_revenue', 0) == 0)
            )
            if is_empty:
                logger.warning(f"{dashboard_type} Dashboard - Live data empty, trying backup...")
                tally_service_backup = TallyDataService(url="http://localhost:9000", db=db, user=current_user)
                tally_service_backup.connected = False
                analytics_backup = SpecializedAnalytics(tally_service_backup)
                backup_data = getattr(analytics_backup, analytics_method)(company_name, use_cache=True, source="backup")
                if backup_data and isinstance(backup_data, dict):
                    backup_revenue = backup_data.get('executive_summary', {}).get('total_revenue', 0)
                    if backup_revenue > 0:
                        data = backup_data
                        actual_source = "backup"
                        fallback_used = True
                        logger.info(f"{dashboard_type} Dashboard - Using backup data (auto-fallback)")
        
        return {
            "success": True, 
            "data": data, 
            "company": company_name, 
            "source": actual_source,
            "fallback_used": fallback_used
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in {dashboard_type} analytics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ceo/{company_name}")
async def get_ceo_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live', 'backup', or 'bridge'"),
    bridge_token: Optional[str] = Query(None, description="Bridge token for bridge mode"),
    current_user: Optional[User] = Depends(get_optional_user_dashboard),
    db: Session = Depends(get_db)
):
    """CEO Dashboard - Executive Overview"""
    return await get_dashboard_with_fallback("CEO", "get_ceo_analytics", company_name, source, refresh, db, current_user, bridge_token)


@router.get("/cfo/{company_name}")
async def get_cfo_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live', 'backup', or 'bridge'"),
    bridge_token: Optional[str] = Query(None, description="Bridge token for bridge mode"),
    current_user: Optional[User] = Depends(get_optional_user_dashboard),
    db: Session = Depends(get_db)
):
    """CFO Dashboard - Financial Health"""
    return await get_dashboard_with_fallback("CFO", "get_cfo_analytics", company_name, source, refresh, db, current_user, bridge_token)


@router.get("/sales/{company_name}")
def get_sales_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live' or 'backup'"),
    current_user: Optional[User] = Depends(get_optional_user_dashboard),
    db: Session = Depends(get_db)
):
    """Sales Dashboard - Sales Performance"""
    try:
        if source == "backup":
            tally_service = TallyDataService(url="http://localhost:9000", db=db, user=current_user)
            tally_service.connected = False
        else:
            tally_service = TallyDataService(db=db, user=current_user)
        
        analytics_service = SpecializedAnalytics(tally_service)
        data = analytics_service.get_sales_analytics(company_name, use_cache=not refresh, source=source)
        
        return {"success": True, "data": data, "company": company_name, "source": source}
    except Exception as e:
        logger.error(f"Error in Sales analytics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cashflow/{company_name}")
def get_cashflow_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live' or 'backup'"),
    current_user: Optional[User] = Depends(get_optional_user_dashboard),
    db: Session = Depends(get_db)
):
    """Cash Flow Dashboard"""
    try:
        if source == "backup":
            tally_service = TallyDataService(url="http://localhost:9000", db=db, user=current_user)
            tally_service.connected = False
        else:
            tally_service = TallyDataService(db=db, user=current_user)
        
        analytics_service = SpecializedAnalytics(tally_service)
        data = analytics_service.get_cashflow_analytics(company_name, use_cache=not refresh, source=source)
        
        return {"success": True, "data": data, "company": company_name, "source": source}
    except Exception as e:
        logger.error(f"Error in Cash Flow analytics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/inventory/{company_name}")
def get_inventory_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live' or 'backup'"),
    current_user: Optional[User] = Depends(get_optional_user_dashboard),
    db: Session = Depends(get_db)
):
    """Inventory Dashboard"""
    try:
        if source == "backup":
            tally_service = TallyDataService(url="http://localhost:9000", db=db, user=current_user)
            tally_service.connected = False
        else:
            tally_service = TallyDataService(db=db, user=current_user)
        
        analytics_service = SpecializedAnalytics(tally_service)
        data = analytics_service.get_inventory_analytics(company_name, use_cache=not refresh, source=source)
        
        return {"success": True, "data": data, "company": company_name, "source": source}
    except Exception as e:
        logger.error(f"Error in Inventory analytics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/accounts-receivable/{company_name}")
def get_ar_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live' or 'backup'"),
    current_user: Optional[User] = Depends(get_optional_user_dashboard),
    db: Session = Depends(get_db)
):
    """Accounts Receivable Dashboard"""
    try:
        if source == "backup":
            tally_service = TallyDataService(url="http://localhost:9000", db=db, user=current_user)
            tally_service.connected = False
        else:
            tally_service = TallyDataService(db=db, user=current_user)
        
        analytics_service = SpecializedAnalytics(tally_service)
        data = analytics_service.get_accounts_receivable_analytics(company_name, use_cache=not refresh, source=source)
        
        return {"success": True, "data": data, "company": company_name, "source": source}
    except Exception as e:
        logger.error(f"Error in AR analytics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/accounts-payable/{company_name}")
def get_ap_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live' or 'backup'"),
    current_user: Optional[User] = Depends(get_optional_user_dashboard),
    db: Session = Depends(get_db)
):
    """Accounts Payable Dashboard"""
    try:
        if source == "backup":
            tally_service = TallyDataService(url="http://localhost:9000", db=db, user=current_user)
            tally_service.connected = False
        else:
            tally_service = TallyDataService(db=db, user=current_user)
        
        analytics_service = SpecializedAnalytics(tally_service)
        data = analytics_service.get_accounts_payable_analytics(company_name, use_cache=not refresh, source=source)
        
        return {"success": True, "data": data, "company": company_name, "source": source}
    except Exception as e:
        logger.error(f"Error in AP analytics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/profit-loss/{company_name}")
def get_pl_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live' or 'backup'"),
    current_user: Optional[User] = Depends(get_optional_user_dashboard),
    db: Session = Depends(get_db)
):
    """Profit & Loss Dashboard"""
    try:
        if source == "backup":
            tally_service = TallyDataService(url="http://localhost:9000", db=db, user=current_user)
            tally_service.connected = False
        else:
            tally_service = TallyDataService(db=db, user=current_user)
        
        analytics_service = SpecializedAnalytics(tally_service)
        data = analytics_service.get_profit_loss_analytics(company_name, use_cache=not refresh, source=source)
        
        return {"success": True, "data": data, "company": company_name, "source": source}
    except Exception as e:
        logger.error(f"Error in P&L analytics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/balance-sheet/{company_name}")
def get_balance_sheet_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live' or 'backup'"),
    current_user: Optional[User] = Depends(get_optional_user_dashboard),
    db: Session = Depends(get_db)
):
    """Balance Sheet Dashboard"""
    try:
        if source == "backup":
            tally_service = TallyDataService(url="http://localhost:9000", db=db, user=current_user)
            tally_service.connected = False
        else:
            tally_service = TallyDataService(db=db, user=current_user)
        
        analytics_service = SpecializedAnalytics(tally_service)
        data = analytics_service.get_balance_sheet_analytics(company_name, use_cache=not refresh, source=source)
        
        return {"success": True, "data": data, "company": company_name, "source": source}
    except Exception as e:
        logger.error(f"Error in Balance Sheet analytics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/realtime-operations/{company_name}")
def get_realtime_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live' or 'backup'"),
    current_user: Optional[User] = Depends(get_optional_user_dashboard),
    db: Session = Depends(get_db)
):
    """Real-time Operations Dashboard"""
    try:
        if source == "backup":
            tally_service = TallyDataService(url="http://localhost:9000", db=db, user=current_user)
            tally_service.connected = False
        else:
            tally_service = TallyDataService(db=db, user=current_user)
        
        analytics_service = SpecializedAnalytics(tally_service)
        data = analytics_service.get_realtime_operations_analytics(company_name, use_cache=not refresh, source=source)
        
        return {"success": True, "data": data, "company": company_name, "source": source}
    except Exception as e:
        logger.error(f"Error in Real-time Operations analytics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/executive-summary/{company_name}")
async def get_executive_summary_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live', 'backup', or 'bridge'"),
    bridge_token: Optional[str] = Query(None, description="Bridge token for bridge mode"),
    current_user: Optional[User] = Depends(get_optional_user_dashboard),
    db: Session = Depends(get_db)
):
    """Executive Summary Dashboard"""
    return await get_dashboard_with_fallback("Executive Summary", "get_executive_summary_analytics", company_name, source, refresh, db, current_user, bridge_token)


@router.get("/tax/{company_name}")
def get_tax_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live' or 'backup'"),
    current_user: Optional[User] = Depends(get_optional_user_dashboard),
    db: Session = Depends(get_db)
):
    """Tax & Compliance Dashboard"""
    try:
        if source == "backup":
            tally_service = TallyDataService(url="http://localhost:9000", db=db, user=current_user)
            tally_service.connected = False
        else:
            tally_service = TallyDataService(db=db, user=current_user)
        
        analytics_service = SpecializedAnalytics(tally_service)
        data = analytics_service.get_tax_analytics(company_name, use_cache=not refresh, source=source)
        
        return {"success": True, "data": data, "company": company_name, "source": source}
    except Exception as e:
        logger.error(f"Error in Tax analytics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/compliance/{company_name}")
def get_compliance_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live' or 'backup'"),
    current_user: Optional[User] = Depends(get_optional_user_dashboard),
    db: Session = Depends(get_db)
):
    """Regulatory Compliance Dashboard"""
    try:
        if source == "backup":
            tally_service = TallyDataService(url="http://localhost:9000", db=db, user=current_user)
            tally_service.connected = False
        else:
            tally_service = TallyDataService(db=db, user=current_user)
        
        analytics_service = SpecializedAnalytics(tally_service)
        data = analytics_service.get_compliance_analytics(company_name, use_cache=not refresh, source=source)
        
        return {"success": True, "data": data, "company": company_name, "source": source}
    except Exception as e:
        logger.error(f"Error in Compliance analytics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/budget-actual/{company_name}")
def get_budget_actual_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live' or 'backup'"),
    current_user: Optional[User] = Depends(get_optional_user_dashboard),
    db: Session = Depends(get_db)
):
    """Budget vs Actual Dashboard"""
    try:
        if source == "backup":
            tally_service = TallyDataService(url="http://localhost:9000", db=db, user=current_user)
            tally_service.connected = False
        else:
            tally_service = TallyDataService(db=db, user=current_user)
        
        analytics_service = SpecializedAnalytics(tally_service)
        data = analytics_service.get_budget_actual_analytics(company_name, use_cache=not refresh, source=source)
        
        return {"success": True, "data": data, "company": company_name, "source": source}
    except Exception as e:
        logger.error(f"Error in Budget vs Actual analytics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/forecasting/{company_name}")
def get_forecasting_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live' or 'backup'"),
    current_user: Optional[User] = Depends(get_optional_user_dashboard),
    db: Session = Depends(get_db)
):
    """Financial Forecasting Dashboard"""
    try:
        if source == "backup":
            tally_service = TallyDataService(url="http://localhost:9000", db=db, user=current_user)
            tally_service.connected = False
        else:
            tally_service = TallyDataService(db=db, user=current_user)
        
        analytics_service = SpecializedAnalytics(tally_service)
        data = analytics_service.get_forecasting_analytics(company_name, use_cache=not refresh, source=source)
        
        return {"success": True, "data": data, "company": company_name, "source": source}
    except Exception as e:
        logger.error(f"Error in Forecasting analytics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/customer-analytics/{company_name}")
def get_customer_analytics_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live' or 'backup'"),
    current_user: Optional[User] = Depends(get_optional_user_dashboard),
    db: Session = Depends(get_db)
):
    """Customer Analytics Dashboard"""
    try:
        if source == "backup":
            tally_service = TallyDataService(url="http://localhost:9000", db=db, user=current_user)
            tally_service.connected = False
        else:
            tally_service = TallyDataService(db=db, user=current_user)
        
        analytics_service = SpecializedAnalytics(tally_service)
        data = analytics_service.get_customer_analytics(company_name, use_cache=not refresh, source=source)
        
        return {"success": True, "data": data, "company": company_name, "source": source}
    except Exception as e:
        logger.error(f"Error in Customer Analytics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/vendor-analytics/{company_name}")
def get_vendor_analytics_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live' or 'backup'"),
    current_user: Optional[User] = Depends(get_optional_user_dashboard),
    db: Session = Depends(get_db)
):
    """Vendor Analytics Dashboard"""
    try:
        if source == "backup":
            tally_service = TallyDataService(url="http://localhost:9000", db=db, user=current_user)
            tally_service.connected = False
        else:
            tally_service = TallyDataService(db=db, user=current_user)
        
        analytics_service = SpecializedAnalytics(tally_service)
        data = analytics_service.get_vendor_analytics(company_name, use_cache=not refresh, source=source)
        
        return {"success": True, "data": data, "company": company_name, "source": source}
    except Exception as e:
        logger.error(f"Error in Vendor Analytics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/product-performance/{company_name}")
def get_product_performance_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live' or 'backup'"),
    current_user: Optional[User] = Depends(get_optional_user_dashboard),
    db: Session = Depends(get_db)
):
    """Product Performance Dashboard"""
    try:
        if source == "backup":
            tally_service = TallyDataService(url="http://localhost:9000", db=db, user=current_user)
            tally_service.connected = False
        else:
            tally_service = TallyDataService(db=db, user=current_user)
        
        analytics_service = SpecializedAnalytics(tally_service)
        data = analytics_service.get_product_performance_analytics(company_name, use_cache=not refresh, source=source)
        
        return {"success": True, "data": data, "company": company_name, "source": source}
    except Exception as e:
        logger.error(f"Error in Product Performance analytics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/expense-analysis/{company_name}")
def get_expense_analysis_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live' or 'backup'"),
    current_user: Optional[User] = Depends(get_optional_user_dashboard),
    db: Session = Depends(get_db)
):
    """Expense Analysis Dashboard"""
    try:
        if source == "backup":
            tally_service = TallyDataService(url="http://localhost:9000", db=db, user=current_user)
            tally_service.connected = False
        else:
            tally_service = TallyDataService(db=db, user=current_user)
        
        analytics_service = SpecializedAnalytics(tally_service)
        data = analytics_service.get_expense_analysis_analytics(company_name, use_cache=not refresh, source=source)
        
        return {"success": True, "data": data, "company": company_name, "source": source}
    except Exception as e:
        logger.error(f"Error in Expense Analysis: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/revenue-analysis/{company_name}")
def get_revenue_analysis_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live' or 'backup'"),
    current_user: Optional[User] = Depends(get_optional_user_dashboard),
    db: Session = Depends(get_db)
):
    """Revenue Analysis Dashboard"""
    try:
        if source == "backup":
            tally_service = TallyDataService(url="http://localhost:9000", db=db, user=current_user)
            tally_service.connected = False
        else:
            tally_service = TallyDataService(db=db, user=current_user)
        
        analytics_service = SpecializedAnalytics(tally_service)
        data = analytics_service.get_revenue_analysis_analytics(company_name, use_cache=not refresh, source=source)
        
        return {"success": True, "data": data, "company": company_name, "source": source}
    except Exception as e:
        logger.error(f"Error in Revenue Analysis: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
