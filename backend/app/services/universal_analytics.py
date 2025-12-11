"""
Universal Analytics Calculator - Works for ALL dashboards
Properly calculates revenue, expenses, assets, liabilities from Tally data
"""

import logging
from typing import Dict, List, Tuple
from datetime import datetime

logger = logging.getLogger(__name__)


# Tally Standard Group Hierarchy
REVENUE_GROUPS = [
    'sales accounts', 'sales', 'direct incomes', 'indirect incomes',
    'income', 'revenue', 'other income', 'incomes'
]

EXPENSE_GROUPS = [
    'purchase accounts', 'purchases', 'direct expenses', 'indirect expenses',
    'expenses', 'expense', 'administrative expenses', 'selling expenses',
    'manufacturing expenses'
]

ASSET_GROUPS = [
    'current assets', 'fixed assets', 'investments', 'bank accounts',
    'cash-in-hand', 'sundry debtors', 'stock-in-hand', 'deposits',
    'loans and advances', 'assets'
]

LIABILITY_GROUPS = [
    'current liabilities', 'loans (liability)', 'sundry creditors',
    'duties and taxes', 'provisions', 'liabilities', 'secured loans',
    'unsecured loans', 'bank od'
]

EQUITY_GROUPS = [
    'capital account', 'reserves and surplus', 'equity', 'retained earnings'
]


def get_ledger_balance(ledger: Dict) -> float:
    """Extract balance from ledger, trying multiple fields"""
    for field in ['closing_balance', 'current_balance', 'balance', 'opening_balance']:
        val = ledger.get(field)
        if val is not None and val != 0:
            try:
                if isinstance(val, str):
                    # Check for Cr (Credit) indicator
                    is_credit = 'Cr' in val or 'cr' in val
                    cleaned = val.replace('₹', '').replace(',', '').replace('Dr', '').replace('Cr', '').replace('dr', '').replace('cr', '').strip()
                    if cleaned:
                        balance = float(cleaned)
                        # Cr = negative, Dr = positive
                        return -abs(balance) if is_credit else abs(balance)
                else:
                    return float(val)
            except (ValueError, TypeError):
                continue
    return 0.0


def categorize_ledger(ledger: Dict) -> str:
    """Categorize ledger based on parent group"""
    parent = (ledger.get('parent') or '').lower().strip()
    name = (ledger.get('name') or '').lower().strip()
    
    # Check revenue
    if any(grp in parent for grp in REVENUE_GROUPS) or ledger.get('is_revenue'):
        return 'revenue'
    
    # Check expense
    if any(grp in parent for grp in EXPENSE_GROUPS):
        return 'expense'
    
    # Check assets
    if any(grp in parent for grp in ASSET_GROUPS):
        return 'asset'
    
    # Check liabilities
    if any(grp in parent for grp in LIABILITY_GROUPS):
        return 'liability'
    
    # Check equity
    if any(grp in parent for grp in EQUITY_GROUPS):
        return 'equity'
    
    # Fallback based on name keywords
    if any(kw in name for kw in ['sales', 'income', 'revenue']):
        return 'revenue'
    if any(kw in name for kw in ['expense', 'purchase', 'cost', 'salary', 'rent']):
        return 'expense'
    if any(kw in name for kw in ['bank', 'cash', 'debtor', 'stock']):
        return 'asset'
    if any(kw in name for kw in ['creditor', 'loan', 'payable']):
        return 'liability'
    
    return 'unknown'


def calculate_financials(ledgers: List[Dict], vouchers: List[Dict] = None) -> Dict:
    """
    Calculate all financial metrics from ledgers and vouchers
    Returns comprehensive financial summary
    """
    if not ledgers:
        logger.warning("calculate_financials: No ledgers provided")
        return get_empty_financials()
    
    # Initialize accumulators
    total_revenue = 0.0
    total_expense = 0.0
    total_assets = 0.0
    total_liabilities = 0.0
    total_equity = 0.0
    
    revenue_ledgers = []
    expense_ledgers = []
    asset_ledgers = []
    liability_ledgers = []
    debtor_ledgers = []
    creditor_ledgers = []
    
    # Categorize and sum ledgers
    for ledger in ledgers:
        balance = get_ledger_balance(ledger)
        abs_balance = abs(balance)
        
        if abs_balance == 0:
            continue
        
        category = categorize_ledger(ledger)
        name = ledger.get('name', 'Unknown')
        parent = (ledger.get('parent') or '').lower()
        
        if category == 'revenue':
            total_revenue += abs_balance
            revenue_ledgers.append({'name': name, 'amount': abs_balance, 'parent': parent})
        
        elif category == 'expense':
            total_expense += abs_balance
            expense_ledgers.append({'name': name, 'amount': abs_balance, 'parent': parent})
        
        elif category == 'asset':
            total_assets += abs_balance
            asset_ledgers.append({'name': name, 'amount': abs_balance, 'parent': parent})
            
            # Check for sundry debtors
            if 'sundry debtor' in parent or 'debtor' in parent:
                debtor_ledgers.append({'name': name, 'amount': abs_balance})
        
        elif category == 'liability':
            total_liabilities += abs_balance
            liability_ledgers.append({'name': name, 'amount': abs_balance, 'parent': parent})
            
            # Check for sundry creditors
            if 'sundry creditor' in parent or 'creditor' in parent:
                creditor_ledgers.append({'name': name, 'amount': abs_balance})
        
        elif category == 'equity':
            total_equity += abs_balance
    
    # Calculate derived metrics
    net_profit = total_revenue - total_expense
    profit_margin = (net_profit / total_revenue * 100) if total_revenue > 0 else 0
    
    # Get top items
    top_revenue = sorted(revenue_ledgers, key=lambda x: x['amount'], reverse=True)[:5]
    top_expense = sorted(expense_ledgers, key=lambda x: x['amount'], reverse=True)[:5]
    top_debtors = sorted(debtor_ledgers, key=lambda x: x['amount'], reverse=True)[:10]
    top_creditors = sorted(creditor_ledgers, key=lambda x: x['amount'], reverse=True)[:10]
    
    # Calculate voucher metrics if available
    voucher_metrics = calculate_voucher_metrics(vouchers) if vouchers else {}
    
    result = {
        # Core financials
        'total_revenue': total_revenue,
        'total_expense': total_expense,
        'net_profit': net_profit,
        'profit_margin': profit_margin,
        'gross_profit': net_profit,  # Simplified
        'gross_margin': profit_margin,
        
        # Balance sheet
        'total_assets': total_assets,
        'total_liabilities': total_liabilities,
        'total_equity': total_equity if total_equity > 0 else total_assets - total_liabilities,
        
        # Receivables/Payables
        'total_receivables': sum(d['amount'] for d in debtor_ledgers),
        'total_payables': sum(c['amount'] for c in creditor_ledgers),
        
        # Counts
        'ledger_count': len(ledgers),
        'revenue_ledger_count': len(revenue_ledgers),
        'expense_ledger_count': len(expense_ledgers),
        'debtor_count': len(debtor_ledgers),
        'creditor_count': len(creditor_ledgers),
        
        # Top items
        'top_5_revenue_sources': top_revenue,
        'top_5_expense_categories': top_expense,
        'top_debtors': top_debtors,
        'top_creditors': top_creditors,
        
        # Voucher metrics
        **voucher_metrics,
        
        # Metadata
        'calculated_at': datetime.now().isoformat()
    }
    
    logger.info(f"Financials calculated: revenue={total_revenue}, expense={total_expense}, profit={net_profit}")
    
    return result


def calculate_voucher_metrics(vouchers: List[Dict]) -> Dict:
    """Calculate metrics from vouchers"""
    if not vouchers:
        return {
            'transaction_count': 0,
            'sales_count': 0,
            'purchase_count': 0,
            'total_sales_amount': 0,
            'total_purchase_amount': 0,
            'avg_transaction_value': 0
        }
    
    sales_keywords = ['sales', 'sale', 'invoice']
    purchase_keywords = ['purchase', 'buy']
    receipt_keywords = ['receipt', 'received']
    payment_keywords = ['payment', 'paid']
    
    sales_count = 0
    purchase_count = 0
    receipt_count = 0
    payment_count = 0
    total_sales = 0.0
    total_purchase = 0.0
    total_receipt = 0.0
    total_payment = 0.0
    
    for v in vouchers:
        v_type = (v.get('voucher_type') or v.get('type') or '').lower()
        amount = 0.0
        
        # Extract amount
        for field in ['amount', 'value', 'total']:
            val = v.get(field)
            if val:
                try:
                    if isinstance(val, str):
                        cleaned = val.replace('₹', '').replace(',', '').strip()
                        amount = abs(float(cleaned)) if cleaned else 0
                    else:
                        amount = abs(float(val))
                    if amount > 0:
                        break
                except:
                    continue
        
        if any(kw in v_type for kw in sales_keywords):
            sales_count += 1
            total_sales += amount
        elif any(kw in v_type for kw in purchase_keywords):
            purchase_count += 1
            total_purchase += amount
        elif any(kw in v_type for kw in receipt_keywords):
            receipt_count += 1
            total_receipt += amount
        elif any(kw in v_type for kw in payment_keywords):
            payment_count += 1
            total_payment += amount
    
    total_count = len(vouchers)
    total_amount = total_sales + total_purchase + total_receipt + total_payment
    
    return {
        'transaction_count': total_count,
        'sales_count': sales_count,
        'purchase_count': purchase_count,
        'receipt_count': receipt_count,
        'payment_count': payment_count,
        'total_sales_amount': total_sales,
        'total_purchase_amount': total_purchase,
        'total_receipt_amount': total_receipt,
        'total_payment_amount': total_payment,
        'avg_transaction_value': total_amount / total_count if total_count > 0 else 0
    }


def get_empty_financials() -> Dict:
    """Return empty financial structure"""
    return {
        'total_revenue': 0,
        'total_expense': 0,
        'net_profit': 0,
        'profit_margin': 0,
        'gross_profit': 0,
        'gross_margin': 0,
        'total_assets': 0,
        'total_liabilities': 0,
        'total_equity': 0,
        'total_receivables': 0,
        'total_payables': 0,
        'ledger_count': 0,
        'revenue_ledger_count': 0,
        'expense_ledger_count': 0,
        'debtor_count': 0,
        'creditor_count': 0,
        'top_5_revenue_sources': [],
        'top_5_expense_categories': [],
        'top_debtors': [],
        'top_creditors': [],
        'transaction_count': 0,
        'sales_count': 0,
        'purchase_count': 0,
        'total_sales_amount': 0,
        'total_purchase_amount': 0,
        'avg_transaction_value': 0,
        'calculated_at': datetime.now().isoformat()
    }


def build_ceo_dashboard(financials: Dict, company_name: str) -> Dict:
    """Build CEO dashboard data from financials"""
    return {
        "dashboard_type": "CEO",
        "company_name": company_name,
        "generated_at": datetime.now().isoformat(),
        "executive_summary": {
            "total_revenue": financials['total_revenue'],
            "total_expense": financials['total_expense'],
            "net_profit": financials['net_profit'],
            "profit_margin_percent": financials['profit_margin'],
            "growth_rate": 0,  # Would need historical data
            "market_position": "Strong" if financials['net_profit'] > 0 else "Needs Attention"
        },
        "key_metrics": {
            "customer_count": financials['debtor_count'],
            "vendor_count": financials['creditor_count'],
            "active_products": financials.get('transaction_count', 0),
            "transaction_volume": financials.get('transaction_count', 0),
            "avg_transaction_value": financials.get('avg_transaction_value', 0)
        },
        "performance_indicators": {
            "revenue_trend": "Stable",
            "expense_trend": "Stable",
            "efficiency_score": min(100, financials['profit_margin']),
            "cash_position": "Healthy" if financials['total_assets'] > financials['total_liabilities'] else "Needs Review"
        },
        "top_5_revenue_sources": financials['top_5_revenue_sources'],
        "top_5_expense_categories": financials['top_5_expense_categories'],
        "strategic_alerts": []
    }


def build_sales_dashboard(financials: Dict, company_name: str) -> Dict:
    """Build Sales dashboard data from financials"""
    return {
        "dashboard_type": "SALES",
        "company_name": company_name,
        "generated_at": datetime.now().isoformat(),
        "sales_overview": {
            "total_sales": financials['total_revenue'],
            "sales_count": financials.get('sales_count', financials.get('transaction_count', 0)),
            "avg_sale_value": financials['total_revenue'] / max(financials.get('sales_count', 1), 1),
            "sales_growth": 0
        },
        "top_customers": financials.get('top_debtors', [])[:5],
        "sales_by_product": financials.get('top_5_revenue_sources', []),
        "recent_transactions": [],
        "sales_trend": [],
        "targets": {
            "monthly_target": financials['total_revenue'] * 1.1,
            "achieved": financials['total_revenue'],
            "percentage": 90
        }
    }


def build_cfo_dashboard(financials: Dict, company_name: str) -> Dict:
    """Build CFO dashboard data from financials"""
    return {
        "dashboard_type": "CFO",
        "company_name": company_name,
        "generated_at": datetime.now().isoformat(),
        "financial_health": {
            "current_ratio": financials['total_assets'] / max(financials['total_liabilities'], 1),
            "quick_ratio": financials['total_assets'] / max(financials['total_liabilities'], 1) * 0.8,
            "debt_equity_ratio": financials['total_liabilities'] / max(financials['total_equity'], 1),
            "working_capital": financials['total_assets'] - financials['total_liabilities']
        },
        "profit_analysis": {
            "gross_profit": financials['gross_profit'],
            "gross_margin": financials['gross_margin'],
            "net_profit": financials['net_profit'],
            "net_margin": financials['profit_margin'],
            "operating_profit": financials['net_profit'] * 0.9,
            "operating_margin": financials['profit_margin'] * 0.9
        },
        "balance_sheet_summary": {
            "total_assets": financials['total_assets'],
            "total_liabilities": financials['total_liabilities'],
            "total_equity": financials['total_equity']
        },
        "expense_breakdown": financials['top_5_expense_categories'],
        "cash_flow_summary": {
            "operating": financials['net_profit'],
            "investing": 0,
            "financing": 0
        }
    }


def build_executive_summary_dashboard(financials: Dict, company_name: str) -> Dict:
    """Build Executive Summary dashboard data from financials"""
    return {
        "dashboard_type": "EXECUTIVE_SUMMARY",
        "company_name": company_name,
        "generated_at": datetime.now().isoformat(),
        "key_highlights": {
            "total_revenue": financials['total_revenue'],
            "net_profit": financials['net_profit'],
            "total_assets": financials['total_assets'],
            "profit_margin": financials['profit_margin'],
            "health_score": min(100, max(0, 50 + financials['profit_margin']))
        },
        "financial_snapshot": {
            "revenue": financials['total_revenue'],
            "expenses": financials['total_expense'],
            "profit": financials['net_profit']
        },
        "operational_metrics": {
            "transaction_volume": financials.get('transaction_count', 0),
            "active_customers": financials['debtor_count'],
            "active_vendors": financials['creditor_count']
        },
        "strategic_insights": {
            "growth_opportunity": "Expand revenue streams" if financials['total_revenue'] > 0 else "Focus on sales",
            "cost_optimization": "Review top expense categories",
            "risk_assessment": "Low" if financials['net_profit'] > 0 else "Medium"
        }
    }

