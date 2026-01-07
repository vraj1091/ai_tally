"""
🚀 ADVANCED ANALYTICS SERVICE - Better than Tallygence!
Real-time financial analytics, insights, and predictions
"""

from typing import Dict, List, Optional
import logging
from datetime import datetime, timedelta
from collections import defaultdict

logger = logging.getLogger(__name__)

class AnalyticsService:
    """Advanced Service for comprehensive financial analytics"""
    
    def __init__(self, tally_service):
        self.tally_service = tally_service
    
    def get_company_analytics(self, company_name: str, use_cache: bool = False) -> Dict:
        """
        Get COMPREHENSIVE analytics for a company
        
        Args:
            company_name: Company name
            use_cache: Use cached data (set False for fresh data)
            
        Returns:
            Complete analytics package with all metrics
        """
        try:
            # Get fresh ledger data
            ledgers = self.tally_service.get_ledgers_for_company(company_name, use_cache=use_cache)
            
            if not ledgers:
                logger.warning(f"No ledgers found for {company_name}")
                return self._empty_analytics(company_name)
            
            # Calculate comprehensive metrics
            summary = self._calculate_comprehensive_summary(ledgers, company_name)
            
            # Add financial ratios
            ratios = self._calculate_financial_ratios(summary)
            
            # Add health indicators
            health = self._calculate_health_indicators(summary)
            
            # Combine all analytics
            analytics = {
                **summary,
                **ratios,
                **health,
                "ledger_count": len(ledgers),
                "last_updated": datetime.now().isoformat()
            }
            
            logger.info(f"✓ Analytics calculated for {company_name}: Revenue=₹{summary.get('total_revenue', 0):,.2f}, Expense=₹{summary.get('total_expense', 0):,.2f}")
            return analytics
            
        except Exception as e:
            logger.error(f"Error calculating analytics for {company_name}: {e}", exc_info=True)
            return self._empty_analytics(company_name)
    
    def _calculate_comprehensive_summary(self, ledgers: List[Dict], company_name: str) -> Dict:
        """Calculate comprehensive financial summary from ledgers"""
        
        total_revenue = 0.0
        total_expense = 0.0
        total_assets = 0.0
        total_liabilities = 0.0
        total_equity = 0.0
        
        revenue_ledgers = []
        expense_ledgers = []
        asset_ledgers = []
        liability_ledgers = []
        
        for ledger in ledgers:
            name = ledger.get('name', '').lower()
            parent = ledger.get('parent', '').lower()
            balance = abs(float(ledger.get('closing_balance', 0)))
            
            # Enhanced categorization
            category = self._enhanced_categorize_ledger(name, parent, ledger.get('is_revenue'), ledger.get('is_expense'))
            
            if category == 'revenue':
                total_revenue += balance
                revenue_ledgers.append({'name': ledger.get('name'), 'amount': balance})
            elif category == 'expense':
                total_expense += balance
                expense_ledgers.append({'name': ledger.get('name'), 'amount': balance})
            elif category == 'asset':
                total_assets += balance
                asset_ledgers.append({'name': ledger.get('name'), 'amount': balance})
            elif category == 'liability':
                total_liabilities += balance
                liability_ledgers.append({'name': ledger.get('name'), 'amount': balance})
            elif category == 'equity':
                total_equity += balance
        
        net_profit = total_revenue - total_expense
        
        return {
            "company_name": company_name,
            "total_revenue": round(total_revenue, 2),
            "total_expense": round(total_expense, 2),
            "net_profit": round(net_profit, 2),
            "total_assets": round(total_assets, 2),
            "total_liabilities": round(total_liabilities, 2),
            "total_equity": round(total_equity, 2),
            "top_revenue_ledgers": sorted(revenue_ledgers, key=lambda x: x['amount'], reverse=True)[:5],
            "top_expense_ledgers": sorted(expense_ledgers, key=lambda x: x['amount'], reverse=True)[:5],
            "revenue_breakdown": self._categorize_breakdown(revenue_ledgers),
            "expense_breakdown": self._categorize_breakdown(expense_ledgers)
        }
    
    def _enhanced_categorize_ledger(self, name: str, parent: str, is_revenue: bool, is_expense: bool) -> str:
        """
        Enhanced ledger categorization with comprehensive rules
        
        Returns: 'revenue', 'expense', 'asset', 'liability', 'equity', or 'other'
        """
        name_lower = name.lower()
        parent_lower = parent.lower()
        
        # Use existing flags if available
        if is_revenue:
            return 'revenue'
        if is_expense:
            return 'expense'
        
        # Revenue patterns (COMPREHENSIVE)
        revenue_patterns = [
            'sales', 'income', 'revenue', 'receipt', 'service', 'commission',
            'interest income', 'discount received', 'profit on sale', 'rent income',
            'dividend', 'royalty', 'consultancy', 'fees', 'subscription', 'membership'
        ]
        
        # Expense patterns (COMPREHENSIVE)
        expense_patterns = [
            'expense', 'purchase', 'cost', 'salary', 'wages', 'rent', 'electricity',
            'telephone', 'internet', 'fuel', 'freight', 'insurance', 'depreciation',
            'interest paid', 'interest expense', 'bank charges', 'office', 'travelling',
            'advertisement', 'marketing', 'repairs', 'maintenance', 'professional fees',
            'discount allowed', 'tax', 'printing', 'stationery', 'postage', 'conveyance',
            'legal', 'audit', 'vehicle', 'water', 'power', 'consumables'
        ]
        
        # Asset patterns
        asset_patterns = [
            'asset', 'bank', 'cash', 'fixed asset', 'current asset', 'investment',
            'stock', 'inventory', 'debtors', 'receivable', 'advance', 'deposit',
            'plant', 'machinery', 'equipment', 'furniture', 'vehicle', 'building',
            'land', 'computer'
        ]
        
        # Liability patterns
        liability_patterns = [
            'liability', 'loan', 'creditors', 'payable', 'outstanding', 'provision',
            'duty', 'sundry creditors', 'secured loan', 'unsecured loan', 'borrowing'
        ]
        
        # Equity patterns
        equity_patterns = [
            'capital', 'equity', 'reserve', 'surplus', 'profit and loss'
        ]
        
        # Check parent first (most reliable)
        for pattern in revenue_patterns:
            if pattern in parent_lower:
                return 'revenue'
        
        for pattern in expense_patterns:
            if pattern in parent_lower:
                return 'expense'
        
        for pattern in asset_patterns:
            if pattern in parent_lower:
                return 'asset'
        
        for pattern in liability_patterns:
            if pattern in parent_lower:
                return 'liability'
        
        for pattern in equity_patterns:
            if pattern in parent_lower:
                return 'equity'
        
        # Check ledger name as fallback
        for pattern in revenue_patterns:
            if pattern in name_lower:
                return 'revenue'
        
        for pattern in expense_patterns:
            if pattern in name_lower:
                return 'expense'
        
        for pattern in asset_patterns:
            if pattern in name_lower:
                return 'asset'
        
        for pattern in liability_patterns:
            if pattern in name_lower:
                return 'liability'
        
        for pattern in equity_patterns:
            if pattern in name_lower:
                return 'equity'
        
        return 'other'
    
    def _categorize_breakdown(self, ledgers: List[Dict]) -> Dict:
        """Categorize ledgers into sub-categories for better insights"""
        breakdown = defaultdict(float)
        
        for ledger in ledgers:
            name = ledger.get('name', '').lower()
            amount = ledger.get('amount', 0)
            
            # Categorize into sub-types
            if any(x in name for x in ['sales', 'service']):
                breakdown['Sales & Services'] += amount
            elif any(x in name for x in ['salary', 'wages']):
                breakdown['Salaries & Wages'] += amount
            elif any(x in name for x in ['rent', 'electricity', 'telephone', 'internet']):
                breakdown['Utilities & Rent'] += amount
            elif any(x in name for x in ['marketing', 'advertisement']):
                breakdown['Marketing'] += amount
            elif any(x in name for x in ['purchase', 'cost of goods']):
                breakdown['Purchases'] += amount
            else:
                breakdown['Other'] += amount
        
        return dict(breakdown)
    
    def _calculate_financial_ratios(self, summary: Dict) -> Dict:
        """Calculate key financial ratios"""
        revenue = summary.get('total_revenue', 0)
        expense = summary.get('total_expense', 0)
        assets = summary.get('total_assets', 0)
        liabilities = summary.get('total_liabilities', 0)
        net_profit = summary.get('net_profit', 0)
        
        # Profitability Ratios
        profit_margin = (net_profit / revenue * 100) if revenue > 0 else 0
        expense_ratio = (expense / revenue * 100) if revenue > 0 else 0
        
        # Liquidity Ratios
        equity = assets - liabilities
        debt_to_equity = (liabilities / equity) if equity > 0 else 0
        equity_ratio = (equity / assets * 100) if assets > 0 else 0
        
        # Return Ratios
        roa = (net_profit / assets * 100) if assets > 0 else 0
        roe = (net_profit / equity * 100) if equity > 0 else 0
        
        return {
            "profit_margin": round(profit_margin, 2),
            "expense_ratio": round(expense_ratio, 2),
            "debt_to_equity_ratio": round(debt_to_equity, 2),
            "equity_ratio": round(equity_ratio, 2),
            "return_on_assets": round(roa, 2),
            "return_on_equity": round(roe, 2)
        }
    
    def _calculate_health_indicators(self, summary: Dict) -> Dict:
        """Calculate financial health indicators"""
        revenue = summary.get('total_revenue', 0)
        expense = summary.get('total_expense', 0)
        net_profit = summary.get('net_profit', 0)
        assets = summary.get('total_assets', 0)
        liabilities = summary.get('total_liabilities', 0)
        
        # Health Score (0-100)
        score = 50  # Base score
        
        # Profitability component (max 30 points)
        if revenue > 0:
            profit_margin = (net_profit / revenue) * 100
            score += min(30, max(-30, profit_margin * 0.5))
        
        # Efficiency component (max 20 points)
        if revenue > 0:
            expense_ratio = (expense / revenue) * 100
            score += min(20, (100 - expense_ratio) * 0.2)
        
        # Solvency component (max 20 points)
        equity = assets - liabilities
        if assets > 0:
            equity_ratio = (equity / assets) * 100
            score += min(20, equity_ratio * 0.2)
        
        score = min(100, max(0, score))
        
        # Health Status
        if score >= 80:
            status = "Excellent"
            color = "green"
        elif score >= 60:
            status = "Good"
            color = "blue"
        elif score >= 40:
            status = "Fair"
            color = "yellow"
        else:
            status = "Poor"
            color = "red"
        
        # Alerts
        alerts = []
        if expense > revenue:
            alerts.append("⚠️ Expenses exceed revenue")
        if liabilities > assets * 0.7:
            alerts.append("⚠️ High debt levels")
        if net_profit < 0:
            alerts.append("⚠️ Operating at a loss")
        
        return {
            "health_score": round(score, 1),
            "health_status": status,
            "health_color": color,
            "alerts": alerts
        }
    
    def _empty_analytics(self, company_name: str) -> Dict:
        """Return empty analytics structure"""
        return {
            "company_name": company_name,
            "total_revenue": 0,
            "total_expense": 0,
            "net_profit": 0,
            "total_assets": 0,
            "total_liabilities": 0,
            "total_equity": 0,
            "ledger_count": 0,
            "profit_margin": 0,
            "expense_ratio": 0,
            "debt_to_equity_ratio": 0,
            "equity_ratio": 0,
            "return_on_assets": 0,
            "return_on_equity": 0,
            "health_score": 0,
            "health_status": "No Data",
            "health_color": "gray",
            "alerts": ["No data available"],
            "top_revenue_ledgers": [],
            "top_expense_ledgers": [],
            "revenue_breakdown": {},
            "expense_breakdown": {},
            "last_updated": datetime.now().isoformat()
        }
    
    def get_multi_company_analytics(self, use_cache: bool = False) -> List[Dict]:
        """
        Get analytics for ALL companies
        
        Returns:
            List of analytics for each company
        """
        try:
            companies = self.tally_service.get_companies()
            
            if not companies:
                logger.warning("No companies found")
                return []
            
            analytics_list = []
            for company in companies:
                company_name = company.get('name')
                if company_name:
                    analytics = self.get_company_analytics(company_name, use_cache=use_cache)
                    analytics_list.append(analytics)
            
            logger.info(f"✓ Multi-company analytics calculated for {len(analytics_list)} companies")
            return analytics_list
            
        except Exception as e:
            logger.error(f"Error calculating multi-company analytics: {e}")
            return []
    
    def compare_companies(self, company_names: List[str], use_cache: bool = False) -> Dict:
        """
        Compare multiple companies side-by-side
        
        Args:
            company_names: List of company names to compare
            use_cache: Use cached data
            
        Returns:
            Comparison data with all metrics
        """
        try:
            comparison = {
                "companies": [],
                "metrics": ["revenue", "expense", "profit", "profit_margin", "health_score"]
            }
            
            for company_name in company_names:
                analytics = self.get_company_analytics(company_name, use_cache=use_cache)
                comparison["companies"].append(analytics)
            
            return comparison
            
        except Exception as e:
            logger.error(f"Error comparing companies: {e}")
            return {"companies": [], "metrics": []}
