"""
🚀 ADVANCED ANALYTICS ROUTES - Multi-company, Real-time, Export
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from app.models.database import get_db, User
from app.routes.auth_routes import get_current_user
from app.services.tally_service import TallyDataService
from app.services.analytics_service import AnalyticsService
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/company/{company_name}")
async def get_company_analytics(
    company_name: str,
    refresh: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive analytics for a specific company
    
    Args:
        company_name: Name of the company
        refresh: Force refresh (bypass cache)
    """
    try:
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
        
        return {
            "success": True,
            "data": analytics,
            "refreshed": refresh
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
    current_user: User = Depends(get_current_user)
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
    current_user: User = Depends(get_current_user)
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
    current_user: User = Depends(get_current_user)
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
    current_user: User = Depends(get_current_user)
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
