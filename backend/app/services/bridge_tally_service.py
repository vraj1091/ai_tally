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
    
    def _sanitize_xml(self, xml_content: str) -> str:
        """
        Sanitize XML content by removing invalid characters
        Tally exports can contain control characters and invalid XML entities
        """
        if not xml_content:
            return xml_content
        
        # Remove control characters (except tab, newline, carriage return)
        # XML 1.0 only allows: #x9 | #xA | #xD | [#x20-#xD7FF] | [#xE000-#xFFFD]
        def valid_xml_char(char):
            codepoint = ord(char)
            return (
                codepoint == 0x9 or
                codepoint == 0xA or
                codepoint == 0xD or
                (0x20 <= codepoint <= 0xD7FF) or
                (0xE000 <= codepoint <= 0xFFFD) or
                (0x10000 <= codepoint <= 0x10FFFF)
            )
        
        # Filter invalid characters
        cleaned = ''.join(char for char in xml_content if valid_xml_char(char))
        
        # Also fix common invalid entities like &#1; &#2; etc
        cleaned = re.sub(r'&#([0-8]|1[0-9]|2[0-9]|3[01]);', '', cleaned)
        
        return cleaned
    
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
            
            # Sanitize XML to remove invalid characters
            sanitized = self._sanitize_xml(response)
            logger.info(f"Sanitized XML: {len(sanitized)} bytes")
            
            try:
                root = ET.fromstring(sanitized)
                
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
                matches1 = re.findall(pattern1, sanitized, re.DOTALL | re.IGNORECASE)
                
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
                    names = re.findall(r'<NAME>([^<]+)</NAME>', sanitized)
                    parents = re.findall(r'<PARENT>([^<]*)</PARENT>', sanitized)
                    closings = re.findall(r'<CLOSINGBALANCE>([^<]*)</CLOSINGBALANCE>', sanitized)
                    
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
    
    async def get_stock_items(self, company_name: str) -> List[Dict]:
        """Get all stock items for a company"""
        xml_request = f"""<ENVELOPE>
<HEADER>
<VERSION>1</VERSION>
<TALLYREQUEST>Export</TALLYREQUEST>
<TYPE>Collection</TYPE>
<ID>StockItemCollection</ID>
</HEADER>
<BODY>
<DESC>
<STATICVARIABLES>
<SVCURRENTCOMPANY>{company_name}</SVCURRENTCOMPANY>
<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
</STATICVARIABLES>
<TDL>
<TDLMESSAGE>
<COLLECTION NAME="StockItemCollection">
<TYPE>StockItem</TYPE>
<FETCH>NAME, PARENT, BASEUNITS, OPENINGBALANCE, CLOSINGBALANCE, CLOSINGVALUE, CLOSINGRATE</FETCH>
</COLLECTION>
</TDLMESSAGE>
</TDL>
</DESC>
</BODY>
</ENVELOPE>"""
        
        response = await self._send_tally_request(xml_request, timeout=60)
        stock_items = []
        
        if response:
            logger.info(f"Stock items response size: {len(response)} bytes")
            
            try:
                # Sanitize and parse XML
                sanitized = self._sanitize_xml(response)
                root = ET.fromstring(sanitized)
                
                # Find stock items
                for item in root.findall('.//STOCKITEM'):
                    name = item.get('NAME') or ''
                    if not name:
                        name_el = item.find('NAME')
                        name = name_el.text if name_el is not None else ''
                    
                    parent_el = item.find('PARENT')
                    parent = parent_el.text if parent_el is not None else ''
                    
                    unit_el = item.find('BASEUNITS')
                    unit = unit_el.text if unit_el is not None else ''
                    
                    # Get closing balance (quantity)
                    closing_bal_el = item.find('CLOSINGBALANCE')
                    closing_qty = 0
                    if closing_bal_el is not None and closing_bal_el.text:
                        try:
                            closing_qty = float(closing_bal_el.text.split()[0].replace(',', ''))
                        except:
                            pass
                    
                    # Get closing value (monetary)
                    closing_val_el = item.find('CLOSINGVALUE')
                    closing_value = 0
                    if closing_val_el is not None and closing_val_el.text:
                        try:
                            closing_value = abs(float(closing_val_el.text.replace(',', '')))
                        except:
                            pass
                    
                    # Get rate
                    rate_el = item.find('CLOSINGRATE')
                    rate = 0
                    if rate_el is not None and rate_el.text:
                        try:
                            rate = float(rate_el.text.split()[0].replace(',', ''))
                        except:
                            pass
                    
                    if name:
                        stock_items.append({
                            'name': name.strip(),
                            'parent': parent.strip() if parent else '',
                            'unit': unit.strip() if unit else '',
                            'closing_quantity': closing_qty,
                            'closing_value': closing_value,
                            'rate': rate
                        })
                
                logger.info(f"Parsed {len(stock_items)} stock items")
            except Exception as e:
                logger.error(f"Error parsing stock items: {e}")
                # Try regex fallback
                names = re.findall(r'<STOCKITEM[^>]*NAME="([^"]+)"', response)
                for name in names:
                    stock_items.append({'name': name, 'parent': '', 'unit': '', 'closing_quantity': 0, 'closing_value': 0, 'rate': 0})
        
        return stock_items
    
    async def get_vouchers(self, company_name: str, limit: int = 100, days: int = 90) -> List[Dict]:
        """
        Get recent vouchers for a company (last N days only to avoid huge data)
        Default: last 90 days to keep data size manageable
        """
        from datetime import datetime, timedelta
        
        # Calculate date range - last N days only
        to_date = datetime.now()
        from_date = to_date - timedelta(days=days)
        
        # Format dates for Tally (YYYYMMDD)
        from_str = from_date.strftime('%Y%m%d')
        to_str = to_date.strftime('%Y%m%d')
        
        logger.info(f"Fetching vouchers from {from_str} to {to_str} (last {days} days)")
        
        xml_request = f"""<ENVELOPE>
            <HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>Recent Vouchers</ID></HEADER>
            <BODY><DESC><STATICVARIABLES>
                <SVCURRENTCOMPANY>{company_name}</SVCURRENTCOMPANY>
                <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                <SVFROMDATE>{from_str}</SVFROMDATE>
                <SVTODATE>{to_str}</SVTODATE>
            </STATICVARIABLES>
            <TDL><TDLMESSAGE>
                <COLLECTION NAME="Recent Vouchers">
                    <TYPE>Voucher</TYPE>
                    <FETCH>DATE, VOUCHERTYPENAME, VOUCHERNUMBER, PARTYLEDGERNAME, AMOUNT</FETCH>
                </COLLECTION>
            </TDLMESSAGE></TDL></DESC></BODY></ENVELOPE>"""
        
        response = await self._send_tally_request(xml_request, timeout=30)  # Very short timeout - vouchers are optional
        vouchers = []
        
        if response:
            logger.info(f"Voucher response size: {len(response)} bytes")
            
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
            
            logger.info(f"Parsed {len(vouchers)} vouchers (from {len(dates)} total)")
        
        return vouchers
    
    async def get_all_vouchers(self, company_name: str, limit: int = 10000) -> List[Dict]:
        """
        Get ALL vouchers for a company (no date filter)
        Uses longer timeout since this can return 100+ MB of data
        """
        logger.info(f"Fetching ALL vouchers for {company_name} (this may take several minutes)...")
        
        xml_request = f"""<ENVELOPE>
            <HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>All Vouchers</ID></HEADER>
            <BODY><DESC><STATICVARIABLES>
                <SVCURRENTCOMPANY>{company_name}</SVCURRENTCOMPANY>
                <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
            </STATICVARIABLES>
            <TDL><TDLMESSAGE>
                <COLLECTION NAME="All Vouchers">
                    <TYPE>Voucher</TYPE>
                    <FETCH>DATE, VOUCHERTYPENAME, VOUCHERNUMBER, PARTYLEDGERNAME, AMOUNT</FETCH>
                </COLLECTION>
            </TDLMESSAGE></TDL></DESC></BODY></ENVELOPE>"""
        
        # Very long timeout for full data (10 minutes)
        response = await self._send_tally_request(xml_request, timeout=600)
        vouchers = []
        
        if response:
            size_mb = len(response) / 1024 / 1024
            logger.info(f"All vouchers response size: {len(response)} bytes ({size_mb:.2f} MB)")
            
            # For very large responses (>50MB), use fast parsing to avoid memory issues
            if size_mb > 50:
                logger.warning(f"Large voucher data ({size_mb:.1f}MB) - using fast streaming parse")
                # Count vouchers quickly without full regex
                voucher_count = response.count('<VOUCHER')
                logger.info(f"Found approximately {voucher_count} vouchers in large dataset")
                
                # Extract just a sample for analytics (first 5000 vouchers worth)
                # Find first N voucher blocks
                sample_size = min(5000, voucher_count)
                
                # Fast extraction using simple string operations
                dates = []
                types = []
                amounts = []
                
                # Parse in chunks to avoid memory explosion
                pos = 0
                parsed = 0
                while parsed < sample_size and pos < len(response):
                    # Find next VOUCHER tag
                    voucher_start = response.find('<VOUCHER', pos)
                    if voucher_start == -1:
                        break
                    voucher_end = response.find('</VOUCHER>', voucher_start)
                    if voucher_end == -1:
                        voucher_end = response.find('/>', voucher_start) + 2
                    if voucher_end <= voucher_start:
                        break
                    
                    voucher_xml = response[voucher_start:voucher_end + 10]
                    
                    # Extract date
                    date_match = re.search(r'<DATE>([^<]+)</DATE>', voucher_xml)
                    if not date_match:
                        date_match = re.search(r'DATE="([^"]+)"', voucher_xml)
                    if date_match:
                        dates.append(date_match.group(1))
                    
                    # Extract type
                    type_match = re.search(r'<VOUCHERTYPENAME>([^<]+)</VOUCHERTYPENAME>', voucher_xml)
                    if not type_match:
                        type_match = re.search(r'VOUCHERTYPENAME="([^"]+)"', voucher_xml)
                    if type_match:
                        types.append(type_match.group(1))
                    
                    # Extract amount
                    amt_match = re.search(r'<AMOUNT>([^<]+)</AMOUNT>', voucher_xml)
                    if not amt_match:
                        amt_match = re.search(r'AMOUNT="([^"]+)"', voucher_xml)
                    if amt_match:
                        amounts.append(amt_match.group(1))
                    
                    pos = voucher_end + 10
                    parsed += 1
                    
                    # Log progress every 1000 vouchers
                    if parsed % 1000 == 0:
                        logger.info(f"Parsed {parsed}/{sample_size} vouchers...")
                
                logger.info(f"Fast parse complete: {len(dates)} dates, {len(types)} types, {len(amounts)} amounts")
            else:
                # Normal parsing for smaller responses
                # Sanitize XML first
                response = self._sanitize_xml(response)
                
                # Try multiple XML formats that Tally uses
                dates = re.findall(r'<DATE>([^<]+)</DATE>', response)
                if not dates:
                    dates = re.findall(r'<VOUCHER[^>]*\bDATE="([^"]+)"', response)
                
                types = re.findall(r'<VOUCHERTYPENAME>([^<]+)</VOUCHERTYPENAME>', response)
                if not types:
                    types = re.findall(r'VOUCHERTYPENAME="([^"]+)"', response)
                
                amounts = re.findall(r'<AMOUNT>([^<]+)</AMOUNT>', response)
                if not amounts:
                    amounts = re.findall(r'AMOUNT="([^"]+)"', response)
                
                logger.info(f"Found {len(dates)} voucher dates, {len(types)} types, {len(amounts)} amounts")
            
            # Build voucher list
            max_count = max(len(dates), len(types), len(amounts))
            logger.info(f"Building voucher list from {max_count} entries (limit={limit})...")
            
            for i in range(min(max_count, limit)):
                vouchers.append({
                    'date': dates[i] if i < len(dates) else '',
                    'type': types[i] if i < len(types) else '',
                    'amount': self._parse_amount(amounts[i]) if i < len(amounts) else 0
                })
            
            logger.info(f"✅ Parsed {len(vouchers)} vouchers successfully")
        
        return vouchers
    
    def _categorize_ledger(self, name: str, parent: str) -> str:
        """Categorize ledger based on name and parent group"""
        name_lower = name.lower()
        parent_lower = parent.lower()
        combined = f"{name_lower} {parent_lower}"
        
        # Revenue patterns (check both name and parent)
        revenue_patterns = ['sales', 'income', 'revenue', 'receipts', 'service income', 
                           'commission received', 'interest received', 'discount received']
        if any(p in combined for p in revenue_patterns):
            return 'revenue'
        
        # Expense patterns
        expense_patterns = ['expense', 'purchase', 'salary', 'wages', 'rent', 'electricity',
                           'telephone', 'traveling', 'conveyance', 'printing', 'stationery',
                           'advertisement', 'depreciation', 'insurance', 'repairs', 'maintenance',
                           'commission paid', 'interest paid', 'discount allowed', 'freight',
                           'carriage', 'postage', 'courier', 'legal', 'audit', 'professional']
        if any(p in combined for p in expense_patterns):
            return 'expense'
        
        # Debtor patterns (Accounts Receivable)
        debtor_patterns = ['sundry debtor', 'debtor', 'receivable', 'customer']
        if any(p in combined for p in debtor_patterns):
            return 'debtor'
        
        # Creditor patterns (Accounts Payable)
        creditor_patterns = ['sundry creditor', 'creditor', 'payable', 'supplier', 'vendor']
        if any(p in combined for p in creditor_patterns):
            return 'creditor'
        
        # Cash/Bank patterns
        cash_patterns = ['cash', 'bank', 'petty cash']
        if any(p in combined for p in cash_patterns):
            return 'cash_bank'
        
        # Asset patterns
        asset_patterns = ['asset', 'furniture', 'computer', 'vehicle', 'machinery', 'equipment',
                         'building', 'land', 'stock', 'inventory', 'investment', 'fixed asset',
                         'current asset', 'loan given', 'advance', 'prepaid', 'deposit given']
        if any(p in combined for p in asset_patterns):
            return 'asset'
        
        # Liability patterns
        liability_patterns = ['liabilit', 'capital', 'reserve', 'loan taken', 'secured loan',
                             'unsecured loan', 'provision', 'deposit received', 'outstanding']
        if any(p in combined for p in liability_patterns):
            return 'liability'
        
        return 'other'
    
    async def get_financial_summary(self, company_name: str) -> Dict:
        """
        Get financial summary by analyzing ledgers
        This is the key method that provides data for all dashboards
        """
        ledgers = await self.get_ledgers(company_name)
        logger.info(f"Financial summary for {company_name}: processing {len(ledgers)} ledgers")
        
        # Initialize counters
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
        asset_items = []
        liability_items = []
        
        # Track categories for debugging
        category_counts = {'revenue': 0, 'expense': 0, 'debtor': 0, 'creditor': 0, 
                          'cash_bank': 0, 'asset': 0, 'liability': 0, 'other': 0}
        
        for ledger in ledgers:
            parent = ledger.get('parent') or ''
            closing = ledger.get('closing_balance', 0)
            name = ledger.get('name', '')
            
            if not name or closing == 0:
                continue
            
            category = self._categorize_ledger(name, parent)
            category_counts[category] = category_counts.get(category, 0) + 1
            
            abs_closing = abs(closing)
            
            if category == 'revenue':
                revenue += abs_closing
                revenue_items.append({'name': name, 'amount': abs_closing})
            elif category == 'expense':
                expenses += abs_closing
                expense_items.append({'name': name, 'amount': abs_closing})
            elif category == 'debtor':
                receivables += abs_closing
                debtor_items.append({'name': name, 'amount': abs_closing})
                assets += abs_closing  # Debtors are current assets
                asset_items.append({'name': name, 'amount': abs_closing, 'type': 'Current'})
            elif category == 'creditor':
                payables += abs_closing
                creditor_items.append({'name': name, 'amount': abs_closing})
                liabilities += abs_closing  # Creditors are current liabilities
                liability_items.append({'name': name, 'amount': abs_closing, 'type': 'Current'})
            elif category == 'cash_bank':
                cash_bank += closing  # Cash can be positive or negative
                assets += abs_closing
                asset_items.append({'name': name, 'amount': abs_closing, 'type': 'Current'})
            elif category == 'asset':
                assets += abs_closing
                asset_items.append({'name': name, 'amount': abs_closing, 'type': 'Fixed'})
            elif category == 'liability':
                liabilities += abs_closing
                liability_items.append({'name': name, 'amount': abs_closing, 'type': 'Long-term'})
        
        # Log category distribution
        logger.info(f"Ledger categorization: {category_counts}")
        
        # Sort by amount
        revenue_items.sort(key=lambda x: x['amount'], reverse=True)
        expense_items.sort(key=lambda x: x['amount'], reverse=True)
        debtor_items.sort(key=lambda x: x['amount'], reverse=True)
        creditor_items.sort(key=lambda x: x['amount'], reverse=True)
        asset_items.sort(key=lambda x: x['amount'], reverse=True)
        liability_items.sort(key=lambda x: x['amount'], reverse=True)
        
        net_profit = revenue - expenses
        profit_margin = (net_profit / revenue * 100) if revenue > 0 else 0
        equity = assets - liabilities
        
        # Calculate ratios
        current_ratio = receivables / payables if payables > 0 else 0
        
        logger.info(f"Summary: revenue={revenue:.2f}, expenses={expenses:.2f}, assets={assets:.2f}, liabilities={liabilities:.2f}")
        
        return {
            'total_revenue': revenue,
            'total_expense': expenses,
            'net_profit': net_profit,
            'profit_margin': profit_margin,
            'total_assets': assets,
            'total_liabilities': liabilities,
            'total_equity': equity,
            'outstanding_receivable': receivables,
            'outstanding_payable': payables,
            'cash_balance': cash_bank,
            'bank_balance': 0,
            'current_ratio': current_ratio,
            'top_revenue_sources': revenue_items[:10],
            'top_expense_categories': expense_items[:10],
            'top_debtors': debtor_items[:10],
            'top_creditors': creditor_items[:10],
            'top_assets': asset_items[:10],
            'top_liabilities': liability_items[:10],
            'ledger_count': len(ledgers),
            'category_distribution': category_counts,
            'source': 'bridge'
        }
    
    async def get_all_company_data(self, company_name: str, include_vouchers: bool = False) -> Dict:
        """
        Get comprehensive company data - main method for dashboard analytics
        Returns data in the SAME format as TallyDataService.get_all_company_data()
        
        Format required by SpecializedAnalytics:
        {
            "ledgers": [...],
            "vouchers": [...],
            "summary": {...},
            "stock_items": [...]
        }
        
        Args:
            company_name: Name of the company to fetch data for
            include_vouchers: If True, fetch all vouchers (slow, 165MB+). 
                              Default False for fast dashboard loading.
        """
        logger.info(f"Bridge: Fetching all company data for {company_name} (vouchers={include_vouchers})")
        
        # Fetch ledgers first - this is the critical data for all dashboards
        ledgers = await self.get_ledgers(company_name)
        logger.info(f"Bridge: Got {len(ledgers)} ledgers for {company_name}")
        
        # Fetch groups (small, fast)
        groups = await self.get_groups(company_name)
        logger.info(f"Bridge: Got {len(groups)} groups for {company_name}")
        
        # Fetch vouchers if requested (default True for full data)
        vouchers = []
        if include_vouchers:
            try:
                logger.info(f"Bridge: Fetching ALL vouchers (this may take 1-2 minutes for large datasets)...")
                vouchers = await self.get_all_vouchers(company_name)
                logger.info(f"Bridge: Got {len(vouchers)} vouchers for {company_name}")
            except Exception as e:
                logger.warning(f"Bridge: Voucher fetch failed: {e}")
                # Continue without vouchers - ledgers are enough for most dashboards
        else:
            logger.info(f"Bridge: Skipping vouchers (include_vouchers=False)")
        
        # Fetch stock items for inventory dashboard
        stock_items = []
        try:
            stock_items = await self.get_stock_items(company_name)
            logger.info(f"Bridge: Got {len(stock_items)} stock items for {company_name}")
        except Exception as e:
            logger.warning(f"Bridge: Stock items fetch failed: {e}")
        
        logger.info(f"Bridge: Got {len(ledgers)} ledgers, {len(vouchers)} vouchers, {len(groups)} groups, {len(stock_items)} stock items")
        
        # Build summary from ledgers (same structure as TallyDataService)
        summary = self._build_summary_from_ledgers(ledgers, vouchers)
        
        # Add stock summary
        total_stock_value = sum(item.get('closing_value', 0) for item in stock_items)
        summary['total_stock_items'] = len(stock_items)
        summary['total_stock_value'] = total_stock_value
        
        # Return in EXACT same format as TallyDataService
        return {
            "ledgers": ledgers,
            "vouchers": vouchers,
            "summary": summary,
            "stock_items": stock_items,
            "groups": groups,
            "source": "bridge"
        }
    
    def _build_summary_from_ledgers(self, ledgers: List[Dict], vouchers: List[Dict]) -> Dict:
        """Build financial summary from ledgers - EXACT same format as TallyDataService._calculate_summary_from_backup_data"""
        
        total_ledgers = len(ledgers)
        total_vouchers = len(vouchers)
        
        # Initialize accumulators
        total_revenue = 0.0
        total_expense = 0.0
        total_assets = 0.0
        total_liabilities = 0.0
        total_debit = 0.0
        total_credit = 0.0
        sundry_debtors = 0.0
        sundry_creditors = 0.0
        cash_balance = 0.0
        bank_balance = 0.0
        
        # Keywords for classification (same as backup mode)
        revenue_keywords = ['sales accounts', 'sales', 'direct incomes', 'indirect incomes', 
                           'income', 'revenue', 'other income', 'service income', 
                           'commission received', 'discount received', 'incomes']
        expense_keywords = ['purchase accounts', 'purchases', 'direct expenses', 'indirect expenses',
                           'expense', 'expenses', 'cost', 'salary', 'rent', 'wages',
                           'administrative expenses', 'selling expenses', 'manufacturing expenses']
        asset_keywords = ['current assets', 'fixed assets', 'investments', 'bank accounts', 
                         'bank', 'cash-in-hand', 'cash', 'sundry debtors', 'debtors',
                         'stock-in-hand', 'deposits', 'loans and advances', 'assets']
        liability_keywords = ['current liabilities', 'liabilities', 'loans (liability)', 
                             'sundry creditors', 'creditors', 'duties and taxes', 
                             'provisions', 'secured loans', 'unsecured loans', 
                             'bank od', 'overdraft', 'payable', 'loan']
        
        for ledger in ledgers:
            name = (ledger.get('name') or '').lower()
            parent = (ledger.get('parent') or '').lower()
            
            # Get balance with proper sign handling
            closing = ledger.get('closing_balance', 0)
            if closing is None:
                closing = ledger.get('balance', 0) or 0
            if isinstance(closing, str):
                is_credit = 'Cr' in closing or 'cr' in closing
                cleaned = closing.replace('₹', '').replace(',', '').replace('Dr', '').replace('Cr', '').replace('dr', '').replace('cr', '').strip()
                try:
                    closing = float(cleaned) if cleaned else 0
                    if is_credit:
                        closing = -abs(closing)
                except:
                    closing = 0
            
            abs_closing = abs(closing) if closing else 0
            
            # Track debit/credit totals
            if closing > 0:
                total_debit += closing
            elif closing < 0:
                total_credit += abs(closing)
            
            # Revenue classification
            if any(kw in parent or kw in name for kw in revenue_keywords):
                total_revenue += abs_closing
            
            # Expense classification
            elif any(kw in parent or kw in name for kw in expense_keywords):
                total_expense += abs_closing
            
            # Asset classification
            if any(kw in parent or kw in name for kw in asset_keywords):
                total_assets += abs_closing
                # Specific asset types
                if 'sundry debtor' in parent or 'debtor' in parent:
                    sundry_debtors += abs_closing
                elif 'cash' in name or 'cash-in-hand' in parent:
                    cash_balance += abs_closing
                elif 'bank' in name or 'bank account' in parent:
                    bank_balance += abs_closing
            
            # Liability classification
            if any(kw in parent or kw in name for kw in liability_keywords):
                total_liabilities += abs_closing
                if 'sundry creditor' in parent or 'creditor' in parent:
                    sundry_creditors += abs_closing
        
        # Calculate derived values
        net_profit = total_revenue - total_expense
        profit_margin = (net_profit / total_revenue * 100) if total_revenue > 0 else 0
        total_equity = total_assets - total_liabilities
        net_balance = total_debit - total_credit
        
        # Health score calculation (same as backup mode)
        health_score = 0
        if total_revenue > 0:
            if profit_margin > 20:
                health_score = 90
            elif profit_margin > 10:
                health_score = 75
            elif profit_margin > 0:
                health_score = 60
            else:
                health_score = 40
        else:
            health_score = 30
        
        health_status = "Excellent" if health_score >= 80 else "Good" if health_score >= 60 else "Fair" if health_score >= 40 else "Poor"
        
        logger.info(f"Bridge summary: revenue={total_revenue}, expense={total_expense}, profit={net_profit}, assets={total_assets}, liabilities={total_liabilities}")
        
        # Return in EXACT same format as TallyDataService._calculate_summary_from_backup_data
        return {
            "total_ledgers": total_ledgers,
            "total_vouchers": total_vouchers,
            "total_stock_items": 0,  # Stock not fetched via bridge
            "total_inventory_value": 0.0,
            "total_debit": total_debit,
            "total_credit": total_credit,
            "net_balance": net_balance,
            "total_revenue": total_revenue,
            "total_expense": total_expense,
            "net_profit": net_profit,
            "profit_margin": profit_margin,
            "total_assets": total_assets,
            "total_liabilities": total_liabilities,
            "total_equity": total_equity,
            "health_score": health_score,
            "health_status": health_status,
            # Additional fields for compatibility
            "sundry_debtors": sundry_debtors,
            "sundry_creditors": sundry_creditors,
            "outstanding_receivable": sundry_debtors,
            "outstanding_payable": sundry_creditors,
            "cash_balance": cash_balance,
            "bank_balance": bank_balance,
            "sales": total_revenue,
            "purchases": total_expense * 0.7,  # Estimate purchases as 70% of expenses
            "source": "bridge"
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
        
        revenue = summary['total_revenue']
        expense = summary['total_expense']
        profit = summary['net_profit']
        
        # Get counts from category distribution
        category_dist = summary.get('category_distribution', {})
        customer_count = category_dist.get('debtor', 0) or len(summary['top_debtors'])
        vendor_count = category_dist.get('creditor', 0) or len(summary['top_creditors'])
        
        # Estimate transaction count from vouchers or ledger activity
        transaction_count = summary['ledger_count'] * 10  # Rough estimate
        
        return {
            'revenue': revenue,
            'expense': expense,
            'profit': profit,
            'profit_margin': summary['profit_margin'],
            'revenue_growth': 0,
            'expense_ratio': (expense / revenue * 100) if revenue > 0 else 0,
            'key_metrics': {
                'total_ledgers': summary['ledger_count'],
                'active_customers': customer_count,
                'active_vendors': vendor_count,
                'active_products': 0,  # Would need stock data
                'transaction_volume': transaction_count,
                'avg_transaction_value': revenue / transaction_count if transaction_count > 0 else 0,
                'outstanding_receivable': summary['outstanding_receivable'],
                'outstanding_payable': summary['outstanding_payable'],
                'cash_balance': summary['cash_balance'],
                'bank_balance': summary['bank_balance']
            },
            'top_revenue_sources': summary['top_revenue_sources'][:5],
            'top_expense_categories': summary['top_expense_categories'][:5],
            'top_5_revenue_sources': summary['top_revenue_sources'][:5],
            'top_5_expense_categories': summary['top_expense_categories'][:5],
            'top_customers': summary['top_debtors'][:5],
            'top_vendors': summary['top_creditors'][:5],
            'monthly_trend': [],
            'revenue_vs_expense': [
                {'category': 'Revenue', 'value': revenue},
                {'category': 'Expense', 'value': expense},
                {'category': 'Profit', 'value': profit}
            ],
            'executive_summary': {
                'total_revenue': revenue,
                'net_profit': profit,
                'profit_margin': summary['profit_margin'],
                'total_assets': summary['total_assets'],
                'customer_count': customer_count
            },
            'source': 'bridge'
        }
    
    async def get_cfo_analytics(self, company_name: str) -> Dict:
        """CFO Dashboard - Financial Health"""
        summary = await self.bridge_service.get_financial_summary(company_name)
        
        assets = summary['total_assets']
        liabilities = summary['total_liabilities']
        equity = summary.get('total_equity', assets - liabilities)
        receivables = summary['outstanding_receivable']
        payables = summary['outstanding_payable']
        revenue = summary['total_revenue']
        profit = summary['net_profit']
        
        # Calculate financial ratios
        current_ratio = receivables / payables if payables > 0 else 0
        quick_ratio = (receivables + summary['cash_balance']) / payables if payables > 0 else 0
        debt_to_equity = liabilities / equity if equity > 0 else 0
        roa = (profit / assets * 100) if assets > 0 else 0
        roe = (profit / equity * 100) if equity > 0 else 0
        
        return {
            'total_assets': assets,
            'total_liabilities': liabilities,
            'total_equity': equity,
            'financial_health': {
                'total_revenue': revenue,
                'total_expenses': summary['total_expense'],
                'net_profit': profit,
                'profit_margin': summary['profit_margin']
            },
            'balance_sheet_summary': {
                'total_assets': assets,
                'total_liabilities': liabilities,
                'net_worth': equity,
                'asset_breakdown': summary.get('top_assets', [])[:5],
                'liability_breakdown': summary.get('top_liabilities', [])[:5]
            },
            'cash_position': {
                'cash_balance': summary['cash_balance'],
                'receivables': receivables,
                'payables': payables
            },
            'financial_ratios': {
                'current_ratio': round(current_ratio, 2),
                'quick_ratio': round(quick_ratio, 2),
                'debt_to_equity': round(debt_to_equity, 2),
                'roa': round(roa, 2),
                'roe': round(roe, 2)
            },
            'working_capital': receivables - payables,
            'executive_summary': {
                'total_revenue': revenue,
                'net_profit': profit,
                'total_assets': assets
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

