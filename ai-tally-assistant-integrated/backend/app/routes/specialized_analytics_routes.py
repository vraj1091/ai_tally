"""
🎯 SPECIALIZED ANALYTICS ROUTES
Each dashboard type gets unique data endpoints
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from app.models.database import get_db, User
from app.routes.auth_routes import get_current_user
from app.services.tally_service import TallyDataService
from app.services.specialized_analytics import SpecializedAnalytics
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/ceo/{company_name}")
async def get_ceo_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live' or 'backup'"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """CEO Dashboard - Executive Overview"""
    try:
        # When source is 'backup', skip Tally connection initialization
        # This prevents unnecessary connection attempts when using backup data
        if source == "backup":
            logger.info(f"CEO Dashboard - Using backup data for {company_name}, skipping Tally connection check")
            # Create service without connecting (pass a dummy URL that won't be used)
            tally_service = TallyDataService(url="http://localhost:9000", db=db, user=current_user)
            # Mark as not connected to prevent connection attempts
            tally_service.connected = False
        else:
            tally_service = TallyDataService(db=db, user=current_user)
        
        analytics_service = SpecializedAnalytics(tally_service)
        
        # If refresh is True, use_cache should be False
        # Pass source to analytics service
        data = analytics_service.get_ceo_analytics(company_name, use_cache=not refresh, source=source)
        
        return {
            "success": True,
            "data": data,
            "company": company_name,
            "source": source
        }
    except Exception as e:
        logger.error(f"Error in CEO analytics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/cfo/{company_name}")
async def get_cfo_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live' or 'backup'"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """CFO Dashboard - Financial Health"""
    try:
        if source == "backup":
            logger.info(f"CFO Dashboard - Using backup data for {company_name}, skipping Tally connection check")
            tally_service = TallyDataService(url="http://localhost:9000", db=db, user=current_user)
            tally_service.connected = False
        else:
            tally_service = TallyDataService(db=db, user=current_user)
        
        analytics_service = SpecializedAnalytics(tally_service)
        
        data = analytics_service.get_cfo_analytics(company_name, use_cache=not refresh, source=source)
        
        return {
            "success": True,
            "data": data,
            "company": company_name,
            "source": source
        }
    except Exception as e:
        logger.error(f"Error in CFO analytics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sales/{company_name}")
async def get_sales_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live' or 'backup'"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Sales Dashboard - Sales Performance"""
    try:
        if source == "backup":
            logger.info(f"Sales Dashboard - Using backup data for {company_name}, skipping Tally connection check")
            tally_service = TallyDataService(url="http://localhost:9000", db=db, user=current_user)
            tally_service.connected = False
        else:
            tally_service = TallyDataService(db=db, user=current_user)
        
        analytics_service = SpecializedAnalytics(tally_service)
        
        data = analytics_service.get_sales_analytics(company_name, use_cache=not refresh, source=source)
        
        return {
            "success": True,
            "data": data,
            "company": company_name,
            "source": source
        }
    except Exception as e:
        logger.error(f"Error in Sales analytics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/cashflow/{company_name}")
async def get_cashflow_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live' or 'backup'"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cash Flow Dashboard - Cash Management"""
    try:
        if source == "backup":
            logger.info(f"Cash Flow Dashboard - Using backup data for {company_name}, skipping Tally connection check")
            tally_service = TallyDataService(url="http://localhost:9000", db=db, user=current_user)
            tally_service.connected = False
        else:
            tally_service = TallyDataService(db=db, user=current_user)
        
        analytics_service = SpecializedAnalytics(tally_service)
        
        data = analytics_service.get_cashflow_analytics(company_name, use_cache=not refresh, source=source)
        
        return {
            "success": True,
            "data": data,
            "company": company_name,
            "source": source
        }
    except Exception as e:
        logger.error(f"Error in Cash Flow analytics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/inventory/{company_name}")
async def get_inventory_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live' or 'backup'"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Inventory Dashboard - Stock Management"""
    try:
        if source == "backup":
            logger.info(f"Inventory Dashboard - Using backup data for {company_name}, skipping Tally connection check")
            tally_service = TallyDataService(url="http://localhost:9000", db=db, user=current_user)
            tally_service.connected = False
        else:
            tally_service = TallyDataService(db=db, user=current_user)
        
        analytics_service = SpecializedAnalytics(tally_service)
        
        data = analytics_service.get_inventory_analytics(company_name, use_cache=not refresh, source=source)
        
        return {
            "success": True,
            "data": data,
            "company": company_name,
            "source": source
        }
    except Exception as e:
        logger.error(f"Error in Inventory analytics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/profit-loss/{company_name}")
async def get_profit_loss_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live' or 'backup'"),
    current_user: User = Depends(get_current_user),
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
        logger.error(f"Error in Profit & Loss analytics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/balance-sheet/{company_name}")
async def get_balance_sheet_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live' or 'backup'"),
    current_user: User = Depends(get_current_user),
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

@router.get("/tax/{company_name}")
async def get_tax_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live' or 'backup'"),
    current_user: User = Depends(get_current_user),
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
async def get_compliance_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live' or 'backup'"),
    current_user: User = Depends(get_current_user),
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
async def get_budget_actual_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live' or 'backup'"),
    current_user: User = Depends(get_current_user),
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
async def get_forecasting_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live' or 'backup'"),
    current_user: User = Depends(get_current_user),
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
async def get_customer_analytics_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live' or 'backup'"),
    current_user: User = Depends(get_current_user),
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
async def get_vendor_analytics_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live' or 'backup'"),
    current_user: User = Depends(get_current_user),
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
async def get_product_performance_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live' or 'backup'"),
    current_user: User = Depends(get_current_user),
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
async def get_expense_analysis_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live' or 'backup'"),
    current_user: User = Depends(get_current_user),
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
async def get_revenue_analysis_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live' or 'backup'"),
    current_user: User = Depends(get_current_user),
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

@router.get("/executive-summary/{company_name}")
async def get_executive_summary_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live' or 'backup'"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Executive Summary Dashboard"""
    try:
        if source == "backup":
            tally_service = TallyDataService(url="http://localhost:9000", db=db, user=current_user)
            tally_service.connected = False
        else:
            tally_service = TallyDataService(db=db, user=current_user)
        analytics_service = SpecializedAnalytics(tally_service)
        data = analytics_service.get_executive_summary_analytics(company_name, use_cache=not refresh, source=source)
        return {"success": True, "data": data, "company": company_name, "source": source}
    except Exception as e:
        logger.error(f"Error in Executive Summary: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/realtime-operations/{company_name}")
async def get_realtime_operations_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live' or 'backup'"),
    current_user: User = Depends(get_current_user),
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
        logger.error(f"Error in Real-time Operations: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/accounts-receivable/{company_name}")
async def get_accounts_receivable_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live' or 'backup'"),
    current_user: User = Depends(get_current_user),
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
        logger.error(f"Error in Accounts Receivable: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/accounts-payable/{company_name}")
async def get_accounts_payable_dashboard_data(
    company_name: str,
    refresh: bool = Query(False, description="Force refresh from Tally"),
    source: str = Query("live", description="Data source: 'live' or 'backup'"),
    current_user: User = Depends(get_current_user),
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
        logger.error(f"Error in Accounts Payable: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
