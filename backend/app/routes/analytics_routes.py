"""
🚀 ADVANCED ANALYTICS ROUTES - Multi-company, Real-time, Export
"""

from fastapi import APIRouter, Depends, HTTPException, Header, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from app.models.database import get_db, User
from app.routes.auth_routes import get_current_user
from app.services.tally_service import TallyDataService
from app.services.analytics_service import AnalyticsService
import logging
import os

router = APIRouter()
logger = logging.getLogger(__name__)


# Helper function to get optional user (for anonymous analytics access)
async def get_optional_user_analytics(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Get user if authenticated, otherwise return None"""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        from jose import JWTError, jwt
        
        SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
        ALGORITHM = "HS256"
        
        token = authorization.replace("Bearer ", "").strip()
        
        # Check if it's a demo token (not a real JWT)
        if token.startswith("demo-token-"):
            return None
            
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
        
        user = db.query(User).filter(User.email == email).first()
        return user
    except Exception as e:
        logger.debug(f"Optional user authentication failed: {e}")
        return None

@router.get("/company/{company_name}")
async def get_company_analytics(
    company_name: str,
    refresh: bool = False,
    source: str = Query("live", description="Data source: 'live' or 'backup'"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user_analytics)
):
    """
    Get comprehensive analytics for a specific company
    
    Args:
        company_name: Name of the company
        refresh: Force refresh (bypass cache)
        source: Data source - 'live' for Tally or 'backup' for uploaded file
    """
    try:
        logger.info(f"📊 Analytics request for {company_name} (source={source}, refresh={refresh})")
        
        # For backup source, try to get data from cache first
        if source == "backup":
            from app.models.database import TallyCache
            import json
            
            # Search for backup data
            cache_entry = db.query(TallyCache).filter(
                TallyCache.source == "backup"
            ).all()
            
            for entry in cache_entry:
                try:
                    data = json.loads(entry.cache_data) if isinstance(entry.cache_data, str) else entry.cache_data
                    if data.get("company", {}).get("name") == company_name:
                        logger.info(f"Found backup data for {company_name}")
                        # Create analytics from backup data
                        summary = data.get("summary", {})
                        ledgers = data.get("ledgers", [])
                        
                        # Calculate Revenue and Expense from ledgers if summary shows 0
                        total_revenue = summary.get("total_revenue", 0)
                        total_expense = summary.get("total_expense", 0)
                        
                        # Calculate from ledgers - more comprehensive matching
                        revenue_parents = ['sales accounts', 'sales', 'income', 'revenue', 'other income', 
                                          'direct income', 'indirect income']
                        expense_parents = ['direct expenses', 'indirect expenses', 'purchase accounts', 
                                          'purchases', 'expenses', 'administrative expenses', 
                                          'selling expenses', 'manufacturing expenses']
                        
                        # Revenue calculation
                        revenue_ledgers = [l for l in ledgers if 
                            any(rp in l.get('parent', '').lower() for rp in revenue_parents) or
                            l.get('is_revenue', False)]
                        calculated_revenue = sum(abs(l.get('closing_balance', 0)) for l in revenue_ledgers)
                        if calculated_revenue > 0:
                            total_revenue = calculated_revenue
                        logger.info(f"Revenue: {len(revenue_ledgers)} ledgers = {total_revenue}")
                        
                        # Expense calculation
                        expense_ledgers = [l for l in ledgers if 
                            any(ep in l.get('parent', '').lower() for ep in expense_parents) or
                            l.get('is_expense', False)]
                        calculated_expense = sum(abs(l.get('closing_balance', 0)) for l in expense_ledgers)
                        if calculated_expense > 0:
                            total_expense = calculated_expense
                        logger.info(f"Expense: {len(expense_ledgers)} ledgers = {total_expense}")
                        
                        # If still 0, this backup only has balance sheet data
                        # Calculate debtors and creditors for display
                        debtor_ledgers = [l for l in ledgers if 'sundry debtors' in l.get('parent', '').lower()]
                        creditor_ledgers = [l for l in ledgers if 'sundry creditors' in l.get('parent', '').lower()]
                        total_debtors = sum(abs(l.get('closing_balance', 0)) for l in debtor_ledgers)
                        total_creditors = sum(abs(l.get('closing_balance', 0)) for l in creditor_ledgers)
                        
                        net_profit = total_revenue - total_expense
                        total_assets = summary.get("total_assets", 0)
                        total_liabilities = summary.get("total_liabilities", 0)
                        total_equity = total_assets - total_liabilities
                        
                        # Calculate ratios
                        profit_margin = (net_profit / max(total_revenue, 1)) * 100 if total_revenue > 0 else 0
                        expense_ratio = (total_expense / max(total_revenue, 1)) * 100 if total_revenue > 0 else 0
                        roa = (net_profit / max(total_assets, 1)) * 100 if total_assets > 0 else 0
                        roe = (net_profit / max(total_equity, 1)) * 100 if total_equity > 0 else 0
                        debt_to_equity = total_liabilities / max(total_equity, 1) if total_equity > 0 else 0
                        equity_ratio = (total_equity / max(total_assets, 1)) * 100 if total_assets > 0 else 0
                        
                        # Health score calculation
                        health_score = 50  # Base score
                        if net_profit > 0:
                            health_score += 20
                        if profit_margin > 10:
                            health_score += 15
                        if debt_to_equity < 1:
                            health_score += 15
                        health_score = min(health_score, 100)
                        
                        health_status = "Excellent" if health_score >= 80 else "Good" if health_score >= 60 else "Needs Attention"
                        
                        # Top revenue sources (or top debtors if no revenue)
                        top_revenue = [
                            {"name": l.get("name"), "amount": abs(l.get("closing_balance", 0))}
                            for l in sorted(revenue_ledgers, key=lambda x: abs(x.get("closing_balance", 0)), reverse=True)[:5]
                            if abs(l.get("closing_balance", 0)) > 0
                        ]
                        # If no revenue ledgers with balance, show top debtors as "Revenue Sources"
                        if not top_revenue and debtor_ledgers:
                            top_revenue = [
                                {"name": l.get("name") + " (Debtor)", "amount": abs(l.get("closing_balance", 0))}
                                for l in sorted(debtor_ledgers, key=lambda x: abs(x.get("closing_balance", 0)), reverse=True)[:5]
                                if abs(l.get("closing_balance", 0)) > 0
                            ]
                        
                        # Top expense categories (or top creditors if no expenses)
                        top_expense = [
                            {"name": l.get("name"), "amount": abs(l.get("closing_balance", 0))}
                            for l in sorted(expense_ledgers, key=lambda x: abs(x.get("closing_balance", 0)), reverse=True)[:5]
                            if abs(l.get("closing_balance", 0)) > 0
                        ]
                        # If no expense ledgers with balance, show top creditors as "Expense Categories"
                        if not top_expense and creditor_ledgers:
                            top_expense = [
                                {"name": l.get("name") + " (Creditor)", "amount": abs(l.get("closing_balance", 0))}
                                for l in sorted(creditor_ledgers, key=lambda x: abs(x.get("closing_balance", 0)), reverse=True)[:5]
                                if abs(l.get("closing_balance", 0)) > 0
                            ]
                        
                        # Alerts for missing data
                        alerts = []
                        if total_revenue == 0:
                            alerts.append("No P&L revenue data in this backup. Showing balance sheet data only.")
                        if total_expense == 0:
                            alerts.append("No P&L expense data in this backup. Showing creditors as reference.")
                        
                        analytics = {
                            "company_name": company_name,
                            "total_revenue": total_revenue if total_revenue > 0 else total_debtors,  # Show debtors if no revenue
                            "total_expense": total_expense if total_expense > 0 else total_creditors,  # Show creditors if no expense
                            "net_profit": net_profit if total_revenue > 0 else (total_debtors - total_creditors),
                            "total_assets": total_assets,
                            "total_liabilities": total_liabilities,
                            "total_equity": total_equity,
                            "total_debtors": total_debtors,
                            "total_creditors": total_creditors,
                            "ledger_count": len(ledgers),
                            "profit_margin": profit_margin,
                            "expense_ratio": expense_ratio,
                            "return_on_assets": roa,
                            "return_on_equity": roe,
                            "debt_to_equity_ratio": debt_to_equity,
                            "equity_ratio": equity_ratio,
                            "health_score": health_score,
                            "health_status": health_status,
                            "alerts": alerts,
                            "top_revenue_ledgers": top_revenue,
                            "top_expense_ledgers": top_expense,
                            "revenue_breakdown": {},
                            "source": "backup",
                            "data_note": "Balance Sheet data only" if total_revenue == 0 else "Full financial data"
                        }
                        
                        return {
                            "success": True,
                            "data": analytics,
                            "refreshed": refresh,
                            "source": "backup"
                        }
                except Exception as e:
                    logger.warning(f"Error parsing backup entry: {e}")
                    continue
        
        # For live source or if backup not found
        tally_service = TallyDataService(db=db, user=current_user)
        analytics_service = AnalyticsService(tally_service)
        
        # Get analytics with refresh option
        analytics = analytics_service.get_company_analytics(
            company_name, 
            use_cache=not refresh
        )
        
        if not analytics or analytics.get('ledger_count', 0) == 0:
            return {
                "success": False,
                "message": "No analytics data available. Please ensure Tally is connected and company is open.",
                "data": analytics or {}
            }
        
        analytics["source"] = "live"
        return {
            "success": True,
            "data": analytics,
            "refreshed": refresh,
            "source": "live"
        }
        
    except Exception as e:
        logger.error(f"Error getting analytics for {company_name}: {e}", exc_info=True)
        return {
            "success": False,
            "message": str(e),
            "data": {}
        }

@router.get("/multi-company")
async def get_multi_company_analytics(
    refresh: bool = False,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user_analytics)
):
    """
    Get analytics for ALL companies
    
    Args:
        refresh: Force refresh (bypass cache)
    
    Returns:
        List of analytics for each company
    """
    try:
        tally_service = TallyDataService(db=db, user=current_user)
        analytics_service = AnalyticsService(tally_service)
        
        # Get multi-company analytics
        analytics_list = analytics_service.get_multi_company_analytics(use_cache=not refresh)
        
        return {
            "success": True,
            "count": len(analytics_list),
            "data": analytics_list,
            "refreshed": refresh
        }
        
    except Exception as e:
        logger.error(f"Error getting multi-company analytics: {e}", exc_info=True)
        return {
            "success": False,
            "message": str(e),
            "data": []
        }

@router.post("/compare")
async def compare_companies(
    company_names: List[str],
    refresh: bool = False,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user_analytics)
):
    """
    Compare multiple companies side-by-side
    
    Args:
        company_names: List of company names to compare
        refresh: Force refresh (bypass cache)
    """
    try:
        tally_service = TallyDataService(db=db, user=current_user)
        analytics_service = AnalyticsService(tally_service)
        
        # Get comparison data
        comparison = analytics_service.compare_companies(company_names, use_cache=not refresh)
        
        return {
            "success": True,
            "data": comparison,
            "refreshed": refresh
        }
        
    except Exception as e:
        logger.error(f"Error comparing companies: {e}", exc_info=True)
        return {
            "success": False,
            "message": str(e),
            "data": {}
        }

@router.post("/refresh/{company_name}")
async def refresh_company_analytics(
    company_name: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user_analytics)
):
    """
    Force refresh analytics for a company
    
    This will bypass cache and fetch fresh data from Tally
    """
    try:
        tally_service = TallyDataService(db=db, user=current_user)
        analytics_service = AnalyticsService(tally_service)
        
        # Force refresh
        analytics = analytics_service.get_company_analytics(company_name, use_cache=False)
        
        return {
            "success": True,
            "message": f"Analytics refreshed for {company_name}",
            "data": analytics,
            "timestamp": analytics.get('last_updated')
        }
        
    except Exception as e:
        logger.error(f"Error refreshing analytics for {company_name}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/summary")
async def get_analytics_summary(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user_analytics)
):
    """
    Get quick summary of all companies
    """
    try:
        tally_service = TallyDataService(db=db, user=current_user)
        analytics_service = AnalyticsService(tally_service)
        
        # Get all companies
        companies = tally_service.get_companies()
        
        summary = {
            "total_companies": len(companies),
            "companies": []
        }
        
        for company in companies:
            company_name = company.get('name')
            if company_name:
                analytics = analytics_service.get_company_analytics(company_name, use_cache=True)
                summary["companies"].append({
                    "name": company_name,
                    "revenue": analytics.get('total_revenue', 0),
                    "profit": analytics.get('net_profit', 0),
                    "health_score": analytics.get('health_score', 0),
                    "health_status": analytics.get('health_status', 'Unknown')
                })
        
        return {
            "success": True,
            "data": summary
        }
        
    except Exception as e:
        logger.error(f"Error getting analytics summary: {e}", exc_info=True)
        return {
            "success": False,
            "message": str(e),
            "data": {}
        }
