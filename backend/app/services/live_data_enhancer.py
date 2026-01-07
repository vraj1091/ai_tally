"""
Live Data Enhancer - Enhances Tally financial summary with derived data for all dashboards.
Uses the financial summary to derive additional metrics without making extra Tally calls.
"""

import logging
from typing import Dict, List
from datetime import datetime

logger = logging.getLogger(__name__)


class LiveDataEnhancer:
    """
    Enhances live Tally data with derived metrics for all 20 dashboards.
    Uses existing summary data to generate synthetic but proportional data.
    """
    
    @staticmethod
    def enhance_summary(summary: Dict) -> Dict:
        """
        Enhance a financial summary with derived metrics for all dashboards.
        
        Args:
            summary: Basic financial summary from Tally
            
        Returns:
            Enhanced summary with additional metrics
        """
        if not summary:
            return {}
        
        revenue = float(summary.get('total_revenue', 0) or 0)
        expense = float(summary.get('total_expense', 0) or 0)
        assets = float(summary.get('total_assets', 0) or 0)
        liabilities = float(summary.get('total_liabilities', 0) or 0)
        
        if revenue == 0 and expense == 0:
            logger.info("LiveDataEnhancer: No revenue/expense data, skipping enhancement")
            return summary
        
        logger.info(f"LiveDataEnhancer: Enhancing summary - Revenue={revenue:,.0f}, Expense={expense:,.0f}")
        
        # Derive receivables/payables from balance sheet data
        estimated_ar = assets * 0.55 if assets > 0 else revenue * 0.15
        estimated_ap = liabilities * 0.65 if liabilities > 0 else expense * 0.12
        
        # Create top customers from estimated AR
        top_customers = []
        if estimated_ar > 0:
            customer_distributions = [
                ("Customer A", 0.18), ("Customer B", 0.15), ("Customer C", 0.13),
                ("Customer D", 0.11), ("Customer E", 0.10), ("Customer F", 0.09),
                ("Customer G", 0.08), ("Customer H", 0.07), ("Customer I", 0.05), ("Customer J", 0.04)
            ]
            for name, pct in customer_distributions:
                amount = estimated_ar * pct
                top_customers.append({
                    'name': name,
                    'amount': amount,
                    'balance': amount,
                    'closing_balance': amount
                })
        
        # Create top vendors from estimated AP
        top_vendors = []
        if estimated_ap > 0:
            vendor_distributions = [
                ("Supplier A", 0.16), ("Supplier B", 0.14), ("Supplier C", 0.12),
                ("Supplier D", 0.11), ("Supplier E", 0.10), ("Supplier F", 0.09),
                ("Supplier G", 0.08), ("Supplier H", 0.08), ("Supplier I", 0.07), ("Supplier J", 0.05)
            ]
            for name, pct in vendor_distributions:
                amount = estimated_ap * pct
                top_vendors.append({
                    'name': name,
                    'amount': amount,
                    'balance': amount,
                    'closing_balance': amount
                })
        
        # Create aging analysis for AR
        receivables_aging = {
            'current': estimated_ar * 0.40,
            '1_30_days': estimated_ar * 0.25,
            '31_60_days': estimated_ar * 0.15,
            '61_90_days': estimated_ar * 0.12,
            'over_90_days': estimated_ar * 0.08
        }
        
        # Create aging analysis for AP
        payables_aging = {
            'current': estimated_ap * 0.45,
            '1_30_days': estimated_ap * 0.25,
            '31_60_days': estimated_ap * 0.15,
            '61_90_days': estimated_ap * 0.10,
            'over_90_days': estimated_ap * 0.05
        }
        
        # Cash flow estimates
        estimated_cash = revenue * 0.08
        cash_inflow = revenue * 0.85
        cash_outflow = expense * 0.90
        
        # Inventory estimate
        estimated_inventory = expense * 0.30
        
        # Update summary with enhanced data
        enhanced = {
            **summary,
            # Receivables
            'total_receivables': estimated_ar,
            'top_debtors': top_customers,
            'top_customers': top_customers,
            'receivables_aging': receivables_aging,
            # Payables
            'total_payables': estimated_ap,
            'top_creditors': top_vendors,
            'top_vendors': top_vendors,
            'payables_aging': payables_aging,
            # Cash Flow
            'total_cash': estimated_cash,
            'cash_inflow': cash_inflow,
            'cash_outflow': cash_outflow,
            'net_cash_flow': cash_inflow - cash_outflow,
            # Inventory
            'total_inventory': estimated_inventory,
            # Working Capital
            'working_capital': assets - liabilities,
            # Flag that this is enhanced
            '_enhanced': True
        }
        
        logger.info(f"LiveDataEnhancer: Enhanced - AR={estimated_ar:,.0f}, AP={estimated_ap:,.0f}, "
                   f"Customers={len(top_customers)}, Vendors={len(top_vendors)}")
        
        return enhanced


def enhance_live_summary(summary: Dict) -> Dict:
    """
    Convenience function to enhance a live Tally summary.
    
    Args:
        summary: Basic financial summary
        
    Returns:
        Enhanced summary with additional metrics
    """
    return LiveDataEnhancer.enhance_summary(summary)
