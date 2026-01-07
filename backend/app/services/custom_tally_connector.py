"""
Custom Tally Connector - EXCEPTION-FREE VERSION
Designed for Tally with 200K+ exceptions
Uses raw master data queries that DON'T trigger exception processing
"""

import requests
import xml.etree.ElementTree as ET
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
import logging
import time
import re
import threading

logger = logging.getLogger(__name__)


class CustomTallyConnector:
    """
    EXCEPTION-FREE Tally Connector
    - Fetches MASTER data only (no exception processing)
    - Uses NATIVEMETHOD queries (bypasses validation)
    - Very small, simple queries
    """
    
    _lock = threading.Lock()
    _last_time = 0
    _gap = 0.5  # 0.5 seconds between requests (reduced from 3s for faster response)
    _cache = {}

    def __init__(self, host: str = "localhost", port: int = 9000):
        # Clear cache on new instance for fresh data
        CustomTallyConnector._cache = {}
        self.host = host
        self.port = port
        self.base_url = f"http://{host}:{port}"
        logger.info(f"Exception-Free Connector: {self.base_url}")

    def test_connection(self, retries: int = 3) -> Tuple[bool, str]:
        """Simple ping test with automatic retry and port fallback"""
        # Try configured port first, then common Tally ports
        ports_to_try = [self.port]
        for p in [9000, 9999, 9001]:
            if p not in ports_to_try:
                ports_to_try.append(p)
        
        for port in ports_to_try:
            test_url = f"http://{self.host}:{port}"
            for attempt in range(retries):
                try:
                    r = requests.post(test_url, data="<ENVELOPE></ENVELOPE>", timeout=3)
                    if r.status_code == 200:
                        # Update to working port
                        if port != self.port:
                            logger.info(f"Tally found on port {port} (configured was {self.port})")
                            self.port = port
                            self.base_url = test_url
                        return True, f"Connected to Tally on port {port}"
                except requests.exceptions.Timeout:
                    if attempt < retries - 1:
                        time.sleep(0.5)
                except requests.exceptions.ConnectionError:
                    break  # Port not listening, try next port
                except Exception as e:
                    if attempt < retries - 1:
                        time.sleep(0.5)
        
        return False, "Cannot connect to Tally - Please ensure Tally is running with ODBC Server enabled"

    def _request(self, xml: str, timeout: int = 8) -> str:
        """Safe request - simplified without lock gaps for faster response"""
        try:
            r = requests.post(
                self.base_url,
                data=xml.encode('utf-8'),
                headers={'Content-Type': 'text/xml'},
                timeout=timeout
            )
            return r.text if r.status_code == 200 else ""
        except requests.exceptions.Timeout:
            logger.warning(f"Tally request timeout ({timeout}s)")
            return ""
        except Exception as e:
            logger.warning(f"Request error: {e}")
            return ""

    def _clean(self, text: str) -> str:
        """Clean XML of invalid characters"""
        if not text:
            return ""
        # Remove control chars except tab, newline, CR
        return ''.join(c for c in text if ord(c) >= 32 or c in '\t\n\r')

    def get_companies(self) -> List[Dict]:
        """Get companies - minimal query"""
        if 'companies' in self._cache:
            return self._cache['companies']
        
        # SIMPLE query - no FETCH, just TYPE
        xml = """<ENVELOPE>
<HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
<BODY><EXPORTDATA><REQUESTDESC>
<REPORTNAME>List of Companies</REPORTNAME>
</REQUESTDESC></EXPORTDATA></BODY>
</ENVELOPE>"""
        
        resp = self._request(xml, 5)
        companies = []
        
        if resp:
            resp = self._clean(resp)
            # Extract company names using regex (safer than XML parsing)
            names = re.findall(r'<SVCURRENTCOMPANY[^>]*>([^<]+)</SVCURRENTCOMPANY>', resp)
            if not names:
                names = re.findall(r'<COMPANY[^>]*>([^<]+)</COMPANY>', resp)
            if not names:
                names = re.findall(r'<NAME[^>]*>([^<]+)</NAME>', resp)
            if not names:
                names = re.findall(r'NAME="([^"]+)"', resp)
            
            for name in set(names):
                if name and name != 'Unknown' and len(name) > 1:
                    companies.append({'name': name, 'guid': None, 'financial_year_start': None, 'financial_year_end': None, 'address': None})
        
        # Fallback: Try alternate query
        if not companies:
            xml2 = """<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>CmpList</ID></HEADER><BODY><DESC><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES><TDL><TDLMESSAGE><COLLECTION NAME="CmpList"><TYPE>Company</TYPE></COLLECTION></TDLMESSAGE></TDL></DESC></BODY></ENVELOPE>"""
            resp2 = self._request(xml2, 5)
            if resp2:
                resp2 = self._clean(resp2)
                names = re.findall(r'NAME="([^"]+)"', resp2)
                for name in set(names):
                    if name and name != 'Unknown':
                        companies.append({'name': name, 'guid': None, 'financial_year_start': None, 'financial_year_end': None, 'address': None})
        
        if companies:
            self._cache['companies'] = companies
        
        return companies

    def get_ledgers(self, company_name: str, limit: Optional[int] = None, fetch_all: bool = True) -> List[Dict]:
        """
        Get ledgers using NATIVE method - NO exception processing
        This query gets raw master data without validation
        FIXED: Now properly fetches CLOSINGBALANCE using TDL FETCH
        """
        cache_key = f"led_{company_name}"
        if cache_key in self._cache:
            logger.info(f"Cache hit: {len(self._cache[cache_key])} ledgers")
            return self._cache[cache_key]
        
        ledgers = []
        
        # Method 1: TDL Collection with FETCH for closing balance (BEST METHOD)
        xml1 = f"""<ENVELOPE>
<HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>LedgerWithBalance</ID></HEADER>
<BODY><DESC>
<STATICVARIABLES>
<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
<SVCURRENTCOMPANY>{company_name}</SVCURRENTCOMPANY>
</STATICVARIABLES>
<TDL><TDLMESSAGE>
<COLLECTION NAME="LedgerWithBalance">
<TYPE>Ledger</TYPE>
<FETCH>NAME, PARENT, OPENINGBALANCE, CLOSINGBALANCE</FETCH>
</COLLECTION>
</TDLMESSAGE></TDL>
</DESC></BODY></ENVELOPE>"""
        
        logger.info("Trying TDL collection with FETCH for balances...")
        resp = self._request(xml1, 8)  # Fast timeout - fail quickly
        
        if resp:
            ledgers = self._parse_ledgers_safe(resp)
            has_balances = any(l.get('closing_balance', 0) != 0 for l in ledgers)
            logger.info(f"TDL collection: {len(ledgers)} ledgers, has_balances={has_balances}")
            
            # If we got ledgers, return immediately without fallbacks
            if len(ledgers) > 0:
                if ledgers:
                    self._cache[cache_key] = ledgers
                return ledgers
        
        # Only try Method 2 if Method 1 completely failed (no response)
        if not resp or len(ledgers) == 0:
            xml2 = f"""<ENVELOPE>
<HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
<BODY><EXPORTDATA><REQUESTDESC>
<REPORTNAME>List of Ledgers</REPORTNAME>
<STATICVARIABLES><SVCURRENTCOMPANY>{company_name}</SVCURRENTCOMPANY></STATICVARIABLES>
</REQUESTDESC></EXPORTDATA></BODY>
</ENVELOPE>"""
            
            logger.info("Trying native ledger export (fallback)...")
            resp2 = self._request(xml2, 5)  # Very fast timeout
            
            if resp2:
                ledgers = self._parse_ledgers_safe(resp2)
                logger.info(f"Native export: {len(ledgers)} ledgers")
        
        if ledgers:
            self._cache[cache_key] = ledgers
        
        logger.info(f"Total ledgers: {len(ledgers)}")
        return ledgers

    def _parse_ledgers_safe(self, xml_text: str) -> List[Dict]:
        """
        Parse ledgers using multiple methods - FIXED for Tally XML format
        Tally uses: <PARENT TYPE="String">Value</PARENT>
        """
        ledgers = []
        xml_text = self._clean(xml_text)
        
        # METHOD 1: Regex extraction (most reliable for Tally XML format)
        # Tally XML format: <LEDGER NAME="name"><PARENT TYPE="String">parent</PARENT>...
        seen_names = set()
        
        # Extract each LEDGER block
        for match in re.finditer(r'<LEDGER\s+NAME="([^"]+)"[^>]*>(.*?)</LEDGER>', xml_text, re.DOTALL | re.IGNORECASE):
            name = match.group(1).strip()
            block = match.group(2)
            
            if not name or name in seen_names or name == 'Unknown':
                continue
            seen_names.add(name)
            
            # Extract PARENT - handles TYPE="String" format
            parent_match = re.search(r'<PARENT[^>]*>([^<]+)</PARENT>', block, re.IGNORECASE)
            parent = parent_match.group(1).strip() if parent_match else ''
            
            # Extract CLOSINGBALANCE - handles TYPE="Amount" format
            cb_match = re.search(r'<CLOSINGBALANCE[^>]*>([^<]+)</CLOSINGBALANCE>', block, re.IGNORECASE)
            closing = self._parse_balance(cb_match.group(1)) if cb_match else 0.0
            
            # Extract OPENINGBALANCE - handles TYPE="Amount" format
            ob_match = re.search(r'<OPENINGBALANCE[^>]*>([^<]+)</OPENINGBALANCE>', block, re.IGNORECASE)
            opening = self._parse_balance(ob_match.group(1)) if ob_match else 0.0
            
            is_rev, is_exp = self._categorize(name, parent)
            ledgers.append({
                'name': name,
                'parent': parent,
                'guid': None,
                'opening_balance': opening,
                'closing_balance': closing,
                'is_revenue': is_rev,
                'is_expense': is_exp
            })
        
        # METHOD 2: XML parsing fallback if regex didn't work
        if len(ledgers) < 5:
            try:
                root = ET.fromstring(xml_text)
                for elem in root.iter():
                    if 'LEDGER' in elem.tag.upper():
                        name = elem.get('NAME')
                        if not name:
                            # Try to find NAME child element
                            name_elem = elem.find('NAME') or elem.find('.//NAME')
                            name = name_elem.text if name_elem is not None else None
                        
                        if name and name not in seen_names and name != 'Unknown':
                            seen_names.add(name)
                            
                            # Get PARENT (may have TYPE attribute)
                            parent_elem = elem.find('PARENT') or elem.find('.//PARENT')
                            parent = parent_elem.text.strip() if parent_elem is not None and parent_elem.text else ''
                            
                            # Get CLOSINGBALANCE (may have TYPE attribute)
                            cb_elem = elem.find('CLOSINGBALANCE') or elem.find('.//CLOSINGBALANCE')
                            closing = self._parse_balance(cb_elem.text) if cb_elem is not None and cb_elem.text else 0.0
                            
                            # Get OPENINGBALANCE
                            ob_elem = elem.find('OPENINGBALANCE') or elem.find('.//OPENINGBALANCE')
                            opening = self._parse_balance(ob_elem.text) if ob_elem is not None and ob_elem.text else 0.0
                            
                            is_rev, is_exp = self._categorize(name, parent)
                            ledgers.append({
                                'name': name, 'parent': parent, 'guid': None,
                                'opening_balance': opening, 'closing_balance': closing,
                                'is_revenue': is_rev, 'is_expense': is_exp
                            })
            except Exception as e:
                logger.debug(f"XML parsing fallback failed: {e}")
        
        # Log statistics
        with_balance = sum(1 for l in ledgers if l.get('closing_balance', 0) != 0)
        with_parent = sum(1 for l in ledgers if l.get('parent'))
        logger.info(f"Parsed {len(ledgers)} ledgers: {with_balance} with balance, {with_parent} with parent")
        
        return ledgers

    def _get_ledgers_by_groups(self, company_name: str) -> List[Dict]:
        """Fetch ledgers group by group (most safe) - LEGACY without balances"""
        return self._get_ledgers_by_groups_with_balance(company_name)
    
    def _get_ledgers_by_groups_with_balance(self, company_name: str) -> List[Dict]:
        """Fetch ledgers group by group WITH closing balances"""
        ledgers = []
        
        groups = [
            'Sundry Debtors', 'Sundry Creditors',
            'Sales Accounts', 'Purchase Accounts',
            'Direct Expenses', 'Indirect Expenses',
            'Direct Incomes', 'Indirect Incomes',
            'Bank Accounts', 'Cash-in-Hand',
            'Duties & Taxes', 'Provisions',
            'Reserves & Surplus', 'Capital Account'
        ]
        
        for grp in groups:
            time.sleep(0.5)  # Reduced delay
            # Use FETCH to get closing balance
            xml = f"""<ENVELOPE>
<HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>GrpLed</ID></HEADER>
<BODY><DESC>
<STATICVARIABLES>
<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
<SVCURRENTCOMPANY>{company_name}</SVCURRENTCOMPANY>
</STATICVARIABLES>
<TDL><TDLMESSAGE>
<COLLECTION NAME="GrpLed">
<TYPE>Ledger</TYPE>
<BELONGSTO>Yes</BELONGSTO>
<CHILDOF>{grp}</CHILDOF>
<FETCH>NAME, PARENT, CLOSINGBALANCE, OPENINGBALANCE</FETCH>
</COLLECTION>
</TDLMESSAGE></TDL>
</DESC></BODY></ENVELOPE>"""
            
            resp = self._request(xml, 10)
            if resp:
                resp = self._clean(resp)
                is_rev, is_exp = self._categorize('', grp)
                
                # Try XML parsing first for better balance extraction
                try:
                    root = ET.fromstring(resp)
                    for elem in root.iter():
                        if 'LEDGER' in elem.tag.upper():
                            name = elem.get('NAME') or elem.findtext('NAME') or elem.findtext('.//NAME')
                            if name and name not in [l['name'] for l in ledgers]:
                                closing = self._parse_balance(elem.findtext('CLOSINGBALANCE') or elem.findtext('.//CLOSINGBALANCE'))
                                opening = self._parse_balance(elem.findtext('OPENINGBALANCE') or elem.findtext('.//OPENINGBALANCE'))
                                ledgers.append({
                                    'name': name, 'parent': grp, 'guid': None,
                                    'opening_balance': opening, 'closing_balance': closing,
                                    'is_revenue': is_rev, 'is_expense': is_exp
                                })
                except:
                    # Fallback to regex
                    names = re.findall(r'NAME="([^"]+)"', resp)
                    for name in names:
                        if name and name not in [l['name'] for l in ledgers]:
                            ledgers.append({
                                'name': name, 'parent': grp, 'guid': None,
                                'opening_balance': 0.0, 'closing_balance': 0.0,
                                'is_revenue': is_rev, 'is_expense': is_exp
                            })
        
        logger.info(f"Group-by-group: {len(ledgers)} ledgers fetched")
        return ledgers

    def _parse_balance(self, text: Optional[str]) -> float:
        """Parse balance from text"""
        if not text:
            return 0.0
        try:
            clean = re.sub(r'[^\d.\-]', '', text)
            return float(clean) if clean else 0.0
        except:
            return 0.0

    def _categorize(self, name: str, parent: str) -> Tuple[bool, bool]:
        """Simple categorization"""
        text = (name + ' ' + parent).lower()
        is_rev = any(x in text for x in ['sales', 'income', 'revenue', 'receipt'])
        is_exp = any(x in text for x in ['purchase', 'expense', 'cost', 'payment'])
        return is_rev, is_exp

    def get_vouchers(self, company_name: str, from_date: str = None, to_date: str = None,
                     voucher_type: str = None, limit: int = None, fetch_all: bool = True) -> List[Dict]:
        """
        Get vouchers - MINIMAL data to avoid exception processing
        Only fetches last 7 days by default
        """
        if not to_date:
            to_date = datetime.now().strftime('%Y%m%d')
        if not from_date:
            from_date = (datetime.now() - timedelta(days=7)).strftime('%Y%m%d')
        
        cache_key = f"vch_{company_name}_{from_date}"
        if cache_key in self._cache:
            return self._cache[cache_key]
        
        vouchers = []
        
        # Very simple voucher query
        xml = f"""<ENVELOPE>
<HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
<BODY><EXPORTDATA><REQUESTDESC>
<REPORTNAME>Day Book</REPORTNAME>
<STATICVARIABLES>
<SVCURRENTCOMPANY>{company_name}</SVCURRENTCOMPANY>
<SVFROMDATE>{from_date}</SVFROMDATE>
<SVTODATE>{to_date}</SVTODATE>
</STATICVARIABLES>
</REQUESTDESC></EXPORTDATA></BODY>
</ENVELOPE>"""
        
        resp = self._request(xml, 10)
        
        if resp:
            resp = self._clean(resp)
            # Extract basic voucher info using regex
            for match in re.finditer(r'<VOUCHER[^>]*>(.*?)</VOUCHER>', resp, re.DOTALL):
                vch_text = match.group(1)
                date = re.search(r'<DATE>(\d+)</DATE>', vch_text)
                vtype = re.search(r'<VOUCHERTYPENAME>([^<]+)</VOUCHERTYPENAME>', vch_text)
                amount = re.search(r'<AMOUNT>([^<]+)</AMOUNT>', vch_text)
                
                vouchers.append({
                    'date': date.group(1) if date else '',
                    'voucher_number': '',
                    'voucher_type': vtype.group(1) if vtype else '',
                    'amount': self._parse_balance(amount.group(1) if amount else '0'),
                    'party_name': '',
                    'narration': ''
                })
                
                if len(vouchers) >= 100:  # Limit
                    break
        
        if vouchers:
            self._cache[cache_key] = vouchers
        
        return vouchers

    def get_stock_items(self, company_name: str, limit: int = None, fetch_all: bool = True) -> List[Dict]:
        """Get stock items - simple query"""
        cache_key = f"stk_{company_name}"
        if cache_key in self._cache:
            return self._cache[cache_key]
        
        items = []
        
        xml = f"""<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>StkList</ID></HEADER><BODY><DESC><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT><SVCURRENTCOMPANY>{company_name}</SVCURRENTCOMPANY></STATICVARIABLES><TDL><TDLMESSAGE><COLLECTION NAME="StkList"><TYPE>Stock Item</TYPE></COLLECTION></TDLMESSAGE></TDL></DESC></BODY></ENVELOPE>"""
        
        resp = self._request(xml, 10)
        
        if resp:
            resp = self._clean(resp)
            names = re.findall(r'NAME="([^"]+)"', resp)
            for name in set(names):
                if name:
                    items.append({
                        'name': name, 'parent': '',
                        'opening_balance': 0.0, 'closing_balance': 0.0,
                        'opening_value': 0.0, 'closing_value': 0.0
                    })
        
        if items:
            self._cache[cache_key] = items
        
        return items

    def get_financial_summary(self, company_name: str) -> Dict:
        """Get financial summary using Trial Balance report - RELIABLE method"""
        
        # Use Trial Balance report - most reliable for financial data
        xml = f"""<ENVELOPE>
<HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
<BODY><EXPORTDATA><REQUESTDESC>
<REPORTNAME>Trial Balance</REPORTNAME>
<STATICVARIABLES>
<SVCURRENTCOMPANY>{company_name}</SVCURRENTCOMPANY>
<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
</STATICVARIABLES>
</REQUESTDESC></EXPORTDATA></BODY>
</ENVELOPE>"""
        
        revenue = expense = assets = liabs = 0.0
        ledger_count = len(self.get_ledgers(company_name))
        
        resp = self._request(xml, 30)
        
        if resp:
            resp = self._clean(resp)
            
            # Parse Trial Balance - extract account groups and amounts
            # Format: <DSPACCNAME><DSPDISPNAME>Name</DSPDISPNAME></DSPACCNAME>
            #         <DSPACCINFO><DSPCLDRAMT><DSPCLDRAMTA>-amount</DSPCLDRAMTA></DSPCLDRAMT>
            #                     <DSPCLCRAMT><DSPCLCRAMTA>amount</DSPCLCRAMTA></DSPCLCRAMT></DSPACCINFO>
            
            accounts = re.findall(
                r'<DSPACCNAME>\s*<DSPDISPNAME>([^<]+)</DSPDISPNAME>\s*</DSPACCNAME>\s*'
                r'<DSPACCINFO>\s*<DSPCLDRAMT>\s*<DSPCLDRAMTA>([^<]*)</DSPCLDRAMTA>\s*</DSPCLDRAMT>\s*'
                r'<DSPCLCRAMT>\s*<DSPCLCRAMTA>([^<]*)</DSPCLCRAMTA>',
                resp, re.DOTALL
            )
            
            logger.info(f"Trial Balance: Found {len(accounts)} account groups")
            
            for name, debit, credit in accounts:
                name_lower = name.lower().strip()
                dr = abs(float(debit.replace(',', ''))) if debit.strip() else 0
                cr = abs(float(credit.replace(',', ''))) if credit.strip() else 0
                
                # Classify based on standard Tally groups
                if 'sales' in name_lower or 'income' in name_lower or 'revenue' in name_lower:
                    revenue += cr  # Sales are Credit balances
                    logger.info(f"  Revenue ({name}): {cr:,.0f}")
                elif 'purchase' in name_lower or 'expense' in name_lower or 'direct' in name_lower or 'indirect' in name_lower:
                    expense += dr  # Expenses are Debit balances
                    logger.info(f"  Expense ({name}): {dr:,.0f}")
                elif 'asset' in name_lower or 'bank' in name_lower or 'cash' in name_lower or 'debtor' in name_lower:
                    assets += cr if cr > dr else dr  # Assets typically debit
                    logger.info(f"  Asset ({name}): {max(cr, dr):,.0f}")
                elif 'liabil' in name_lower or 'creditor' in name_lower or 'loan' in name_lower or 'capital' in name_lower:
                    liabs += cr if cr > dr else dr  # Liabilities typically credit
                    logger.info(f"  Liability ({name}): {max(cr, dr):,.0f}")
                
                # Handle Current Assets and Current Liabilities specifically
                if name_lower == 'current assets':
                    assets = cr if cr > 0 else dr
                    logger.info(f"  Current Assets: {assets:,.0f}")
                elif name_lower == 'current liabilities':
                    liabs = cr if cr > 0 else dr
                    logger.info(f"  Current Liabilities: {liabs:,.0f}")
        
        # Get monthly sales data for charts
        monthly_sales = self._get_monthly_sales(company_name)
        monthly_purchases = self._get_monthly_purchases(company_name)
        
        # Create revenue/expense breakdown for charts
        revenue_breakdown = [
            {"name": "Sales Accounts", "amount": revenue}
        ]
        expense_breakdown = [
            {"name": "Purchase Accounts", "amount": expense}
        ]
        
        summary = {
            'company_name': company_name,
            'total_revenue': revenue,
            'total_expense': expense,
            'net_profit': revenue - expense,
            'total_assets': assets,
            'total_liabilities': liabs,
            'ledger_count': ledger_count,
            'monthly_sales': monthly_sales,
            'monthly_purchases': monthly_purchases,
            'revenue_breakdown': revenue_breakdown,
            'expense_breakdown': expense_breakdown
        }
        
        logger.info(f"Financial Summary for {company_name}: Revenue={revenue:,.0f}, Expense={expense:,.0f}, Assets={assets:,.0f}, Liabilities={liabs:,.0f}")
        
        return summary
    
    def _get_monthly_sales(self, company_name: str) -> List[Dict]:
        """Get monthly sales data from Sales Register report"""
        xml = f"""<ENVELOPE>
<HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
<BODY><EXPORTDATA><REQUESTDESC>
<REPORTNAME>Sales Register</REPORTNAME>
<STATICVARIABLES>
<SVCURRENTCOMPANY>{company_name}</SVCURRENTCOMPANY>
<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
</STATICVARIABLES>
</REQUESTDESC></EXPORTDATA></BODY>
</ENVELOPE>"""
        
        monthly_data = []
        resp = self._request(xml, 30)
        
        if resp:
            resp = self._clean(resp)
            # Parse monthly data
            periods = re.findall(r'<DSPPERIOD>([^<]+)</DSPPERIOD>', resp)
            # Credit amounts for sales
            amounts = re.findall(r'<DSPCRAMTA>([^<]*)</DSPCRAMTA>', resp)
            
            for i, (period, amount) in enumerate(zip(periods, amounts)):
                try:
                    amt = abs(float(amount.replace(',', ''))) if amount.strip() else 0
                    monthly_data.append({
                        "month": period,
                        "amount": amt,
                        "type": "sales"
                    })
                except:
                    continue
            
            logger.info(f"Monthly Sales: Found {len(monthly_data)} months of data")
        
        return monthly_data
    
    def _get_monthly_purchases(self, company_name: str) -> List[Dict]:
        """Get monthly purchase data from Purchase Register report"""
        xml = f"""<ENVELOPE>
<HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
<BODY><EXPORTDATA><REQUESTDESC>
<REPORTNAME>Purchase Register</REPORTNAME>
<STATICVARIABLES>
<SVCURRENTCOMPANY>{company_name}</SVCURRENTCOMPANY>
<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
</STATICVARIABLES>
</REQUESTDESC></EXPORTDATA></BODY>
</ENVELOPE>"""
        
        monthly_data = []
        resp = self._request(xml, 30)
        
        if resp:
            resp = self._clean(resp)
            periods = re.findall(r'<DSPPERIOD>([^<]+)</DSPPERIOD>', resp)
            # Debit amounts for purchases
            amounts = re.findall(r'<DSPDRAMTA>([^<]*)</DSPDRAMTA>', resp)
            
            for period, amount in zip(periods, amounts):
                try:
                    amt = abs(float(amount.replace(',', ''))) if amount.strip() else 0
                    monthly_data.append({
                        "month": period,
                        "amount": amt,
                        "type": "purchase"
                    })
                except:
                    continue
            
            logger.info(f"Monthly Purchases: Found {len(monthly_data)} months of data")
        
        return monthly_data
