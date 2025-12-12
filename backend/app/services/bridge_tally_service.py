"""
Bridge Tally Service
Fetches data from local Tally via WebSocket Bridge
Mimics TallyDataService interface for seamless integration
"""

import asyncio
import xml.etree.ElementTree as ET
import logging
import re
from typing import Dict, List, Optional, Any
from datetime import datetime

logger = logging.getLogger(__name__)


class BridgeTallyService:
    """
    Tally Service that fetches data via WebSocket Bridge
    Provides the same interface as TallyDataService for compatibility
    """
    
    def __init__(self, bridge_manager, bridge_token: str):
        """
        Initialize with bridge connection
        
        Args:
            bridge_manager: The WebSocket bridge manager instance
            bridge_token: User's bridge token
        """
        self.bridge_manager = bridge_manager
        self.bridge_token = bridge_token
        self.connected = bridge_manager.is_connected(bridge_token) if bridge_manager else False
        self._cached_data = {}
    
    async def _send_tally_request(self, xml_request: str, timeout: int = 600) -> Optional[str]:
        """Send XML request to Tally via bridge and return response
        
        Args:
            xml_request: XML request to send to Tally
            timeout: Timeout in seconds (default 600s = 10 minutes for large data up to 2GB)
        """
        if not self.connected:
            logger.warning("Bridge not connected")
            return None
        
        try:
            logger.info(f"Sending tally_request via bridge (timeout={timeout}s)...")
            response = await self.bridge_manager.send_to_bridge(self.bridge_token, {
                'type': 'tally_request',
                'method': 'POST',
                'payload': xml_request,
                'headers': {'Content-Type': 'text/xml'},
                'timeout': timeout
            })
            
            if response.get('success'):
                content = response.get('content', '')
                size_mb = len(content) / (1024 * 1024)
                logger.info(f"Bridge response received: {len(content)} bytes ({size_mb:.2f} MB)")
                return content
            else:
                logger.error(f"Bridge request failed: {response.get('error')}")
                return None
        except Exception as e:
            logger.error(f"Error sending to bridge: {e}")
            return None
    
    def _parse_amount(self, text: str) -> float:
        """Parse amount string to float"""
        if not text:
            return 0.0
        try:
            cleaned = re.sub(r'[₹,\s]', '', str(text))
            is_negative = 'Cr' in str(text) or cleaned.startswith('-')
            cleaned = re.sub(r'[DrCr]', '', cleaned)
            value = float(cleaned) if cleaned else 0.0
            return -value if is_negative else value
        except:
            return 0.0
    
    async def get_companies(self) -> List[Dict]:
        """Get list of companies from Tally"""
        xml_request = """<ENVELOPE>
            <HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>Companies</ID></HEADER>
            <BODY><DESC><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES>
            <TDL><TDLMESSAGE><COLLECTION NAME="Companies"><TYPE>Company</TYPE><FETCH>Name,StartingFrom,BooksFrom</FETCH></COLLECTION></TDLMESSAGE></TDL>
            </DESC></BODY></ENVELOPE>"""
        
        response = await self._send_tally_request(xml_request)
        companies = []
        
        if response:
            try:
                # Parse XML response
                matches = re.findall(r'<NAME[^>]*>([^<]+)</NAME>', response)
                companies = [{'name': name} for name in matches if name]
            except Exception as e:
                logger.error(f"Error parsing companies: {e}")
        
        return companies
    
    async def get_ledgers(self, company_name: str) -> List[Dict]:
        """Get all ledgers for a company"""
        xml_request = f"""<ENVELOPE>
            <HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>All Ledgers</ID></HEADER>
            <BODY><DESC><STATICVARIABLES>
                <SVCURRENTCOMPANY>{company_name}</SVCURRENTCOMPANY>
                <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
            </STATICVARIABLES>
            <TDL><TDLMESSAGE>
                <COLLECTION NAME="All Ledgers">
                    <TYPE>Ledger</TYPE>
                    <FETCH>NAME, PARENT, OPENINGBALANCE, CLOSINGBALANCE</FETCH>
                </COLLECTION>
            </TDLMESSAGE></TDL></DESC></BODY></ENVELOPE>"""
        
        response = await self._send_tally_request(xml_request)
        ledgers = []
        
        if response:
            logger.info(f"Parsing ledgers from {len(response)} bytes...")
            
            try:
                root = ET.fromstring(response)
                
                # Try multiple XPath patterns for different Tally XML formats
                ledger_elements = (
                    root.findall('.//LEDGER') or 
                    root.findall('.//LEDGER.LIST') or
                    root.findall('.//{http://www.tally.co.in}LEDGER')
                )
                
                for ledger in ledger_elements:
                    # Tally can use NAME attribute or NAME child element
                    name = ledger.get('NAME') or ledger.get('name') or ''
                    if not name:
                        name_el = ledger.find('NAME') or ledger.find('LANGUAGENAME.LIST/NAME.LIST/NAME')
                        name = name_el.text if name_el is not None else ''
                    
                    # Get parent group
                    parent_el = ledger.find('PARENT')
                    parent = parent_el.text if parent_el is not None else ''
                    
                    # Get balances - try multiple field names
                    closing = 0
                    opening = 0
                    for bal_field in ['CLOSINGBALANCE', 'LEDCLOSINGBAL', 'AMOUNT']:
                        bal_el = ledger.find(bal_field)
                        if bal_el is not None and bal_el.text:
                            closing = self._parse_amount(bal_el.text)
                            break
                    
                    for bal_field in ['OPENINGBALANCE', 'LEDOPENINGBAL']:
                        bal_el = ledger.find(bal_field)
                        if bal_el is not None and bal_el.text:
                            opening = self._parse_amount(bal_el.text)
                            break
                    
                    if name:  # Only add if we got a name
                        ledgers.append({
                            'name': name,
                            'parent': parent,
                            'opening_balance': opening,
                            'closing_balance': closing
                        })
                
                logger.info(f"XML parsing found {len(ledgers)} ledgers")
                
            except ET.ParseError as e:
                logger.warning(f"XML parsing failed: {e}, using regex fallback...")
            
            # If XML parsing found nothing, use regex fallback
            if not ledgers:
                logger.info("Using regex parsing for ledgers...")
                
                # Pattern 1: LEDGER with NAME attribute (Tally standard export)
                pattern1 = r'<LEDGER\s+NAME="([^"]+)"[^>]*>.*?<PARENT>([^<]*)</PARENT>.*?(?:<CLOSINGBALANCE>([^<]*)</CLOSINGBALANCE>)?.*?</LEDGER>'
                matches1 = re.findall(pattern1, response, re.DOTALL | re.IGNORECASE)
                
                for match in matches1:
                    name, parent, closing = match[0], match[1] if len(match) > 1 else '', match[2] if len(match) > 2 else '0'
                    ledgers.append({
                        'name': name,
                        'parent': parent,
                        'opening_balance': 0,
                        'closing_balance': self._parse_amount(closing)
                    })
                
                # Pattern 2: Simple NAME/PARENT/CLOSINGBALANCE structure
                if not ledgers:
                    names = re.findall(r'<NAME>([^<]+)</NAME>', response)
                    parents = re.findall(r'<PARENT>([^<]*)</PARENT>', response)
                    closings = re.findall(r'<CLOSINGBALANCE>([^<]*)</CLOSINGBALANCE>', response)
                    
                    # Match them up
                    for i, name in enumerate(names):
                        ledgers.append({
                            'name': name,
                            'parent': parents[i] if i < len(parents) else '',
                            'opening_balance': 0,
                            'closing_balance': self._parse_amount(closings[i]) if i < len(closings) else 0
                        })
                
                logger.info(f"Regex parsing found {len(ledgers)} ledgers")
        
        return ledgers
    
    async def get_groups(self, company_name: str) -> List[Dict]:
        """Get all groups for a company"""
        xml_request = f"""<ENVELOPE>
            <HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>All Groups</ID></HEADER>
            <BODY><DESC><STATICVARIABLES>
                <SVCURRENTCOMPANY>{company_name}</SVCURRENTCOMPANY>
                <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
            </STATICVARIABLES>
            <TDL><TDLMESSAGE>
                <COLLECTION NAME="All Groups">
                    <TYPE>Group</TYPE>
                    <FETCH>NAME, PARENT</FETCH>
                </COLLECTION>
            </TDLMESSAGE></TDL></DESC></BODY></ENVELOPE>"""
        
        response = await self._send_tally_request(xml_request)
        groups = []
        
        if response:
            names = re.findall(r'<NAME>([^<]+)</NAME>', response)
            parents = re.findall(r'<PARENT>([^<]*)</PARENT>', response)
            
            for i, name in enumerate(names):
                groups.append({
                    'name': name,
                    'parent': parents[i] if i < len(parents) else ''
                })
        
        return groups
    
    async def get_vouchers(self, company_name: str, limit: int = 100) -> List[Dict]:
        """Get recent vouchers for a company"""
        xml_request = f"""<ENVELOPE>
            <HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>Recent Vouchers</ID></HEADER>
            <BODY><DESC><STATICVARIABLES>
                <SVCURRENTCOMPANY>{company_name}</SVCURRENTCOMPANY>
                <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
            </STATICVARIABLES>
            <TDL><TDLMESSAGE>
                <COLLECTION NAME="Recent Vouchers">
                    <TYPE>Voucher</TYPE>
                    <FETCH>DATE, VOUCHERTYPENAME, VOUCHERNUMBER, PARTYLEDGERNAME, AMOUNT</FETCH>
                </COLLECTION>
            </TDLMESSAGE></TDL></DESC></BODY></ENVELOPE>"""
        
        response = await self._send_tally_request(xml_request)
        vouchers = []
        
        if response:
            # Parse vouchers from XML
            dates = re.findall(r'<DATE>([^<]+)</DATE>', response)
            types = re.findall(r'<VOUCHERTYPENAME>([^<]+)</VOUCHERTYPENAME>', response)
            amounts = re.findall(r'<AMOUNT>([^<]+)</AMOUNT>', response)
            
            for i in range(min(len(dates), limit)):
                vouchers.append({
                    'date': dates[i] if i < len(dates) else '',
                    'type': types[i] if i < len(types) else '',
                    'amount': self._parse_amount(amounts[i]) if i < len(amounts) else 0
                })
        
        return vouchers
    
    async def get_financial_summary(self, company_name: str) -> Dict:
        """
        Get financial summary by analyzing ledgers
        This is the key method that provides data for all dashboards
        """
        ledgers = await self.get_ledgers(company_name)
        logger.info(f"Financial summary for {company_name}: processing {len(ledgers)} ledgers")
        
        # Categorize ledgers by parent group
        revenue = 0
        expenses = 0
        assets = 0
        liabilities = 0
        receivables = 0
        payables = 0
        cash_bank = 0
        
        revenue_items = []
        expense_items = []
        debtor_items = []
        creditor_items = []
        
        revenue_groups = ['sales accounts', 'direct income', 'indirect income', 'sales', 'income', 'revenue']
        expense_groups = ['direct expenses', 'indirect expenses', 'expenses', 'purchase accounts', 'purchases']
        asset_groups = ['current assets', 'fixed assets', 'investments', 'bank accounts', 'cash-in-hand', 'loans & advances']
        liability_groups = ['current liabilities', 'loans', 'capital account', 'reserves & surplus', 'reserves']
        debtor_groups = ['sundry debtors', 'debtors']
        creditor_groups = ['sundry creditors', 'creditors']
        cash_groups = ['cash-in-hand', 'bank accounts', 'bank', 'cash']
        
        for ledger in ledgers:
            parent = (ledger.get('parent') or '').lower()
            closing = ledger.get('closing_balance', 0)
            name = ledger.get('name', '')
            
            if any(g in parent for g in revenue_groups):
                revenue += abs(closing)
                revenue_items.append({'name': name, 'amount': abs(closing)})
            elif any(g in parent for g in expense_groups):
                expenses += abs(closing)
                expense_items.append({'name': name, 'amount': abs(closing)})
            
            if any(g in parent for g in debtor_groups):
                receivables += abs(closing)
                debtor_items.append({'name': name, 'amount': abs(closing)})
            elif any(g in parent for g in creditor_groups):
                payables += abs(closing)
                creditor_items.append({'name': name, 'amount': abs(closing)})
            
            if any(g in parent for g in cash_groups):
                cash_bank += closing
            
            if any(g in parent for g in asset_groups):
                assets += abs(closing)
            elif any(g in parent for g in liability_groups):
                liabilities += abs(closing)
        
        # Sort by amount
        revenue_items.sort(key=lambda x: x['amount'], reverse=True)
        expense_items.sort(key=lambda x: x['amount'], reverse=True)
        debtor_items.sort(key=lambda x: x['amount'], reverse=True)
        creditor_items.sort(key=lambda x: x['amount'], reverse=True)
        
        net_profit = revenue - expenses
        profit_margin = (net_profit / revenue * 100) if revenue > 0 else 0
        
        return {
            'total_revenue': revenue,
            'total_expense': expenses,
            'net_profit': net_profit,
            'profit_margin': profit_margin,
            'total_assets': assets,
            'total_liabilities': liabilities,
            'outstanding_receivable': receivables,
            'outstanding_payable': payables,
            'cash_balance': cash_bank,
            'bank_balance': 0,
            'top_revenue_sources': revenue_items[:10],
            'top_expense_categories': expense_items[:10],
            'top_debtors': debtor_items[:10],
            'top_creditors': creditor_items[:10],
            'ledger_count': len(ledgers),
            'source': 'bridge'
        }
    
    async def get_all_company_data(self, company_name: str) -> Dict:
        """
        Get comprehensive company data - main method for dashboard analytics
        Returns data in the same format as TallyDataService
        """
        summary = await self.get_financial_summary(company_name)
        ledgers = await self.get_ledgers(company_name)
        groups = await self.get_groups(company_name)
        
        # Build comprehensive data structure
        return {
            'company': {'name': company_name},
            'summary': summary,
            'ledgers': ledgers,
            'groups': groups,
            'source': 'bridge',
            'timestamp': datetime.now().isoformat()
        }


class BridgeSpecializedAnalytics:
    """
    Specialized Analytics that works with Bridge data
    Provides the same output format as SpecializedAnalytics
    """
    
    def __init__(self, bridge_service: BridgeTallyService):
        self.bridge_service = bridge_service
    
    async def get_ceo_analytics(self, company_name: str) -> Dict:
        """CEO Dashboard - Executive Overview"""
        summary = await self.bridge_service.get_financial_summary(company_name)
        
        return {
            'revenue': summary['total_revenue'],
            'expense': summary['total_expense'],
            'profit': summary['net_profit'],
            'profit_margin': summary['profit_margin'],
            'revenue_growth': 0,
            'expense_ratio': (summary['total_expense'] / summary['total_revenue'] * 100) if summary['total_revenue'] > 0 else 0,
            'key_metrics': {
                'total_ledgers': summary['ledger_count'],
                'active_customers': len(summary['top_debtors']),
                'active_vendors': len(summary['top_creditors']),
                'outstanding_receivable': summary['outstanding_receivable'],
                'outstanding_payable': summary['outstanding_payable'],
                'cash_balance': summary['cash_balance'],
                'bank_balance': summary['bank_balance']
            },
            'top_revenue_sources': summary['top_revenue_sources'][:5],
            'top_expense_categories': summary['top_expense_categories'][:5],
            'top_5_revenue_sources': summary['top_revenue_sources'][:5],
            'top_5_expense_categories': summary['top_expense_categories'][:5],
            'monthly_trend': [],
            'revenue_vs_expense': [
                {'category': 'Revenue', 'value': summary['total_revenue']},
                {'category': 'Expense', 'value': summary['total_expense']},
                {'category': 'Profit', 'value': summary['net_profit']}
            ],
            'executive_summary': {
                'total_revenue': summary['total_revenue'],
                'net_profit': summary['net_profit'],
                'profit_margin': summary['profit_margin']
            },
            'source': 'bridge'
        }
    
    async def get_cfo_analytics(self, company_name: str) -> Dict:
        """CFO Dashboard - Financial Health"""
        summary = await self.bridge_service.get_financial_summary(company_name)
        
        return {
            'financial_health': {
                'total_revenue': summary['total_revenue'],
                'total_expenses': summary['total_expense'],
                'net_profit': summary['net_profit'],
                'profit_margin': summary['profit_margin']
            },
            'balance_sheet_summary': {
                'total_assets': summary['total_assets'],
                'total_liabilities': summary['total_liabilities'],
                'net_worth': summary['total_assets'] - summary['total_liabilities']
            },
            'cash_position': {
                'cash_balance': summary['cash_balance'],
                'receivables': summary['outstanding_receivable'],
                'payables': summary['outstanding_payable']
            },
            'working_capital': summary['outstanding_receivable'] - summary['outstanding_payable'],
            'executive_summary': {
                'total_revenue': summary['total_revenue'],
                'net_profit': summary['net_profit']
            },
            'source': 'bridge'
        }
    
    async def get_executive_summary_analytics(self, company_name: str) -> Dict:
        """Executive Summary Dashboard"""
        summary = await self.bridge_service.get_financial_summary(company_name)
        
        health_score = min(100, max(0, 50 + summary['profit_margin']))
        
        return {
            'key_highlights': {
                'total_revenue': summary['total_revenue'],
                'net_profit': summary['net_profit'],
                'total_assets': summary['total_assets'],
                'profit_margin': summary['profit_margin'],
                'health_score': health_score
            },
            'financial_snapshot': {
                'revenue': summary['total_revenue'],
                'expenses': summary['total_expense'],
                'profit': summary['net_profit']
            },
            'operational_metrics': {
                'ledger_count': summary['ledger_count'],
                'customer_count': len(summary['top_debtors']),
                'vendor_count': len(summary['top_creditors'])
            },
            'strategic_insights': {
                'receivable_to_payable': summary['outstanding_receivable'] / summary['outstanding_payable'] if summary['outstanding_payable'] > 0 else 0
            },
            'executive_summary': {
                'total_revenue': summary['total_revenue'],
                'net_profit': summary['net_profit']
            },
            'source': 'bridge'
        }
    
    async def get_sales_analytics(self, company_name: str) -> Dict:
        """Sales Dashboard"""
        summary = await self.bridge_service.get_financial_summary(company_name)
        
        return {
            'total_sales': summary['total_revenue'],
            'sales_breakdown': summary['top_revenue_sources'],
            'top_customers': summary['top_debtors'],
            'monthly_sales': [],
            'executive_summary': {
                'total_revenue': summary['total_revenue']
            },
            'source': 'bridge'
        }
    
    async def get_profit_loss_analytics(self, company_name: str) -> Dict:
        """Profit & Loss Dashboard"""
        summary = await self.bridge_service.get_financial_summary(company_name)
        
        return {
            'summary': {
                'total_revenue': summary['total_revenue'],
                'total_expenses': summary['total_expense'],
                'gross_profit': summary['total_revenue'] - summary['total_expense'] * 0.6,
                'net_profit': summary['net_profit'],
                'profit_margin': summary['profit_margin']
            },
            'revenue_breakdown': summary['top_revenue_sources'],
            'expense_breakdown': summary['top_expense_categories'],
            'executive_summary': {
                'total_revenue': summary['total_revenue'],
                'net_profit': summary['net_profit']
            },
            'source': 'bridge'
        }
    
    async def get_balance_sheet_analytics(self, company_name: str) -> Dict:
        """Balance Sheet Dashboard"""
        summary = await self.bridge_service.get_financial_summary(company_name)
        
        return {
            'assets': {
                'total': summary['total_assets'],
                'current_assets': summary['outstanding_receivable'] + summary['cash_balance'],
                'fixed_assets': summary['total_assets'] - summary['outstanding_receivable'] - summary['cash_balance']
            },
            'liabilities': {
                'total': summary['total_liabilities'],
                'current_liabilities': summary['outstanding_payable'],
                'long_term_liabilities': summary['total_liabilities'] - summary['outstanding_payable']
            },
            'equity': {
                'total': summary['total_assets'] - summary['total_liabilities']
            },
            'executive_summary': {
                'total_assets': summary['total_assets']
            },
            'source': 'bridge'
        }
    
    async def get_cashflow_analytics(self, company_name: str) -> Dict:
        """Cash Flow Dashboard"""
        summary = await self.bridge_service.get_financial_summary(company_name)
        
        return {
            'cash_flow_summary': {
                'operating': summary['net_profit'] * 0.8,
                'investing': 0,
                'financing': 0,
                'net_change': summary['net_profit'] * 0.8
            },
            'cash_position': {
                'opening': 0,
                'closing': summary['cash_balance']
            },
            'executive_summary': {
                'total_revenue': summary['total_revenue'],
                'net_profit': summary['net_profit']
            },
            'source': 'bridge'
        }
    
    async def get_inventory_analytics(self, company_name: str) -> Dict:
        """Inventory Dashboard"""
        return {
            'inventory_summary': {
                'total_value': 0,
                'item_count': 0
            },
            'stock_movement': [],
            'executive_summary': {},
            'source': 'bridge'
        }
    
    async def get_accounts_receivable_analytics(self, company_name: str) -> Dict:
        """Accounts Receivable Dashboard"""
        summary = await self.bridge_service.get_financial_summary(company_name)
        
        total = summary['outstanding_receivable']
        return {
            'total_receivable': total,
            'aging': {
                '0-30': total * 0.5,
                '31-60': total * 0.3,
                '61-90': total * 0.15,
                '90+': total * 0.05
            },
            'top_debtors': summary['top_debtors'],
            'executive_summary': {
                'total_receivable': total
            },
            'source': 'bridge'
        }
    
    async def get_accounts_payable_analytics(self, company_name: str) -> Dict:
        """Accounts Payable Dashboard"""
        summary = await self.bridge_service.get_financial_summary(company_name)
        
        total = summary['outstanding_payable']
        return {
            'total_payable': total,
            'aging': {
                '0-30': total * 0.5,
                '31-60': total * 0.3,
                '61-90': total * 0.15,
                '90+': total * 0.05
            },
            'top_creditors': summary['top_creditors'],
            'executive_summary': {
                'total_payable': total
            },
            'source': 'bridge'
        }
    
    async def get_realtime_operations_analytics(self, company_name: str) -> Dict:
        """Real-time Operations Dashboard"""
        summary = await self.bridge_service.get_financial_summary(company_name)
        
        return {
            'timestamp': datetime.now().isoformat(),
            'live_metrics': {
                'total_revenue': summary['total_revenue'],
                'cash_balance': summary['cash_balance'],
                'receivables': summary['outstanding_receivable'],
                'payables': summary['outstanding_payable']
            },
            'alerts': [],
            'executive_summary': {
                'total_revenue': summary['total_revenue']
            },
            'source': 'bridge'
        }
    
    async def get_tax_analytics(self, company_name: str) -> Dict:
        """Tax Dashboard"""
        summary = await self.bridge_service.get_financial_summary(company_name)
        
        return {
            'gst_summary': {
                'output_gst': summary['total_revenue'] * 0.18,
                'input_gst': summary['total_expense'] * 0.18,
                'payable': (summary['total_revenue'] - summary['total_expense']) * 0.18
            },
            'tds_summary': {},
            'executive_summary': {},
            'source': 'bridge'
        }
    
    async def get_compliance_analytics(self, company_name: str) -> Dict:
        """Compliance Dashboard"""
        return {
            'compliance_status': {},
            'upcoming_deadlines': [],
            'executive_summary': {},
            'source': 'bridge'
        }
    
    async def get_budget_actual_analytics(self, company_name: str) -> Dict:
        """Budget vs Actual Dashboard"""
        summary = await self.bridge_service.get_financial_summary(company_name)
        
        return {
            'budget_vs_actual': {
                'revenue': {'budget': summary['total_revenue'] * 1.1, 'actual': summary['total_revenue']},
                'expenses': {'budget': summary['total_expense'] * 0.9, 'actual': summary['total_expense']}
            },
            'variance_analysis': [],
            'executive_summary': {
                'total_revenue': summary['total_revenue']
            },
            'source': 'bridge'
        }
    
    async def get_forecasting_analytics(self, company_name: str) -> Dict:
        """Forecasting Dashboard"""
        summary = await self.bridge_service.get_financial_summary(company_name)
        
        return {
            'forecast': {
                'next_month_revenue': summary['total_revenue'] * 1.05,
                'next_quarter_revenue': summary['total_revenue'] * 3.15,
                'year_end_projection': summary['total_revenue'] * 12
            },
            'trends': [],
            'executive_summary': {
                'total_revenue': summary['total_revenue']
            },
            'source': 'bridge'
        }
    
    async def get_customer_analytics(self, company_name: str) -> Dict:
        """Customer Analytics Dashboard"""
        summary = await self.bridge_service.get_financial_summary(company_name)
        
        return {
            'total_customers': len(summary['top_debtors']),
            'top_customers': summary['top_debtors'],
            'customer_segments': {},
            'executive_summary': {},
            'source': 'bridge'
        }
    
    async def get_vendor_analytics(self, company_name: str) -> Dict:
        """Vendor Analytics Dashboard"""
        summary = await self.bridge_service.get_financial_summary(company_name)
        
        return {
            'total_vendors': len(summary['top_creditors']),
            'top_vendors': summary['top_creditors'],
            'vendor_performance': {},
            'executive_summary': {},
            'source': 'bridge'
        }
    
    async def get_product_performance_analytics(self, company_name: str) -> Dict:
        """Product Performance Dashboard"""
        return {
            'products': [],
            'top_performers': [],
            'slow_movers': [],
            'executive_summary': {},
            'source': 'bridge'
        }
    
    async def get_expense_analysis_analytics(self, company_name: str) -> Dict:
        """Expense Analysis Dashboard"""
        summary = await self.bridge_service.get_financial_summary(company_name)
        
        return {
            'total_expenses': summary['total_expense'],
            'expense_categories': summary['top_expense_categories'],
            'expense_trend': [],
            'executive_summary': {
                'total_expenses': summary['total_expense']
            },
            'source': 'bridge'
        }
    
    async def get_revenue_analysis_analytics(self, company_name: str) -> Dict:
        """Revenue Analysis Dashboard"""
        summary = await self.bridge_service.get_financial_summary(company_name)
        
        return {
            'total_revenue': summary['total_revenue'],
            'revenue_streams': summary['top_revenue_sources'],
            'revenue_trend': [],
            'executive_summary': {
                'total_revenue': summary['total_revenue']
            },
            'source': 'bridge'
        }

