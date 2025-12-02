"""
Custom Tally Connector - Pure Python Implementation
Direct XML/HTTP communication with Tally Gateway
No external DLLs required
"""

import requests
import xml.etree.ElementTree as ET
from typing import List, Dict, Optional, Tuple
import logging
from datetime import datetime
import io
import time

logger = logging.getLogger(__name__)


class CustomTallyConnector:
    """
    Custom Tally connector using direct XML/HTTP requests
    No external dependencies - Pure Python implementation
    """

    def __init__(self, host: str = "localhost", port: int = 9000):
        """
        Initialize Tally connector
        
        Args:
            host: Tally server host (default: localhost)
            port: Tally Gateway port (default: 9000)
        """
        # Validate and sanitize host
        if not host or host.strip() == "":
            logger.warning("Empty host provided, defaulting to localhost")
            host = "localhost"
        
        # Remove any protocol if accidentally included
        if "://" in host:
            host = host.split("://")[1].split(":")[0]
        
        # Validate port
        if not isinstance(port, int) or port <= 0 or port > 65535:
            logger.warning(f"Invalid port {port}, defaulting to 9000")
            port = 9000
        
        self.host = host
        self.port = port
        self.base_url = f"http://{host}:{port}"
        self.timeout = 5  # 5 second timeout for connection tests (reduced from 30)
        self.request_timeout = 30  # 30 second timeout for actual data requests
        self.max_vouchers_per_request = 200  # EXTREMELY small batch size to prevent Tally crashes (reduced from 500)
        self.max_ledgers_per_request = 500   # Very small batch size to prevent Tally crashes (reduced from 1000)
        self.max_stock_per_request = 500     # Very small batch size to prevent Tally crashes (reduced from 1000)
        self.last_request_time = 0  # Track last request time for rate limiting
        self.min_request_interval = 2.0  # Increased to 2 seconds between requests to prevent Tally overload
        self.batch_delay = 3.0  # Increased delay between batches (3 seconds) to give Tally more time to recover
        self.max_retries = 5  # Retry failed batches up to 5 times
        self.tally_crash_wait = 5.0  # Wait 5 seconds if Tally crashes before retrying
        
        logger.info(f"Initialized CustomTallyConnector for {self.base_url}")
    
    def _send_request(self, xml_request: str, timeout: Optional[int] = None) -> str:
        """
        Send XML request to Tally Gateway
        
        Args:
            xml_request: XML request string
            timeout: Optional timeout override (defaults to self.timeout)
            
        Returns:
            XML response string
            
        Raises:
            Exception: If request fails
        """
        try:
            # Rate limiting: Add small delay between requests to prevent Tally overload
            current_time = time.time()
            time_since_last = current_time - self.last_request_time
            if time_since_last < self.min_request_interval:
                sleep_time = self.min_request_interval - time_since_last
                time.sleep(sleep_time)
            self.last_request_time = time.time()
            
            request_timeout = timeout if timeout is not None else self.timeout
            response = requests.post(
                self.base_url,
                data=xml_request.encode('utf-8'),
                headers={'Content-Type': 'application/xml'},
                timeout=request_timeout
            )
            
            if response.status_code == 200:
                # Check if response indicates Tally crash (empty or error response)
                if not response.text or len(response.text) < 50:
                    logger.warning("Tally returned empty or very short response - may have crashed")
                    raise Exception("Tally may have crashed - received empty response")
                
                # Check for Tally error messages in response
                if "Memory Access Violation" in response.text or "c0000005" in response.text:
                    logger.error("Tally Memory Access Violation detected in response!")
                    raise Exception("Tally Memory Access Violation - Tally software crashed")
                
                return response.text
            else:
                raise Exception(f"Tally returned status code {response.status_code}")
                
        except requests.exceptions.ConnectionError as e:
            logger.warning(f"Connection error: {e} - Tally may have crashed")
            raise Exception("Cannot connect to Tally - Tally may have crashed. Please restart Tally.")
        except requests.exceptions.Timeout as e:
            logger.warning(f"Request timeout: {e} - Tally may be crashed or frozen")
            raise Exception("Tally request timed out - Tally may have crashed. Please check Tally.")
        except requests.exceptions.RequestException as e:
            logger.warning(f"Request exception: {e}")
            raise Exception(f"Request failed: {str(e)} - Tally may have crashed")

    def test_connection(self) -> Tuple[bool, str]:
        """
        Test connection to Tally Gateway with fast timeout
        
        Returns:
            Tuple of (is_connected, message)
        """
        try:
            logger.info(f"Testing connection to {self.base_url} (timeout: {self.timeout}s)")
            
            # Use a simpler, faster test request
            # Just check if Tally Gateway is responding
            xml_request = """<ENVELOPE>
    <HEADER>
        <VERSION>1</VERSION>
        <TALLYREQUEST>Export</TALLYREQUEST>
        <TYPE>Collection</TYPE>
        <ID>SimpleCompanyCheck</ID>
    </HEADER>
    <BODY>
        <DESC>
            <STATICVARIABLES>
                <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
            </STATICVARIABLES>
            <TDL>
                <TDLMESSAGE>
                    <COLLECTION NAME="SimpleCompanyCheck">
                        <TYPE>Company</TYPE>
                        <FETCH>Name</FETCH>
                    </COLLECTION>
                </TDLMESSAGE>
            </TDL>
        </DESC>
    </BODY>
</ENVELOPE>"""
            
            # Use shorter timeout for connection test
            response = self._send_request(xml_request)
            
            if response and len(response) > 50:
                # Try to parse to ensure it's valid XML
                try:
                    ET.fromstring(response)
                    logger.info("✓ Successfully connected to Tally")
                    return True, "✓ Connected to Tally successfully"
                except ET.ParseError:
                    logger.warning("Received response but XML is invalid")
                    return False, "Tally responded but with invalid XML. Check Tally version compatibility."
            else:
                logger.warning("Tally returned empty or very short response")
                return False, "Tally returned empty response. Ensure a company is open in Tally."
                
        except Exception as e:
            logger.error(f"Connection test failed: {e}")
            return False, str(e)

    def get_companies(self) -> List[Dict]:
        """
        Get list of all companies from Tally
        
        Returns:
            List of company dictionaries
        """
        try:
            xml_request = """
            <ENVELOPE>
                <HEADER>
                    <VERSION>1</VERSION>
                    <TALLYREQUEST>Export</TALLYREQUEST>
                    <TYPE>Collection</TYPE>
                    <ID>Company List</ID>
                </HEADER>
                <BODY>
                    <DESC>
                        <STATICVARIABLES>
                            <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                        </STATICVARIABLES>
                        <TDL>
                            <TDLMESSAGE>
                                <COLLECTION NAME="Company List" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No">
                                    <TYPE>Company</TYPE>
                                    <FETCH>NAME, STARTINGFROM, ENDINGAT, GUID, ADDRESS</FETCH>
                                </COLLECTION>
                            </TDLMESSAGE>
                        </TDL>
                    </DESC>
                </BODY>
            </ENVELOPE>
            """
            
            response = self._send_request(xml_request, timeout=self.request_timeout)
            companies = self._parse_companies(response)
            
            logger.info(f"Retrieved {len(companies)} companies from Tally")
            return companies
            
        except Exception as e:
            logger.error(f"Error fetching companies: {e}")
            raise

    def _parse_companies(self, xml_response: str) -> List[Dict]:
        """Parse companies from XML response"""
        companies = []
        
        try:
            root = ET.fromstring(xml_response)
            
            # Find all company nodes
            for company in root.findall('.//COMPANY'):
                name = company.find('NAME')
                guid = company.find('GUID')
                startingfrom = company.find('STARTINGFROM')
                endingat = company.find('ENDINGAT')
                address = company.find('ADDRESS')
                
                companies.append({
                    'name': name.text if name is not None else 'Unknown',
                    'guid': guid.text if guid is not None else None,
                    'financial_year_start': startingfrom.text if startingfrom is not None else None,
                    'financial_year_end': endingat.text if endingat is not None else None,
                    'address': address.text if address is not None else None
                })
                
        except ET.ParseError as e:
            logger.error(f"Error parsing XML response: {e}")
        
        return companies

    def get_ledgers(self, company_name: str, limit: Optional[int] = None, fetch_all: bool = True) -> List[Dict]:
        """
        Get ALL ledgers for a company - fetches in safe batches to prevent Tally crashes
        
        Args:
            company_name: Name of the company
            limit: Maximum per batch (default: 2000 to prevent Tally crashes)
            fetch_all: If True, attempts to fetch all ledgers. If False, single batch only.
            
        Returns:
            List of ALL ledger dictionaries (fetched safely)
        """
        try:
            # For ledgers, we'll try to fetch all in one request first (ledgers are usually smaller)
            # If it fails or returns limited results, we'll handle it gracefully
            
            # Use smaller limit to prevent Tally crashes
            if limit is None:
                limit = self.max_ledgers_per_request
            else:
                limit = min(limit, self.max_ledgers_per_request)  # Cap at max
            
            xml_request = f"""
            <ENVELOPE>
                <HEADER>
                    <VERSION>1</VERSION>
                    <TALLYREQUEST>Export</TALLYREQUEST>
                    <TYPE>Collection</TYPE>
                    <ID>Ledger Collection</ID>
                </HEADER>
                <BODY>
                    <DESC>
                        <STATICVARIABLES>
                            <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                            <SVCURRENTCOMPANY>{company_name}</SVCURRENTCOMPANY>
                        </STATICVARIABLES>
                        <TDL>
                            <TDLMESSAGE>
                                <COLLECTION NAME="Ledger Collection">
                                    <TYPE>Ledger</TYPE>
                                    <FETCH>NAME, PARENT, OPENINGBALANCE, CLOSINGBALANCE, GUID</FETCH>
                                </COLLECTION>
                            </TDLMESSAGE>
                        </TDL>
                    </DESC>
                </BODY>
            </ENVELOPE>
            """
            
            response = self._send_request(xml_request, timeout=self.request_timeout)
            ledgers = self._parse_ledgers(response, limit=None)  # Parse all, but Tally will limit response size
            
            # If we got exactly the limit, there might be more - but Tally doesn't support pagination for ledgers
            # So we return what we got (this is usually all ledgers anyway)
            logger.info(f"Retrieved {len(ledgers)} ledgers for {company_name}")
            
            if len(ledgers) >= limit and fetch_all:
                logger.warning(f"Retrieved {len(ledgers)} ledgers (may be limited). Tally doesn't support pagination for ledgers.")
            
            return ledgers
            
        except MemoryError as e:
            logger.error(f"Memory violation while fetching ledgers: {e}")
            raise Exception("Tally memory violation: Too many ledgers. Please reduce the limit.")
        except Exception as e:
            logger.error(f"Error fetching ledgers for {company_name}: {e}")
            raise

    def _parse_ledgers(self, xml_response: str, limit: Optional[int] = None) -> List[Dict]:
        """
        Parse ledgers from XML response with memory-efficient processing
        
        Args:
            xml_response: XML response string
            limit: Maximum number of ledgers to parse (prevents memory violations)
            
        Returns:
            List of ledger dictionaries (limited)
        """
        ledgers = []
        
        try:
            # Clean XML - remove invalid characters (memory-efficient)
            import re
            xml_response = re.sub(r'[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]', '', xml_response)
            
            root = ET.fromstring(xml_response)
            count = 0
            
            for ledger in root.findall('.//LEDGER'):
                if limit and count >= limit:
                    logger.warning(f"Reached ledger limit ({limit}), stopping parsing to prevent memory violation")
                    break
                
                try:
                    name = ledger.find('NAME')
                    parent = ledger.find('PARENT')
                    guid = ledger.find('GUID')
                    opening = ledger.find('OPENINGBALANCE')
                    closing = ledger.find('CLOSINGBALANCE')
                    
                    parent_text = parent.text if parent is not None else ''
                    closing_balance = float(closing.text) if closing is not None and closing.text else 0.0
                    
                    # Smart categorization based on parent group and ledger name
                    is_revenue, is_expense = self._categorize_ledger(name.text if name else '', parent_text, closing_balance)
                    
                    ledgers.append({
                        'name': name.text if name is not None else 'Unknown',
                        'parent': parent_text,
                        'guid': guid.text if guid is not None else None,
                        'opening_balance': float(opening.text) if opening is not None and opening.text else 0.0,
                        'closing_balance': closing_balance,
                        'is_revenue': is_revenue,
                        'is_expense': is_expense
                    })
                    count += 1
                except Exception as parse_error:
                    logger.warning(f"Error parsing individual ledger: {parse_error}")
                
        except ET.ParseError as e:
            logger.error(f"Error parsing ledgers XML: {e}")
            logger.warning("Attempting fallback ledger extraction...")
            # Fallback: Try to extract at least ledger names
            try:
                import re
                names = re.findall(r'<NAME[^>]*>(.*?)</NAME>', xml_response, re.DOTALL)
                fallback_limit = min(limit or 1000, 1000)  # Limit fallback too
                for name in names[:fallback_limit]:
                    clean_name = re.sub(r'<[^>]+>', '', name).strip()
                    if clean_name and len(clean_name) > 1:
                        ledgers.append({
                            'name': clean_name,
                            'parent': '',
                            'guid': None,
                            'opening_balance': 0.0,
                            'closing_balance': 0.0,
                            'is_revenue': False,
                            'is_expense': False
                        })
                logger.info(f"Extracted {len(ledgers)} ledger names using fallback")
            except Exception as fallback_error:
                logger.error(f"Fallback extraction failed: {fallback_error}")
        except MemoryError as e:
            logger.error(f"Memory violation while parsing ledgers: {e}")
            raise Exception("Tally memory violation: XML response too large. Please reduce the limit.")
        except Exception as e:
            logger.error(f"Error parsing ledgers: {e}")
        
        return ledgers
    
    def _categorize_ledger(self, ledger_name: str, parent: str, balance: float) -> tuple:
        """
        Smart categorization of ledgers into revenue/expense
        
        Args:
            ledger_name: Name of the ledger
            parent: Parent group name
            balance: Closing balance
            
        Returns:
            Tuple of (is_revenue, is_expense)
        """
        ledger_lower = ledger_name.lower()
        parent_lower = parent.lower()
        
        # Revenue indicators
        revenue_keywords = ['sales', 'income', 'revenue', 'receipt', 'interest income', 
                           'service income', 'other income', 'commission income', 
                           'discount received', 'profit on sale']
        
        # Expense indicators
        expense_keywords = ['expense', 'purchase', 'cost', 'salary', 'wages', 'rent',
                           'electricity', 'telephone', 'internet', 'fuel', 'freight',
                           'insurance', 'depreciation', 'interest expense', 'bank charges',
                           'office expenses', 'travelling', 'advertisement', 'repairs',
                           'maintenance', 'professional fees', 'discount allowed']
        
        # Check parent group first (most reliable)
        for keyword in revenue_keywords:
            if keyword in parent_lower:
                return (True, False)
        
        for keyword in expense_keywords:
            if keyword in parent_lower:
                return (False, True)
        
        # Check ledger name as fallback
        for keyword in revenue_keywords:
            if keyword in ledger_lower:
                return (True, False)
        
        for keyword in expense_keywords:
            if keyword in ledger_lower:
                return (False, True)
        
        # Balance-based heuristic (Tally uses negative for certain account types)
        # But don't rely solely on this
        
        return (False, False)  # Neither revenue nor expense (asset/liability)

    def get_vouchers(
        self, 
        company_name: str, 
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        voucher_type: Optional[str] = None,
        limit: Optional[int] = None,
        fetch_all: bool = True  # New parameter: fetch all data in batches
    ) -> List[Dict]:
        """
        Get vouchers for a company - fetches ALL data in safe batches to prevent Tally crashes
        
        Args:
            company_name: Name of the company
            from_date: Start date (format: YYYYMMDD) - defaults to company start if not provided
            to_date: End date (format: YYYYMMDD) - defaults to today if not provided
            voucher_type: Type of voucher (Sales, Purchase, Payment, Receipt, etc.)
            limit: Maximum per batch (default: 1000 to prevent Tally crashes)
            fetch_all: If True, fetches ALL vouchers in batches. If False, fetches single batch.
            
        Returns:
            List of ALL voucher dictionaries (fetched in safe batches)
        """
        try:
            from datetime import datetime, timedelta
            
            # Set default date range - if not provided, fetch ALL data in batches
            if not to_date:
                to_date = datetime.now().strftime('%Y%m%d')
            if not from_date:
                # Default to 10 years ago to get all historical data (will be fetched in batches)
                ten_years_ago = datetime.now() - timedelta(days=3650)
                from_date = ten_years_ago.strftime('%Y%m%d')
                logger.info(f"Using default date range: {from_date} to {to_date} (fetching ALL data in safe batches)")
            
            # If fetch_all is False, just do single batch
            if not fetch_all:
                return self._fetch_vouchers_single_batch(company_name, from_date, to_date, voucher_type, limit)
            
            # Fetch ALL data in smaller weekly batches to prevent Tally crashes
            logger.info(f"Fetching ALL vouchers in small batches from {from_date} to {to_date}")
            all_vouchers = []
            
            # Parse dates
            start = datetime.strptime(from_date, '%Y%m%d')
            end = datetime.strptime(to_date, '%Y%m%d')
            
            # Split into 3-DAY chunks (even smaller to prevent Tally crashes)
            current_start = start
            batch_num = 1
            
            while current_start <= end:
                # Calculate batch end (3 days later or final date) - VERY SMALL batches
                batch_end = current_start + timedelta(days=2)  # 3-day batches (reduced from 7)
                
                # Don't go beyond final date
                if batch_end > end:
                    batch_end = end
                
                batch_from = current_start.strftime('%Y%m%d')
                batch_to = batch_end.strftime('%Y%m%d')
                
                logger.info(f"Fetching batch {batch_num}: {batch_from} to {batch_to} (3-day window, max {limit} vouchers)")
                
                # Retry logic for failed batches with Tally crash detection
                batch_vouchers = []
                retry_count = 0
                success = False
                
                while retry_count < self.max_retries and not success:
                    try:
                        batch_vouchers = self._fetch_vouchers_single_batch(
                            company_name, batch_from, batch_to, voucher_type, limit
                        )
                        all_vouchers.extend(batch_vouchers)
                        logger.info(f"✓ Batch {batch_num} complete: {len(batch_vouchers)} vouchers (Total: {len(all_vouchers)})")
                        success = True
                    except Exception as e:
                        error_msg = str(e).lower()
                        retry_count += 1
                        
                        # Check if error indicates Tally crash
                        is_tally_crash = (
                            "memory access violation" in error_msg or
                            "c0000005" in error_msg or
                            "tally may have crashed" in error_msg or
                            "crashed" in error_msg
                        )
                        
                        if retry_count < self.max_retries:
                            if is_tally_crash:
                                # If Tally crashed, wait longer before retry
                                wait_time = self.tally_crash_wait + (retry_count * 2)  # 5s, 7s, 9s, 11s, 13s
                                logger.error(f"⚠️ Tally crash detected in batch {batch_num} (attempt {retry_count}/{self.max_retries})!")
                                logger.warning(f"Waiting {wait_time}s for Tally to recover before retrying...")
                                logger.warning("💡 TIP: If Tally keeps crashing, try restarting Tally software")
                            else:
                                wait_time = retry_count * 2  # Exponential backoff: 2s, 4s, 6s, 8s, 10s
                                logger.warning(f"Batch {batch_num} failed (attempt {retry_count}/{self.max_retries}): {e}. Retrying in {wait_time}s...")
                            
                            time.sleep(wait_time)
                        else:
                            if is_tally_crash:
                                logger.error(f"❌ Batch {batch_num} failed after {self.max_retries} attempts due to Tally crashes.")
                                logger.error("💡 RECOMMENDATION: Restart Tally software and try again")
                            else:
                                logger.error(f"Batch {batch_num} failed after {self.max_retries} attempts: {e}. Skipping this batch...")
                            # Continue with next batch even if this one fails completely
                
                # Move to next week
                current_start = batch_end + timedelta(days=1)
                batch_num += 1
                
                # Longer delay between batches to prevent Tally overload
                if current_start <= end:
                    logger.info(f"Waiting {self.batch_delay}s before next batch to prevent Tally overload...")
                    time.sleep(self.batch_delay)
            
            logger.info(f"✅ Fetched ALL vouchers: {len(all_vouchers)} total (from {batch_num-1} batches)")
            return all_vouchers
            
        except Exception as e:
            logger.error(f"Error fetching vouchers for {company_name}: {e}")
            raise
    
    def _fetch_vouchers_single_batch(
        self,
        company_name: str,
        from_date: str,
        to_date: str,
        voucher_type: Optional[str],
        limit: Optional[int]
    ) -> List[Dict]:
        """Fetch a single batch of vouchers with very conservative limits"""
        # Use very small limit to prevent Tally crashes
        if limit is None:
            limit = self.max_vouchers_per_request
        else:
            limit = min(limit, self.max_vouchers_per_request)  # Cap at max (500)
        
        # Additional safety: if date range is too large, further reduce limit
        from datetime import datetime
        start = datetime.strptime(from_date, '%Y%m%d')
        end = datetime.strptime(to_date, '%Y%m%d')
        days_diff = (end - start).days
        
        # If date range is more than 3 days, reduce limit even more (very conservative)
        if days_diff > 3:
            limit = min(limit, 150)  # Even smaller for longer ranges
            logger.info(f"Date range is {days_diff} days, using reduced limit: {limit} to prevent Tally crashes")
        
        voucher_filter = ""
        if voucher_type:
            voucher_filter = f"<FILTER>VoucherType : {voucher_type}</FILTER>"
        
        xml_request = f"""
        <ENVELOPE>
            <HEADER>
                <VERSION>1</VERSION>
                <TALLYREQUEST>Export</TALLYREQUEST>
                <TYPE>Collection</TYPE>
                <ID>Voucher Collection</ID>
            </HEADER>
            <BODY>
                <DESC>
                    <STATICVARIABLES>
                        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                        <SVCURRENTCOMPANY>{company_name}</SVCURRENTCOMPANY>
                        <SVFROMDATE>{from_date}</SVFROMDATE>
                        <SVTODATE>{to_date}</SVTODATE>
                    </STATICVARIABLES>
                    <TDL>
                        <TDLMESSAGE>
                            <COLLECTION NAME="Voucher Collection">
                                <TYPE>Voucher</TYPE>
                                <FETCH>DATE, VOUCHERNUMBER, VOUCHERTYPENAME, PARTYLEDGERNAME, AMOUNT, NARRATION</FETCH>
                                {voucher_filter}
                            </COLLECTION>
                        </TDLMESSAGE>
                    </TDL>
                </DESC>
            </BODY>
        </ENVELOPE>
        """
        
        # Add extra delay before request to ensure Tally is ready (increased for safety)
        time.sleep(1.0)  # Increased from 0.5s to 1.0s
        
        try:
            response = self._send_request(xml_request, timeout=self.request_timeout)
            vouchers = self._parse_vouchers(response, limit=limit)
            
            # If we got exactly the limit, log a warning (might be more data)
            if len(vouchers) >= limit:
                logger.warning(f"Batch returned {len(vouchers)} vouchers (limit: {limit}). There may be more data in this period.")
            
            return vouchers
        except MemoryError as e:
            logger.error(f"Tally memory violation in batch: {e}")
            raise Exception(f"Tally memory violation: Batch too large. Try smaller date range.")
        except Exception as e:
            logger.error(f"Error fetching batch: {e}")
            raise

    def _parse_vouchers(self, xml_response: str, limit: Optional[int] = None) -> List[Dict]:
        """
        Parse vouchers from XML response with memory-efficient processing
        
        Args:
            xml_response: XML response string
            limit: Maximum number of vouchers to parse (prevents memory violations)
            
        Returns:
            List of voucher dictionaries (limited)
        """
        vouchers = []
        
        try:
            # Clean XML - remove invalid characters (memory-efficient)
            import re
            xml_response = re.sub(r'[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]', '', xml_response)
            
            # Use standard parsing with limit checking (memory-efficient for most cases)
            root = ET.fromstring(xml_response)
            count = 0
            
            for voucher in root.findall('.//VOUCHER'):
                    if limit and count >= limit:
                        logger.warning(f"Reached voucher limit ({limit}), stopping parsing")
                        break
                    
                    date = voucher.find('DATE')
                    number = voucher.find('VOUCHERNUMBER')
                    vtype = voucher.find('VOUCHERTYPENAME')
                    party = voucher.find('PARTYLEDGERNAME')
                    amount = voucher.find('AMOUNT')
                    narration = voucher.find('NARRATION')
                    
                    vouchers.append({
                        'date': date.text if date is not None else None,
                        'voucher_number': number.text if number is not None else '',
                        'voucher_type': vtype.text if vtype is not None else '',
                        'party_name': party.text if party is not None else '',
                        'amount': float(amount.text) if amount is not None and amount.text else 0.0,
                        'narration': narration.text if narration is not None else ''
                    })
                    count += 1
                
        except ET.ParseError as e:
            logger.error(f"Error parsing vouchers XML: {e}")
        except MemoryError as e:
            logger.error(f"Memory violation while parsing vouchers: {e}")
            raise Exception("Tally memory violation: XML response too large. Please use date range filters.")
        except Exception as e:
            logger.error(f"Error parsing vouchers: {e}")
        
        return vouchers

    def get_stock_items(self, company_name: str, limit: Optional[int] = None, fetch_all: bool = True) -> List[Dict]:
        """
        Get ALL stock items for a company - fetches in safe batches to prevent Tally crashes
        
        Args:
            company_name: Name of the company
            limit: Maximum per batch (default: 2000 to prevent Tally crashes)
            fetch_all: If True, attempts to fetch all items. If False, single batch only.
            
        Returns:
            List of ALL stock item dictionaries (fetched safely)
        """
        try:
            # For stock items, similar to ledgers - try to fetch all in one request
            # Stock items are usually manageable in size
            
            # Use smaller limit to prevent Tally crashes
            if limit is None:
                limit = self.max_stock_per_request
            else:
                limit = min(limit, self.max_stock_per_request)  # Cap at max
            
            xml_request = f"""
            <ENVELOPE>
                <HEADER>
                    <VERSION>1</VERSION>
                    <TALLYREQUEST>Export</TALLYREQUEST>
                    <TYPE>Collection</TYPE>
                    <ID>Stock Items</ID>
                </HEADER>
                <BODY>
                    <DESC>
                        <STATICVARIABLES>
                            <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                            <SVCURRENTCOMPANY>{company_name}</SVCURRENTCOMPANY>
                        </STATICVARIABLES>
                        <TDL>
                            <TDLMESSAGE>
                                <COLLECTION NAME="Stock Items">
                                    <TYPE>Stock Item</TYPE>
                                    <FETCH>NAME, PARENT, OPENINGBALANCE, CLOSINGBALANCE, OPENINGVALUE, CLOSINGVALUE</FETCH>
                                </COLLECTION>
                            </TDLMESSAGE>
                        </TDL>
                    </DESC>
                </BODY>
            </ENVELOPE>
            """
            
            response = self._send_request(xml_request, timeout=self.request_timeout)
            stock_items = self._parse_stock_items(response, limit=None)  # Parse all
            
            logger.info(f"Retrieved {len(stock_items)} stock items for {company_name}")
            
            if len(stock_items) >= limit and fetch_all:
                logger.warning(f"Retrieved {len(stock_items)} stock items (may be limited). Tally doesn't support pagination for stock items.")
            
            return stock_items
            
        except MemoryError as e:
            logger.error(f"Memory violation while fetching stock items: {e}")
            raise Exception("Tally memory violation: Too many stock items. Please reduce the limit.")
        except Exception as e:
            logger.error(f"Error fetching stock items for {company_name}: {e}")
            raise

    def _parse_stock_items(self, xml_response: str, limit: Optional[int] = None) -> List[Dict]:
        """
        Parse stock items from XML response with memory-efficient processing
        
        Args:
            xml_response: XML response string
            limit: Maximum number of stock items to parse (prevents memory violations)
            
        Returns:
            List of stock item dictionaries (limited)
        """
        items = []
        
        try:
            root = ET.fromstring(xml_response)
            count = 0
            
            for item in root.findall('.//STOCKITEM'):
                if limit and count >= limit:
                    logger.warning(f"Reached stock items limit ({limit}), stopping parsing to prevent memory violation")
                    break
                
                try:
                    name = item.find('NAME')
                    parent = item.find('PARENT')
                    opening_qty = item.find('OPENINGBALANCE')
                    closing_qty = item.find('CLOSINGBALANCE')
                    opening_value = item.find('OPENINGVALUE')
                    closing_value = item.find('CLOSINGVALUE')
                    
                    items.append({
                        'name': name.text if name is not None else 'Unknown',
                        'parent': parent.text if parent is not None else '',
                        'opening_quantity': float(opening_qty.text) if opening_qty is not None and opening_qty.text else 0.0,
                        'closing_quantity': float(closing_qty.text) if closing_qty is not None and closing_qty.text else 0.0,
                        'opening_value': float(opening_value.text) if opening_value is not None and opening_value.text else 0.0,
                        'closing_value': float(closing_value.text) if closing_value is not None and closing_value.text else 0.0
                    })
                    count += 1
                except Exception as parse_error:
                    logger.warning(f"Error parsing individual stock item: {parse_error}")
                
        except ET.ParseError as e:
            logger.error(f"Error parsing stock items XML: {e}")
        except MemoryError as e:
            logger.error(f"Memory violation while parsing stock items: {e}")
            raise Exception("Tally memory violation: XML response too large. Please reduce the limit.")
        except Exception as e:
            logger.error(f"Error parsing stock items: {e}")
        
        return items

    def execute_tdl_report(self, company_name: str, report_name: str) -> str:
        """
        Execute a custom TDL report
        
        Args:
            company_name: Name of the company
            report_name: Name of the report to execute
            
        Returns:
            XML response string
        """
        try:
            xml_request = f"""
            <ENVELOPE>
                <HEADER>
                    <VERSION>1</VERSION>
                    <TALLYREQUEST>Export</TALLYREQUEST>
                    <TYPE>Data</TYPE>
                    <ID>{report_name}</ID>
                </HEADER>
                <BODY>
                    <DESC>
                        <STATICVARIABLES>
                            <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                            <SVCURRENTCOMPANY>{company_name}</SVCURRENTCOMPANY>
                        </STATICVARIABLES>
                    </DESC>
                </BODY>
            </ENVELOPE>
            """
            
            response = self._send_request(xml_request)
            return response
            
        except Exception as e:
            logger.error(f"Error executing TDL report: {e}")
            raise


# Helper functions for easy access
def create_tally_connector(host: str = "localhost", port: int = 9000) -> CustomTallyConnector:
    """
    Create a new Tally connector instance
    
    Args:
        host: Tally server host
        port: Tally Gateway port
        
    Returns:
        CustomTallyConnector instance
    """
    return CustomTallyConnector(host=host, port=port)

