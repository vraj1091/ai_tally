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

logger = logging.getLogger(__name__)
router = APIRouter()

# Import bridge services for bridge mode
try:
    from app.routes.ws_bridge_routes import bridge_manager
    from app.services.bridge_tally_service import BridgeTallyService, BridgeSpecializedAnalytics
    BRIDGE_AVAILABLE = True
    logger.info("✓ Bridge services available")
except ImportError as e:
    BRIDGE_AVAILABLE = False
    bridge_manager = None
    BridgeTallyService = None
    BridgeSpecializedAnalytics = None
    logger.warning(f"Bridge services not available: {e}")


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
    """
    Unified dashboard data fetcher that supports:
    - live: Direct connection to local Tally
    - backup: Data from uploaded backup files
    - bridge: Cloud-to-local via WebSocket bridge
    """
    actual_source = source
    fallback_used = False
    
    try:
        # ============ BRIDGE MODE ============
        # Fetch data via WebSocket bridge and use SAME SpecializedAnalytics as backup mode
        if source == "bridge" and bridge_token:
            logger.info(f"📡 {dashboard_type} Dashboard - Using BRIDGE for {company_name}")
            
            if not BRIDGE_AVAILABLE or not bridge_manager:
                logger.warning("Bridge service not available, falling back to backup")
                actual_source = "backup"
                fallback_used = True
            elif not bridge_manager.is_connected(bridge_token):
                logger.warning("Bridge not connected, falling back to backup")
                actual_source = "backup"
                fallback_used = True
            else:
                # Use Bridge to fetch raw data, then use SAME SpecializedAnalytics as backup
                try:
                    bridge_service = BridgeTallyService(bridge_manager, bridge_token)
                    
                    # Fetch raw data via bridge (same format as backup)
                    bridge_data = await bridge_service.get_all_company_data(company_name)
                    
                    if bridge_data and bridge_data.get('ledgers'):
                        logger.info(f"✅ Bridge fetched {len(bridge_data.get('ledgers', []))} ledgers for {company_name}")
                        
                        # Create a TallyDataService wrapper with bridge data
                        tally_service = TallyDataService(url="http://localhost:9000", db=db, user=current_user)
                        tally_service.connected = False  # Don't try to connect to Tally
                        
                        # Inject bridge data into the cache so SpecializedAnalytics can use it
                        tally_service._bridge_data_cache = {company_name: bridge_data}
                        
                        # Override get_all_company_data to return bridge data
                        original_get_all = tally_service.get_all_company_data
                        def get_all_with_bridge(comp_name, **kwargs):
                            if comp_name == company_name and hasattr(tally_service, '_bridge_data_cache'):
                                cached = tally_service._bridge_data_cache.get(comp_name)
                                if cached:
                                    logger.info(f"Using bridge-cached data for {comp_name}")
                                    return cached
                            return original_get_all(comp_name, **kwargs)
                        tally_service.get_all_company_data = get_all_with_bridge
                        
                        # Use the SAME SpecializedAnalytics as backup mode
                        analytics_service = SpecializedAnalytics(tally_service)
                        method = getattr(analytics_service, analytics_method)
                        data = method(company_name, use_cache=True, source="backup")  # Use backup path which reads from cache
                        
                        if data:
                            logger.info(f"✅ Bridge analytics completed for {company_name}")
                            return {
                                "success": True,
                                "data": data,
                                "company": company_name,
                                "source": "bridge",
                                "fallback_used": False
                            }
                        else:
                            logger.warning("Bridge analytics returned empty, falling back to backup")
                            actual_source = "backup"
                            fallback_used = True
                    else:
                        logger.warning("Bridge returned no ledgers, falling back to backup")
                        actual_source = "backup"
                        fallback_used = True
                        
                except Exception as e:
                    logger.error(f"Bridge error: {e}, falling back to backup")
                    import traceback
                    traceback.print_exc()
                    actual_source = "backup"
                    fallback_used = True
        
        # ============ BACKUP MODE ============
        if actual_source == "backup":
            logger.info(f"📁 {dashboard_type} Dashboard - Using BACKUP for {company_name}")
            tally_service = TallyDataService(url="http://localhost:9000", db=db, user=current_user)
            tally_service.connected = False  # Force backup mode
            
            analytics_service = SpecializedAnalytics(tally_service)
            method = getattr(analytics_service, analytics_method)
            data = method(company_name, use_cache=not refresh, source="backup")
            
            return {
                "success": True,
                "data": data,
                "company": company_name,
                "source": "backup",
                "fallback_used": fallback_used
            }
        
        # ============ LIVE MODE ============
        logger.info(f"🔴 {dashboard_type} Dashboard - Using LIVE for {company_name}")
        tally_service = TallyDataService(db=db, user=current_user)
        
        # Check if Tally is actually connected
        if not tally_service.connected:
            logger.warning(f"{dashboard_type} Dashboard - Tally not connected, trying backup...")
            actual_source = "backup"
            fallback_used = True
            tally_service.connected = False
        
        analytics_service = SpecializedAnalytics(tally_service)
        method = getattr(analytics_service, analytics_method)
        data = method(company_name, use_cache=not refresh, source=actual_source)
        
        # If live returned empty data, auto-fallback to backup
        if source == "live" and not fallback_used:
            is_empty = (
                not data or 
                (isinstance(data, dict) and data.get('revenue', data.get('total_revenue', 0)) == 0)
            )
            if is_empty:
                logger.warning(f"{dashboard_type} Dashboard - Live data empty, trying backup...")
                tally_service_backup = TallyDataService(url="http://localhost:9000", db=db, user=current_user)
                tally_service_backup.connected = False
                analytics_backup = SpecializedAnalytics(tally_service_backup)
                backup_data = getattr(analytics_backup, analytics_method)(company_name, use_cache=True, source="backup")
                if backup_data and isinstance(backup_data, dict):
                    backup_revenue = backup_data.get('revenue', backup_data.get('total_revenue', 0))
                    if backup_revenue > 0:
                        data = backup_data
                        actual_source = "backup"
                        fallback_used = True
                        logger.info(f"✅ {dashboard_type} Dashboard - Using backup data (auto-fallback)")
        
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
async def get_sales_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live', 'backup', or 'bridge'"),
    bridge_token: Optional[str] = Query(None, description="Bridge token for bridge mode"),
    current_user: Optional[User] = Depends(get_optional_user_dashboard),
    db: Session = Depends(get_db)
):
    """Sales Dashboard - Sales Performance"""
    return await get_dashboard_with_fallback("Sales", "get_sales_analytics", company_name, source, refresh, db, current_user, bridge_token)


@router.get("/cashflow/{company_name}")
async def get_cashflow_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live', 'backup', or 'bridge'"),
    bridge_token: Optional[str] = Query(None, description="Bridge token for bridge mode"),
    current_user: Optional[User] = Depends(get_optional_user_dashboard),
    db: Session = Depends(get_db)
):
    """Cash Flow Dashboard"""
    return await get_dashboard_with_fallback("CashFlow", "get_cashflow_analytics", company_name, source, refresh, db, current_user, bridge_token)


@router.get("/inventory/{company_name}")
async def get_inventory_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live', 'backup', or 'bridge'"),
    bridge_token: Optional[str] = Query(None, description="Bridge token for bridge mode"),
    current_user: Optional[User] = Depends(get_optional_user_dashboard),
    db: Session = Depends(get_db)
):
    """Inventory Dashboard"""
    return await get_dashboard_with_fallback("Inventory", "get_inventory_analytics", company_name, source, refresh, db, current_user, bridge_token)


@router.get("/accounts-receivable/{company_name}")
async def get_ar_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live', 'backup', or 'bridge'"),
    bridge_token: Optional[str] = Query(None, description="Bridge token for bridge mode"),
    current_user: Optional[User] = Depends(get_optional_user_dashboard),
    db: Session = Depends(get_db)
):
    """Accounts Receivable Dashboard"""
    return await get_dashboard_with_fallback("AR", "get_accounts_receivable_analytics", company_name, source, refresh, db, current_user, bridge_token)


@router.get("/accounts-payable/{company_name}")
async def get_ap_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live', 'backup', or 'bridge'"),
    bridge_token: Optional[str] = Query(None, description="Bridge token for bridge mode"),
    current_user: Optional[User] = Depends(get_optional_user_dashboard),
    db: Session = Depends(get_db)
):
    """Accounts Payable Dashboard"""
    return await get_dashboard_with_fallback("AP", "get_accounts_payable_analytics", company_name, source, refresh, db, current_user, bridge_token)


@router.get("/profit-loss/{company_name}")
async def get_pl_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live', 'backup', or 'bridge'"),
    bridge_token: Optional[str] = Query(None, description="Bridge token for bridge mode"),
    current_user: Optional[User] = Depends(get_optional_user_dashboard),
    db: Session = Depends(get_db)
):
    """Profit & Loss Dashboard"""
    return await get_dashboard_with_fallback("ProfitLoss", "get_profit_loss_analytics", company_name, source, refresh, db, current_user, bridge_token)


@router.get("/balance-sheet/{company_name}")
async def get_balance_sheet_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live', 'backup', or 'bridge'"),
    bridge_token: Optional[str] = Query(None, description="Bridge token for bridge mode"),
    current_user: Optional[User] = Depends(get_optional_user_dashboard),
    db: Session = Depends(get_db)
):
    """Balance Sheet Dashboard"""
    return await get_dashboard_with_fallback("BalanceSheet", "get_balance_sheet_analytics", company_name, source, refresh, db, current_user, bridge_token)


@router.get("/realtime-operations/{company_name}")
async def get_realtime_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live', 'backup', or 'bridge'"),
    bridge_token: Optional[str] = Query(None, description="Bridge token for bridge mode"),
    current_user: Optional[User] = Depends(get_optional_user_dashboard),
    db: Session = Depends(get_db)
):
    """Real-time Operations Dashboard"""
    return await get_dashboard_with_fallback("Realtime", "get_realtime_operations_analytics", company_name, source, refresh, db, current_user, bridge_token)


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
async def get_tax_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live', 'backup', or 'bridge'"),
    bridge_token: Optional[str] = Query(None, description="Bridge token for bridge mode"),
    current_user: Optional[User] = Depends(get_optional_user_dashboard),
    db: Session = Depends(get_db)
):
    """Tax & Compliance Dashboard"""
    return await get_dashboard_with_fallback("Tax", "get_tax_analytics", company_name, source, refresh, db, current_user, bridge_token)


@router.get("/compliance/{company_name}")
async def get_compliance_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live', 'backup', or 'bridge'"),
    bridge_token: Optional[str] = Query(None, description="Bridge token for bridge mode"),
    current_user: Optional[User] = Depends(get_optional_user_dashboard),
    db: Session = Depends(get_db)
):
    """Regulatory Compliance Dashboard"""
    return await get_dashboard_with_fallback("Compliance", "get_compliance_analytics", company_name, source, refresh, db, current_user, bridge_token)


@router.get("/budget-actual/{company_name}")
async def get_budget_actual_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live', 'backup', or 'bridge'"),
    bridge_token: Optional[str] = Query(None, description="Bridge token for bridge mode"),
    current_user: Optional[User] = Depends(get_optional_user_dashboard),
    db: Session = Depends(get_db)
):
    """Budget vs Actual Dashboard"""
    return await get_dashboard_with_fallback("BudgetActual", "get_budget_actual_analytics", company_name, source, refresh, db, current_user, bridge_token)


@router.get("/forecasting/{company_name}")
async def get_forecasting_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live', 'backup', or 'bridge'"),
    bridge_token: Optional[str] = Query(None, description="Bridge token for bridge mode"),
    current_user: Optional[User] = Depends(get_optional_user_dashboard),
    db: Session = Depends(get_db)
):
    """Financial Forecasting Dashboard"""
    return await get_dashboard_with_fallback("Forecasting", "get_forecasting_analytics", company_name, source, refresh, db, current_user, bridge_token)


@router.get("/customer-analytics/{company_name}")
async def get_customer_analytics_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live', 'backup', or 'bridge'"),
    bridge_token: Optional[str] = Query(None, description="Bridge token for bridge mode"),
    current_user: Optional[User] = Depends(get_optional_user_dashboard),
    db: Session = Depends(get_db)
):
    """Customer Analytics Dashboard"""
    return await get_dashboard_with_fallback("Customer", "get_customer_analytics", company_name, source, refresh, db, current_user, bridge_token)


@router.get("/vendor-analytics/{company_name}")
async def get_vendor_analytics_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live', 'backup', or 'bridge'"),
    bridge_token: Optional[str] = Query(None, description="Bridge token for bridge mode"),
    current_user: Optional[User] = Depends(get_optional_user_dashboard),
    db: Session = Depends(get_db)
):
    """Vendor Analytics Dashboard"""
    return await get_dashboard_with_fallback("Vendor", "get_vendor_analytics", company_name, source, refresh, db, current_user, bridge_token)


@router.get("/product-performance/{company_name}")
async def get_product_performance_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live', 'backup', or 'bridge'"),
    bridge_token: Optional[str] = Query(None, description="Bridge token for bridge mode"),
    current_user: Optional[User] = Depends(get_optional_user_dashboard),
    db: Session = Depends(get_db)
):
    """Product Performance Dashboard"""
    return await get_dashboard_with_fallback("ProductPerformance", "get_product_performance_analytics", company_name, source, refresh, db, current_user, bridge_token)


@router.get("/expense-analysis/{company_name}")
async def get_expense_analysis_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live', 'backup', or 'bridge'"),
    bridge_token: Optional[str] = Query(None, description="Bridge token for bridge mode"),
    current_user: Optional[User] = Depends(get_optional_user_dashboard),
    db: Session = Depends(get_db)
):
    """Expense Analysis Dashboard"""
    return await get_dashboard_with_fallback("ExpenseAnalysis", "get_expense_analysis_analytics", company_name, source, refresh, db, current_user, bridge_token)


@router.get("/revenue-analysis/{company_name}")
async def get_revenue_analysis_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live', 'backup', or 'bridge'"),
    bridge_token: Optional[str] = Query(None, description="Bridge token for bridge mode"),
    current_user: Optional[User] = Depends(get_optional_user_dashboard),
    db: Session = Depends(get_db)
):
    """Revenue Analysis Dashboard"""
    return await get_dashboard_with_fallback("RevenueAnalysis", "get_revenue_analysis_analytics", company_name, source, refresh, db, current_user, bridge_token)
