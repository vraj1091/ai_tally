"""
Tally Service - Using Custom Python Connector
Supports both local and remote Tally instances
Enhanced with user-specific connections and automatic caching
No external DLLs required - Pure Python implementation
"""

import json
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
import logging
from sqlalchemy.orm import Session

from app.models.database import TallyConnection, TallyCache, User, ConnectionType
from app.models.schemas import ConnectionTypeEnum
from app.services.custom_tally_connector import CustomTallyConnector
from app.services.data_validator import DataValidator

logger = logging.getLogger(__name__)

# Custom Tally Connector is always available (no DLLs needed)
TALLYCONNECTOR_AVAILABLE = True
TALLYCONNECTOR_ERROR = None
logger.info("✓ Using Custom Python Tally Connector (No external DLLs required)")


class TallyDataService:
    """
    Advanced Tally Service using TallyConnector
    Supports local and remote Tally instances
    Enhanced with user-specific connections and automatic caching
    """

    def __init__(self, url: str = "http://localhost:9000", db: Session = None, user: User = None):
        """
        Initialize Tally Service

        Args:
            url: Tally server URL (for backward compatibility)
            db: Database session (for user management)
            user: User object (for user-specific connections)
        """
        self.db = db
        self.user = user
        self.cache_expiry_hours = 24
        self.tally_connector = None
        self.connected = False
        
        # Validate and set URL with proper default
        if not url or url.strip() == "" or url == "None":
            logger.warning("Invalid URL provided to TallyDataService, using default localhost:9000")
            url = "http://localhost:9000"
        
        self.current_url = url

        # User-specific mode or legacy mode
        if db and user:
            # New: User-specific connection
            self._initialize_user_connection()
        else:
            # Legacy: Direct URL connection
            self._initialize_legacy_connection(url)

    def _initialize_legacy_connection(self, url: str):
        """Initialize legacy mode (backward compatible)"""
        try:
            # Parse host and port from URL
            host, port = self._parse_url(url)
            self.tally_connector = CustomTallyConnector(host=host, port=port)
            self.connected, message = self.tally_connector.test_connection()
            if self.connected:
                logger.info(f"✓ Connected to Tally at {url}: {message}")
            else:
                logger.warning(f"✗ Could not connect to Tally at {url}: {message}")
        except Exception as e:
            logger.error(f"Error initializing Tally connector: {e}")
            self.connected = False

    def _initialize_user_connection(self):
        """Initialize user-specific connection"""
        try:
            connection = self.get_active_connection()
            if connection:
                url = self.get_connection_url(connection)
                logger.info(f"User {self.user.email} initializing connection to: {url}")
                self._connect_to_tally(url)
            else:
                logger.warning(f"No active connection found for user {self.user.email}, defaulting to localhost")
                self._connect_to_tally("http://localhost:9000")
        except Exception as e:
            logger.error(f"Error initializing user connection: {e}")
            # Fallback to localhost
            try:
                logger.info("Attempting fallback connection to localhost")
                self._connect_to_tally("http://localhost:9000")
            except:
                pass

    def _parse_url(self, url: str) -> Tuple[str, int]:
        """
        Parse URL into host and port
        
        Args:
            url: URL string (e.g., http://localhost:9000)
            
        Returns:
            Tuple of (host, port)
        """
        try:
            # Handle None or empty URL
            if not url or url.strip() == "":
                logger.warning("Empty URL provided, defaulting to localhost:9000")
                return "localhost", 9000
            
            # Remove protocol if present
            if '://' in url:
                url = url.split('://')[1]
            
            # Handle case where URL is just ":" or ":9000"
            if not url or url.startswith(':'):
                logger.warning(f"Invalid URL format '{url}', defaulting to localhost:9000")
                return "localhost", 9000
            
            # Split host and port
            if ':' in url:
                host, port_str = url.split(':', 1)  # Use maxsplit=1 to handle IPv6
                # Check if host is empty
                if not host or host.strip() == "":
                    logger.warning(f"Empty host in URL '{url}', defaulting to localhost")
                    host = "localhost"
                port = int(port_str) if port_str else 9000
            else:
                host = url if url else "localhost"
                port = 9000
            
            # Final validation
            if not host or host.strip() == "":
                host = "localhost"
                
            return host, port
        except Exception as e:
            logger.error(f"Error parsing URL '{url}': {e}")
            return "localhost", 9000

    def _connect_to_tally(self, url: str) -> bool:
        """
        Connect to Tally server

        Args:
            url: Tally server URL

        Returns:
            True if connected successfully
        """
        try:
            logger.info(f"🔌 _connect_to_tally called with URL: {url}")
            
            host, port = self._parse_url(url)
            logger.info(f"   Parsed to host={host}, port={port}")
            
            self.tally_connector = CustomTallyConnector(host=host, port=port)
            logger.info(f"   Created CustomTallyConnector")
            
            self.current_url = url
            
            logger.info(f"   Testing connection...")
            self.connected, message = self.tally_connector.test_connection()
            logger.info(f"   Test result: connected={self.connected}, message={message}")

            if self.connected:
                if self.user:
                    logger.info(f"✅ User {self.user.email} connected to Tally at {url}: {message}")
                    self._update_last_connected()
                else:
                    logger.info(f"✅ Connected to Tally at {url}: {message}")
            else:
                logger.warning(f"❌ Could not connect to Tally at {url}: {message}")

            return self.connected

        except Exception as e:
            logger.error(f"❌ Exception in _connect_to_tally: {e}", exc_info=True)
            self.connected = False
            return False

    def get_active_connection(self) -> Optional[TallyConnection]:
        """Get user's active Tally connection"""
        if not self.db or not self.user:
            return None

        return self.db.query(TallyConnection).filter(
            TallyConnection.user_id == self.user.id,
            TallyConnection.is_active == True
        ).first()

    def create_connection(
        self, 
        connection_type: str, 
        server_url: Optional[str] = None, 
        port: int = 9000
    ) -> TallyConnection:
        """
        Create a new Tally connection for user

        Args:
            connection_type: 'localhost' or 'server'
            server_url: Server URL for remote connections
            port: Tally port (default 9000)

        Returns:
            Created TallyConnection object
        """
        if not self.db or not self.user:
            raise Exception("Database and user required for connection management")

        # Deactivate existing connections
        self.db.query(TallyConnection).filter(
            TallyConnection.user_id == self.user.id
        ).update({"is_active": False})

        # Create new connection
        # Convert to SQLAlchemy ConnectionType enum
        if isinstance(connection_type, ConnectionTypeEnum):
            # Convert Pydantic enum to SQLAlchemy enum
            if connection_type == ConnectionTypeEnum.LOCALHOST:
                db_conn_type = ConnectionType.LOCALHOST
            elif connection_type == ConnectionTypeEnum.SERVER:
                db_conn_type = ConnectionType.SERVER
            else:
                db_conn_type = ConnectionType.LOCALHOST
        elif isinstance(connection_type, str):
            # Convert string to SQLAlchemy enum
            if connection_type.upper() == "SERVER" or connection_type.lower() == "server":
                db_conn_type = ConnectionType.SERVER
            else:
                db_conn_type = ConnectionType.LOCALHOST
        else:
            # Default to localhost
            db_conn_type = ConnectionType.LOCALHOST
        
        logger.info(f"Creating connection with type: {db_conn_type.name}, server_url: {server_url}, port: {port}")
        
        new_connection = TallyConnection(
            user_id=self.user.id,
            connection_type=db_conn_type,  # Store as SQLAlchemy enum
            server_url=server_url,
            port=port,
            is_active=True
        )

        self.db.add(new_connection)
        self.db.commit()
        self.db.refresh(new_connection)

        # Connect to the new configuration (non-blocking)
        try:
            url = self.get_connection_url(new_connection)
            logger.info(f"Attempting to connect to: {url}")
            # Don't block - connection test happens separately
            self._connect_to_tally(url)
        except Exception as e:
            logger.warning(f"Initial connection attempt failed (non-critical): {e}")
            # Continue anyway - connection can be tested later

        return new_connection

    def get_connection_url(self, connection: TallyConnection) -> str:
        """Build connection URL from connection config"""
        # Handle SQLAlchemy ConnectionType enum
        conn_type = connection.connection_type
        if isinstance(conn_type, ConnectionType):
            is_localhost = conn_type == ConnectionType.LOCALHOST
        elif isinstance(conn_type, str):
            is_localhost = conn_type.lower() == "localhost"
        else:
            # Fallback: check value
            is_localhost = str(conn_type).lower() == "localhost" or (hasattr(conn_type, 'value') and conn_type.value == "localhost")
        
        if is_localhost:
            return f"http://localhost:{connection.port}"
        else:
            # Handle server URL properly
            if not connection.server_url:
                logger.warning("Server connection type but no server_url, using localhost")
                return f"http://localhost:{connection.port}"
            
            base_url = connection.server_url.rstrip('/')
            
            # Ensure URL has protocol
            if not base_url.startswith('http://') and not base_url.startswith('https://'):
                base_url = f"http://{base_url}"
            
            return f"{base_url}:{connection.port}"

    def check_connection(self) -> bool:
        """Check if Tally is accessible"""
        try:
            if self.tally_connector:
                is_connected, _ = self.tally_connector.test_connection()
                return is_connected
            return False
        except Exception as e:
            logger.error(f"Connection check failed: {e}")
            return False

    def check_connection_status(self) -> Tuple[bool, str]:
        """
        Check connection status with message

        Returns:
            Tuple of (is_connected, message)
        """
        if self.user:
            connection = self.get_active_connection()
            if not connection:
                return False, "No active connection configured. Please setup Tally connection first."

        try:
            if self.user:
                url = self.get_connection_url(connection)
                if not self.connected or self.current_url != url:
                    self._connect_to_tally(url)

            if self.connected:
                return True, "✓ Connected to Tally successfully"
            else:
                return False, "Cannot connect to Tally - ensure Tally is running and Gateway is enabled (Port 9000)"

        except Exception as e:
            return False, f"Connection error: {str(e)}"
    
    @staticmethod
    def get_tallyconnector_status() -> dict:
        """
        Get TallyConnector availability status
        
        Returns:
            Dictionary with status information
        """
        return {
            "available": True,
            "connector_type": "Custom Python Connector",
            "description": "Using custom pure Python Tally connector - no external DLLs required",
            "features": [
                "XML-based communication with Tally Gateway",
                "Supports all standard Tally operations",
                "No external dependencies",
                "Works with both local and remote Tally instances"
            ],
            "requirements": [
                "Tally must be running",
                "Tally Gateway must be enabled (Port 9000)",
                "Network access to Tally server if remote"
            ]
        }

    def _update_last_connected(self):
        """Update last connected timestamp for active connection"""
        if not self.db or not self.user:
            return

        connection = self.get_active_connection()
        if connection:
            connection.last_connected = datetime.utcnow()
            self.db.commit()

    def get_all_companies(self, use_cache: bool = True) -> List[Dict]:
        """
        Get all companies from Tally

        Args:
            use_cache: Whether to use cached data if Tally unavailable (default: True)

        Returns:
            List of company dictionaries
        """
        cache_key = "companies"
        
        logger.info(f"[CACHE DEBUG] get_all_companies called: connected={self.connected}, use_cache={use_cache}, user={self.user.email if self.user else None}")

        # Try live fetch
        if self.connected and self.tally_connector:
            try:
                companies = self.tally_connector.get_companies()

                # Cache the result if user mode
                if self.user:
                    self._cache_data(cache_key, {"companies": companies, "count": len(companies)})

                logger.info(f"Retrieved {len(companies)} companies from Tally")
                return companies

            except Exception as e:
                logger.error(f"Error fetching companies: {e}")

        # Fallback to cache (supports both authenticated and anonymous users)
        logger.info(f"[CACHE DEBUG] Trying cache: use_cache={use_cache}, has_user={bool(self.user)}")
        if use_cache:
            # Try regular cache first
            cached = self._get_cached_data(cache_key)
            logger.info(f"[CACHE DEBUG] Regular cache result: {bool(cached)}, data={cached.keys() if cached else None}")
            if cached:
                companies = cached.get("companies", [])
                logger.info(f"Returning {len(companies)} cached companies")
                return companies
            
            # For anonymous users, also check backup cache for company names
            if not self.user:
                logger.info("[CACHE DEBUG] Anonymous user - checking backup cache for companies")
                try:
                    user_id = None
                    backup_entries = self.db.query(TallyCache).filter(
                        TallyCache.user_id == user_id,
                        TallyCache.source == "backup",
                        TallyCache.cache_key.like("backup_data_%")
                    ).all()
                    
                    # Extract unique company names from backup cache
                    company_names = set()
                    for entry in backup_entries:
                        try:
                            data = json.loads(entry.cache_data) if isinstance(entry.cache_data, str) else entry.cache_data
                            company = data.get("company", {})
                            company_name = company.get("name", "")
                            if company_name:
                                company_names.add(company_name)
                        except Exception as e:
                            logger.debug(f"Error extracting company from backup entry: {e}")
                            continue
                    
                    if company_names:
                        companies = [{"name": name} for name in sorted(company_names)]
                        logger.info(f"Found {len(companies)} companies from backup cache")
                        return companies
                except Exception as e:
                    logger.warning(f"Error checking backup cache for companies: {e}")
        
        logger.warning("[CACHE DEBUG] No data available (not connected and no cache)")
        return []

    def get_vouchers_for_company(
        self,
        company_name: str,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        voucher_type: Optional[str] = None,
        use_cache: bool = True
    ) -> List[Dict]:
        """
        Get vouchers/transactions for a company

        Args:
            company_name: Name of the company
            from_date: Start date (format: YYYYMMDD)
            to_date: End date (format: YYYYMMDD)
            voucher_type: Type of voucher (Sales, Payment, Receipt, etc.)
            use_cache: Whether to use cached data if unavailable (default: True)

        Returns:
            List of voucher dictionaries
        """
        cache_key = f"vouchers_{company_name}_{from_date}_{to_date}_{voucher_type}"

        # Try live fetch
        if self.connected and self.tally_connector:
            try:
                # Fetch ALL vouchers in EXTREMELY small safe batches to prevent Tally crashes
                vouchers = self.tally_connector.get_vouchers(
                    company_name=company_name,
                    from_date=from_date,
                    to_date=to_date,
                    voucher_type=voucher_type,
                    limit=200,  # EXTREMELY small batch size (reduced to prevent Tally software crashes)
                    fetch_all=True  # Fetch ALL data in batches
                )

                # Cache the result if user mode
                if self.user:
                    self._cache_data(cache_key, {
                        "vouchers": vouchers, 
                        "count": len(vouchers), 
                        "company": company_name,
                        "filters": {
                            "from_date": from_date,
                            "to_date": to_date,
                            "voucher_type": voucher_type
                        }
                    })

                logger.info(f"Retrieved {len(vouchers)} vouchers for company: {company_name}")
                return vouchers

            except Exception as e:
                logger.error(f"Error fetching vouchers for {company_name}: {e}")

        # Fallback to cache if user mode and cache enabled
        if use_cache and self.user:
            cached = self._get_cached_data(cache_key)
            if cached:
                logger.info(f"Returning cached vouchers for {company_name} (count: {cached.get('count', 0)})")
                return cached.get("vouchers", [])

        return []

    def get_ledgers_for_company(
        self,
        company_name: str,
        use_cache: bool = True
    ) -> List[Dict]:
        """
        Get all ledgers for a specific company

        Args:
            company_name: Name of the company
            use_cache: Whether to use cached data if unavailable (default: True)

        Returns:
            List of ledger dictionaries
        """
        cache_key = f"ledgers_{company_name}"

        # Try live fetch
        if self.connected and self.tally_connector:
            try:
                # Fetch ALL ledgers in ONE request (no batching)
                ledgers = self.tally_connector.get_ledgers(company_name, limit=None, fetch_all=False)

                # Cache the result if user mode
                if self.user:
                    self._cache_data(cache_key, {
                        "ledgers": ledgers,
                        "count": len(ledgers),
                        "company": company_name
                    })

                logger.info(f"Retrieved {len(ledgers)} ledgers for company: {company_name}")
                return ledgers

            except Exception as e:
                logger.error(f"Error fetching ledgers for {company_name}: {e}")

        # Fallback to cache if user mode and cache enabled
        if use_cache and self.user:
            cached = self._get_cached_data(cache_key)
            if cached:
                logger.info(f"Returning cached ledgers for {company_name} (count: {cached.get('count', 0)})")
                return cached.get("ledgers", [])

        return []

    def get_stock_items_for_company(
        self,
        company_name: str,
        use_cache: bool = True
    ) -> List[Dict]:
        """
        Get all stock/inventory items for a company

        Args:
            company_name: Name of the company
            use_cache: Whether to use cached data if unavailable (default: True)

        Returns:
            List of stock item dictionaries
        """
        cache_key = f"stock_items_{company_name}"

        # Try live fetch
        if self.connected and self.tally_connector:
            try:
                # Fetch ALL stock items safely with very reduced limit
                stock_items = self.tally_connector.get_stock_items(company_name, limit=500, fetch_all=True)

                # Cache the result if user mode
                if self.user:
                    self._cache_data(cache_key, {
                        "stock_items": stock_items,
                        "count": len(stock_items),
                        "company": company_name
                    })

                logger.info(f"Retrieved {len(stock_items)} stock items for {company_name}")
                return stock_items

            except Exception as e:
                logger.error(f"Error fetching stock items for {company_name}: {e}")

        # Fallback to cache if enabled
        if use_cache and self.user:
            cached = self._get_cached_data(cache_key)
            if cached:
                logger.info(f"Returning cached stock items for {company_name} (count: {cached.get('count', 0)})")
                return cached.get("stock_items", [])

        return []

    def get_financial_summary(
        self,
        company_name: str,
        use_cache: bool = True
    ) -> Dict:
        """
        Get financial summary for a company - uses Trial Balance for live Tally

        Args:
            company_name: Name of the company
            use_cache: Whether to use cached data if unavailable (default: True)

        Returns:
            Dictionary with financial metrics
        """
        cache_key = f"financial_summary_{company_name}"

        try:
            # For live Tally, use the connector's Trial Balance method (more reliable)
            if self.connected and hasattr(self, 'tally_connector') and self.tally_connector:
                try:
                    summary = self.tally_connector.get_financial_summary(company_name)
                    if summary and (summary.get('total_revenue', 0) > 0 or summary.get('total_expense', 0) > 0):
                        logger.info(f"Using Trial Balance summary for {company_name}: Revenue={summary.get('total_revenue', 0):,.0f}")
                        return summary
                except Exception as e:
                    logger.warning(f"Trial Balance method failed: {e}")
            
            ledgers = self.get_ledgers_for_company(company_name, use_cache)

            if not ledgers:
                # Try cache for summary directly
                if use_cache and self.user:
                    cached = self._get_cached_data(cache_key)
                    if cached:
                        return cached
                return {}

            total_revenue = 0.0
            total_expense = 0.0
            total_assets = 0.0
            total_liabilities = 0.0

            for ledger in ledgers:
                balance = ledger.get('closing_balance', 0)
                parent = ledger.get('parent', '').lower()
                
                # Improved Logic: Check for standard Tally Primary Groups
                # Revenue
                if 'sales accounts' in parent or 'direct incomes' in parent or 'indirect incomes' in parent or 'income (direct)' in parent or 'income (indirect)' in parent:
                    total_revenue += balance
                # Expense
                elif 'purchase accounts' in parent or 'direct expenses' in parent or 'indirect expenses' in parent or 'expenses (direct)' in parent or 'expenses (indirect)' in parent:
                    total_expense += balance
                # Assets
                elif 'fixed assets' in parent or 'current assets' in parent or 'investments' in parent or 'bank accounts' in parent or 'cash-in-hand' in parent or 'stock-in-hand' in parent or 'sundry debtors' in parent:
                    total_assets += balance
                # Liabilities
                elif 'capital account' in parent or 'loans (liability)' in parent or 'current liabilities' in parent or 'sundry creditors' in parent or 'duties & taxes' in parent or 'provisions' in parent:
                    total_liabilities += balance
                
                # Fallback to legacy string matching if no standard group found (for custom groups)
                elif ledger.get('is_revenue', False):
                    total_revenue += balance
                elif ledger.get('is_expense', False):
                    total_expense += balance
                elif 'asset' in parent:
                    total_assets += balance
                elif 'liability' in parent:
                    total_liabilities += balance
                elif 'income' in parent or 'sales' in parent or 'revenue' in parent:
                    total_revenue += balance
                elif 'expense' in parent or 'purchase' in parent:
                    total_expense += balance

            # Ensure positive values for revenue and expense for display (Tally often returns credit as negative)
            total_revenue = abs(total_revenue)
            total_expense = abs(total_expense)
            
            net_profit = total_revenue - total_expense

            summary = {
                "company_name": company_name,
                "total_revenue": total_revenue,
                "total_expense": total_expense,
                "net_profit": net_profit,
                "total_assets": abs(total_assets),
                "total_liabilities": abs(total_liabilities),
                "ledger_count": len(ledgers)
            }

            # Cache the summary if user mode
            if self.user:
                self._cache_data(cache_key, summary)

            return summary

        except Exception as e:
            logger.error(f"Error calculating financial summary: {e}")

            # Try cache
            if use_cache and self.user:
                cached = self._get_cached_data(cache_key)
                if cached:
                    return cached

            return {}

    def get_all_company_data(
        self,
        company_name: str,
        use_cache: bool = True,
        source: str = "live"
    ) -> Dict:
        """
        Get all company data (ledgers, vouchers, stock items) at once
        Supports both live and backup data sources
        
        Args:
            company_name: Name of the company
            use_cache: Whether to use cached data
            source: Data source - 'live' or 'backup'
        
        Returns:
            Dictionary with ledgers, vouchers, stock_items, and summary
        """
        if source == "backup":
            # Fetch from backup cache - ALWAYS search ALL users for backup data
            cache_key = f"backup_data_{company_name}"
            user_id = self.user.id if self.user else None
            logger.info(f"Fetching backup data for '{company_name}' (user_id={user_id})")
            
            cached_data = None
            
            # Search ALL backup data entries regardless of user (backup should be shared)
            logger.info(f"Searching all backup data for company '{company_name}'")
            try:
                company_name_lower = company_name.lower()
                
                # Search ALL users for backup data (shared access)
                all_backup_entries = self.db.query(TallyCache).filter(
                    TallyCache.source == "backup",
                    TallyCache.cache_key.like("backup_data_%")
                ).all()
                
                logger.info(f"Found {len(all_backup_entries)} backup entries to search")
                
                for entry in all_backup_entries:
                    try:
                        data = json.loads(entry.cache_data) if isinstance(entry.cache_data, str) else entry.cache_data
                        cached_company = data.get("company", {})
                        cached_company_name = cached_company.get("name", "")
                        if cached_company_name.lower() == company_name_lower:
                            cached_data = data
                            logger.info(f"Found backup data for: '{cached_company_name}'")
                            break
                    except Exception as e:
                        logger.debug(f"Error checking cache entry: {e}")
                        continue
            except Exception as e:
                logger.warning(f"Error in backup data search: {e}")
            
            if cached_data:
                logger.info(f"✓ Fetched backup data for {company_name} - {len(cached_data.get('ledgers', []))} ledgers, {len(cached_data.get('vouchers', []))} vouchers")
                
                # Validate data before returning
                validation_result = DataValidator.validate_all_data(cached_data)
                
                if not validation_result["is_valid"]:
                    logger.warning(f"Backup data validation failed for {company_name}: {validation_result['errors']}")
                    # Still return data but with warnings
                
                # Use validated data
                validated_data = validation_result["validated_data"]
                
                # Calculate summary if not present or empty
                summary = cached_data.get("summary", {})
                if not summary or summary.get("total_revenue", 0) == 0:
                    logger.info(f"Calculating summary for {company_name} from backup data")
                    summary = self._calculate_summary_from_backup_data(validated_data)
                
                return {
                    "ledgers": validated_data.get("ledgers", []),
                    "vouchers": validated_data.get("vouchers", []),
                    "stock_items": validated_data.get("stock_items", []),
                    "summary": summary,
                    "source": "backup",
                    "validation": {
                        "is_valid": validation_result["is_valid"],
                        "warnings": validation_result["warnings"],
                        "data_quality": validation_result["summary"].get("data_quality", {})
                    }
                }
            else:
                logger.warning(f"✗ No backup data found for '{company_name}' (user_id={user_id})")
                # Log available cache keys for debugging
                try:
                    available_keys = self.db.query(TallyCache.cache_key).filter(
                        TallyCache.user_id == user_id,
                        TallyCache.source == "backup"
                    ).all()
                    logger.info(f"Available backup cache keys: {[k[0] for k in available_keys]}")
                except:
                    pass
                return {
                    "ledgers": [],
                    "vouchers": [],
                    "stock_items": [],
                    "summary": {},
                    "source": "backup"
                }
        else:
            # Fetch from live Tally with memory-efficient defaults
            try:
                # Fetch vouchers - 3 YEARS of data
                default_to_date = datetime.now().strftime('%Y%m%d')
                # Default to 3 years ago (1095 days)
                default_from_date = (datetime.now() - timedelta(days=1095)).strftime('%Y%m%d')
                
                ledgers = self.get_ledgers_for_company(company_name, use_cache=use_cache)
                vouchers = self.get_vouchers_for_company(
                    company_name=company_name,
                    from_date=default_from_date,  # Default to 1 year ago
                    to_date=default_to_date,      # Default to today
                    use_cache=use_cache
                )
                stock_items = self.get_stock_items_for_company(company_name, use_cache=use_cache)
                summary = self.get_financial_summary(company_name, use_cache=use_cache)
                
                # ENHANCED: Use LiveDataEnhancer to derive additional metrics from summary
                try:
                    from app.services.live_data_enhancer import enhance_live_summary
                    if summary and (summary.get('total_revenue', 0) > 0 or summary.get('total_expense', 0) > 0):
                        summary = enhance_live_summary(summary)
                        logger.info(f"Live data enhanced with derived receivables/payables/cash data")
                except Exception as e:
                    logger.warning(f"LiveDataEnhancer failed: {e}")
                
                # Validate live data
                live_data = {
                    "ledgers": ledgers or [],
                    "vouchers": vouchers or [],
                    "stock_items": stock_items or []
                }
                validation_result = DataValidator.validate_all_data(live_data)
                
                if not validation_result["is_valid"]:
                    logger.warning(f"Live data validation failed for {company_name}: {validation_result['errors']}")
                
                # Use validated data
                validated_data = validation_result["validated_data"]
                
                return {
                    "ledgers": validated_data.get("ledgers", []),
                    "vouchers": validated_data.get("vouchers", []),
                    "stock_items": validated_data.get("stock_items", []),
                    "summary": summary,
                    "source": "live",
                    "connected": self.connected,
                    "validation": {
                        "is_valid": validation_result["is_valid"],
                        "warnings": validation_result["warnings"],
                        "data_quality": validation_result["summary"].get("data_quality", {})
                    }
                }
            except MemoryError as e:
                logger.error(f"Memory violation while fetching all company data: {e}")
                raise Exception("Tally memory violation: Data too large. Please use date range filters or reduce data size.")
            except Exception as e:
                logger.error(f"Error fetching all company data: {e}")
                # Return partial data if available
                return {
                    "ledgers": [],
                    "vouchers": [],
                    "stock_items": [],
                    "summary": {},
                    "source": "live",
                    "error": str(e)
                }

    # ==================== CACHE MANAGEMENT ====================

    def _cache_data(self, cache_key: str, data: Dict):
        """Save data to user-specific cache"""
        if not self.db or not self.user:
            return

        try:
            expires_at = datetime.utcnow() + timedelta(hours=self.cache_expiry_hours)

            cache_entry = self.db.query(TallyCache).filter(
                TallyCache.user_id == self.user.id,
                TallyCache.cache_key == cache_key
            ).first()

            if cache_entry:
                cache_entry.cache_data = json.dumps(data)
                cache_entry.cached_at = datetime.utcnow()
                cache_entry.expires_at = expires_at
            else:
                cache_entry = TallyCache(
                    user_id=self.user.id,
                    cache_key=cache_key,
                    cache_data=json.dumps(data),
                    cached_at=datetime.utcnow(),
                    expires_at=expires_at
                )
                self.db.add(cache_entry)

            self.db.commit()

        except Exception as e:
            logger.error(f"Error caching data: {e}")
            self.db.rollback()

    def _get_cached_data(self, cache_key: str, source: str = None) -> Optional[Dict]:
        """Retrieve data from user-specific cache (supports anonymous users)
        
        Args:
            cache_key: Cache key to look up
            source: Optional source filter ('live', 'backup', etc.)
        """
        if not self.db:
            return None

        try:
            # Handle both authenticated and anonymous users
            user_id = self.user.id if self.user else None
            
            query = self.db.query(TallyCache).filter(
                TallyCache.user_id == user_id,  # Can be None for anonymous users
                TallyCache.cache_key == cache_key
            )
            
            # Filter by source if provided
            if source:
                query = query.filter(TallyCache.source == source)
            
            cache_entry = query.first()

            if cache_entry:
                if cache_entry.expires_at and cache_entry.expires_at < datetime.utcnow():
                    return None

                return json.loads(cache_entry.cache_data)

            return None

        except Exception as e:
            logger.error(f"Error retrieving cached data: {e}")
            return None
    
    def _calculate_summary_from_backup_data(self, cached_data: Dict) -> Dict:
        """Calculate summary from backup data with proper sign handling
        
        Tally convention: Cr (Credit) = negative, Dr (Debit) = positive
        - Revenue accounts: Credit (negative) balances
        - Expense accounts: Debit (positive) balances
        """
        try:
            total_ledgers = len(cached_data.get("ledgers", []))
            total_vouchers = len(cached_data.get("vouchers", []))
            total_stock_items = len(cached_data.get("stock_items", []))
            
            ledgers = cached_data.get("ledgers", [])
            
            # Try multiple balance field names - WITH SIGN PRESERVATION
            def get_balance(ledger, preserve_sign=False):
                """Get balance from any available field
                
                Args:
                    ledger: The ledger dict
                    preserve_sign: If True, preserve Cr (negative) / Dr (positive) signs
                """
                # Try all possible balance fields in priority order
                for field in ['current_balance', 'closing_balance', 'balance', 'opening_balance']:
                    val = ledger.get(field)
                    if val is not None:
                        try:
                            if isinstance(val, str):
                                is_credit = 'Cr' in val or 'cr' in val or 'CR' in val
                                cleaned = val.replace('₹', '').replace(',', '').replace('Dr', '').replace('Cr', '').replace('dr', '').replace('cr', '').strip()
                                if cleaned:
                                    balance = float(cleaned)
                                    if preserve_sign and is_credit:
                                        balance = -abs(balance)
                                    elif not preserve_sign:
                                        balance = abs(balance)
                                    if balance != 0:
                                        return balance
                            else:
                                balance = float(val)
                                if not preserve_sign:
                                    balance = abs(balance)
                                if balance != 0:
                                    return balance
                        except:
                            continue
                return 0.0
            
            total_debit = sum(get_balance(l) for l in ledgers if get_balance(l, preserve_sign=True) > 0)
            total_credit = sum(abs(get_balance(l)) for l in ledgers if get_balance(l, preserve_sign=True) < 0)
            
            # Calculate revenue and expenses from ledgers using Tally Standard Groups
            # CRITICAL: Revenue = Credit (negative), Expense = Debit (positive)
            revenue_keywords = ['sales accounts', 'sales', 'direct incomes', 'indirect incomes', 
                               'income', 'revenue', 'other income', 'service income', 
                               'commission received', 'discount received', 'incomes']
            expense_keywords = ['purchase accounts', 'purchases', 'direct expenses', 'indirect expenses',
                               'expense', 'expenses', 'cost', 'salary', 'rent', 'wages',
                               'administrative expenses', 'selling expenses', 'manufacturing expenses']
            
            total_revenue = 0.0
            total_expense = 0.0
            
            for ledger in ledgers:
                parent = (ledger.get("parent") or "").lower()
                name = (ledger.get("name") or "").lower()
                
                # Get signed balance for proper classification
                signed_balance = get_balance(ledger, preserve_sign=True)
                abs_balance = abs(signed_balance)
                
                is_revenue = any(kw in parent or kw in name for kw in revenue_keywords) or ledger.get("is_revenue", False)
                is_expense = any(kw in parent or kw in name for kw in expense_keywords)
                
                # Revenue: Use absolute value (revenue typically has credit/negative balances)
                if is_revenue and abs_balance > 0:
                    total_revenue += abs_balance
                # Expense: Use absolute value (expense typically has debit/positive balances)
                elif is_expense and abs_balance > 0:
                    total_expense += abs_balance
            
            net_profit = total_revenue - total_expense
            profit_margin = (net_profit / total_revenue * 100) if total_revenue > 0 else 0
            
            # Calculate assets and liabilities using Tally Standard Groups
            asset_keywords = ['current assets', 'fixed assets', 'investments', 'bank accounts', 
                             'bank', 'cash-in-hand', 'cash', 'sundry debtors', 'debtors',
                             'stock-in-hand', 'deposits', 'loans and advances', 'assets']
            liability_keywords = ['current liabilities', 'liabilities', 'loans (liability)', 
                                 'sundry creditors', 'creditors', 'duties and taxes', 
                                 'provisions', 'secured loans', 'unsecured loans', 
                                 'bank od', 'overdraft', 'payable', 'loan']
            
            # Calculate assets - use absolute values for all asset ledgers
            total_assets = 0.0
            for l in ledgers:
                parent = (l.get("parent") or "").lower()
                name = (l.get("name") or "").lower()
                if any(kw in parent or kw in name for kw in asset_keywords):
                    balance = get_balance(l)
                    if balance > 0:
                        total_assets += balance
            
            # Calculate liabilities - use absolute values for all liability ledgers
            total_liabilities = 0.0
            for l in ledgers:
                parent = (l.get("parent") or "").lower()
                name = (l.get("name") or "").lower()
                if any(kw in parent or kw in name for kw in liability_keywords):
                    balance = get_balance(l)
                    if balance > 0:
                        total_liabilities += balance
            
            total_equity = total_assets - total_liabilities
            
            # Calculate inventory value from stock items
            stock_items = cached_data.get("stock_items", [])
            total_inventory_value = 0.0
            for item in stock_items:
                # Try closing_value first (most accurate), then closing_balance, then opening_value
                value = 0.0
                for field in ['closing_value', 'closing_balance', 'opening_value', 'opening_balance']:
                    val = item.get(field)
                    if val:
                        try:
                            value = abs(float(val))
                            if value > 0:
                                break
                        except:
                            continue
                if value > 0:
                    total_inventory_value += value
            
            # Health score calculation
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
            
            logger.info(f"Calculated summary: revenue={total_revenue}, expense={total_expense}, profit={net_profit}, assets={total_assets}, liabilities={total_liabilities}")
            
            return {
                "total_ledgers": total_ledgers,
                "total_vouchers": total_vouchers,
                "total_stock_items": total_stock_items,
                "total_inventory_value": total_inventory_value,
                "total_debit": total_debit,
                "total_credit": total_credit,
                "net_balance": total_debit - total_credit,
                "total_revenue": total_revenue,
                "total_expense": total_expense,
                "net_profit": net_profit,
                "profit_margin": profit_margin,
                "total_assets": total_assets,
                "total_liabilities": total_liabilities,
                "total_equity": total_equity,
                "health_score": health_score,
                "health_status": health_status
            }
        except Exception as e:
            logger.error(f"Error calculating summary from backup data: {e}", exc_info=True)
            return {}

    def clear_cache(self, cache_key: Optional[str] = None):
        """
        Clear user's cache

        Args:
            cache_key: Specific key to clear, or None to clear all
        """
        if not self.db or not self.user:
            return

        try:
            query = self.db.query(TallyCache).filter(
                TallyCache.user_id == self.user.id
            )

            if cache_key:
                query = query.filter(TallyCache.cache_key == cache_key)

            count = query.delete()
            self.db.commit()

            logger.info(f"Cleared {count} cache entries")

        except Exception as e:
            logger.error(f"Error clearing cache: {e}")
            self.db.rollback()

    def get_cache_info(self) -> List[Dict]:
        """Get information about user's cached data"""
        if not self.db or not self.user:
            return []

        try:
            cache_entries = self.db.query(TallyCache).filter(
                TallyCache.user_id == self.user.id
            ).all()

            result = []
            for entry in cache_entries:
                result.append({
                    "cache_key": entry.cache_key,
                    "cached_at": entry.cached_at.isoformat(),
                    "expires_at": entry.expires_at.isoformat() if entry.expires_at else None,
                    "is_expired": entry.expires_at < datetime.utcnow() if entry.expires_at else False,
                    "size_bytes": len(entry.cache_data)
                })

            return result

        except Exception as e:
            logger.error(f"Error getting cache info: {e}")
            return []