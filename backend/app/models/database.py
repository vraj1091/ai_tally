"""
Database Models, Session, and Engine
SQLAlchemy models for caching and Tally connections
"""

import enum
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.sql import func
from datetime import datetime
import logging

# Import the DB_URL from your config file
try:
    from app.config import Config
except ImportError:
    logging.warning("Config not found, using default DB_URL (SQLite)")
    class Config:
        DB_URL = "sqlite:///./database.db"

# ==================== DATABASE ENGINE AND SESSION ====================

# Create the SQLAlchemy engine
try:
    engine = create_engine(
        Config.DB_URL,
        pool_recycle=3600  # Recycle connections every hour
    )
except Exception as e:
    logging.error(f"Failed to create database engine: {e}")
    raise

# Create a configured "Session" class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create a Base for our models
Base = declarative_base()


# Dependency to get DB session
def get_db():
    """
    FastAPI dependency to get a database session.
    Yields a session and closes it automatically.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ==================== MODELS ====================


class ConnectionType(enum.Enum):
    """Tally connection type"""
    LOCALHOST = "localhost"
    SERVER = "server"


class User(Base):
    """
    User model for authentication
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(255), unique=True, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships for Tally integration
    tally_connections = relationship("TallyConnection", back_populates="user", cascade="all, delete-orphan")
    tally_caches = relationship("TallyCache", back_populates="user", cascade="all, delete-orphan")


class TallyConnection(Base):
    """User-specific Tally connection configuration"""
    __tablename__ = "tally_connections"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    connection_type = Column(Enum(ConnectionType), nullable=False, default=ConnectionType.LOCALHOST)
    server_url = Column(String(255), nullable=True)
    port = Column(Integer, default=9000)
    is_active = Column(Boolean, default=True)
    last_connected = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    user = relationship("User", back_populates="tally_connections")


class TallyCache(Base):
    """Cache for Tally data - user-specific or anonymous offline fallback"""
    __tablename__ = "tally_cache"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Allow NULL for anonymous backup data
    cache_key = Column(String(255), nullable=False, index=True)
    cache_data = Column(Text, nullable=False)
    cached_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    source = Column(String(50), default="live")  # "live", "backup", or "cached"
    
    # Relationship (optional - user can be null for anonymous data)
    user = relationship("User", back_populates="tally_caches")


class CachedCompany(Base):
    """Cached Tally company data"""
    __tablename__ = 'cached_companies'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), unique=True, nullable=False)
    guid = Column(String(255))
    company_number = Column(String(100))
    financial_year = Column(String(100))
    address = Column(Text)
    cached_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class CachedLedger(Base):
    """Cached Tally ledger data"""
    __tablename__ = 'cached_ledgers'

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_name = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    guid = Column(String(255))
    parent = Column(String(255))
    primary_group = Column(String(255))  # <-- THIS LINE IS NOW FIXED
    opening_balance = Column(Float, default=0.0)
    closing_balance = Column(Float, default=0.0)
    is_revenue = Column(Boolean, default=False)
    is_expense = Column(Boolean, default=False)
    cached_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class CachedVoucher(Base):
    """Cached Tally voucher data"""
    __tablename__ = 'cached_vouchers'

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_name = Column(String(255), nullable=False)
    voucher_number = Column(String(100), nullable=False)
    voucher_type = Column(String(100))
    date = Column(String(50))
    reference_number = Column(String(100))
    narration = Column(Text)
    amount = Column(Float, default=0.0)
    party_name = Column(String(255))
    cached_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class CachedAnalytics(Base):
    """Cached analytics data"""
    __tablename__ = 'cached_analytics'

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_name = Column(String(255), unique=True, nullable=False)
    total_revenue = Column(Float, default=0.0)
    total_expense = Column(Float, default=0.0)
    net_profit = Column(Float, default=0.0)
    profit_margin = Column(Float, default=0.0)
    health_score = Column(Float, default=0.0)
    cached_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


# ==================== TALLY GROUPS ====================

class CachedGroup(Base):
    """Cached Tally groups (Account Groups)"""
    __tablename__ = 'cached_groups'

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_name = Column(String(255), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    guid = Column(String(255))
    parent = Column(String(255))
    primary_group = Column(String(255))
    is_revenue = Column(Boolean, default=False)
    is_expense = Column(Boolean, default=False)
    is_liability = Column(Boolean, default=False)
    is_asset = Column(Boolean, default=False)
    nature = Column(String(100))  # Assets, Liabilities, Income, Expenses
    cached_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


# ==================== INVENTORY / STOCK ====================

class CachedStockItem(Base):
    """Cached Tally stock items"""
    __tablename__ = 'cached_stock_items'

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_name = Column(String(255), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    guid = Column(String(255))
    parent = Column(String(255))  # Stock Group
    category = Column(String(255))  # Stock Category
    unit = Column(String(100))  # Unit of Measure
    opening_balance = Column(Float, default=0.0)
    opening_value = Column(Float, default=0.0)
    closing_balance = Column(Float, default=0.0)
    closing_value = Column(Float, default=0.0)
    rate = Column(Float, default=0.0)
    gst_rate = Column(Float, default=0.0)
    hsn_code = Column(String(50))
    batch_enabled = Column(Boolean, default=False)
    cached_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class CachedStockGroup(Base):
    """Cached Tally stock groups"""
    __tablename__ = 'cached_stock_groups'

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_name = Column(String(255), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    guid = Column(String(255))
    parent = Column(String(255))
    cached_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class CachedGodown(Base):
    """Cached Tally godowns/warehouses"""
    __tablename__ = 'cached_godowns'

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_name = Column(String(255), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    guid = Column(String(255))
    parent = Column(String(255))
    address = Column(Text)
    cached_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class CachedBatch(Base):
    """Cached Tally batches"""
    __tablename__ = 'cached_batches'

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_name = Column(String(255), nullable=False, index=True)
    stock_item = Column(String(255), nullable=False)
    batch_name = Column(String(255), nullable=False)
    godown = Column(String(255))
    quantity = Column(Float, default=0.0)
    rate = Column(Float, default=0.0)
    amount = Column(Float, default=0.0)
    mfg_date = Column(DateTime, nullable=True)
    expiry_date = Column(DateTime, nullable=True)
    cached_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


# ==================== GST / TAX DATA ====================

class CachedGSTData(Base):
    """Cached GST/Tax data"""
    __tablename__ = 'cached_gst_data'

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_name = Column(String(255), nullable=False, index=True)
    gstin = Column(String(20))
    period = Column(String(20))  # e.g., "Apr-2024"
    gstr1_sales = Column(Float, default=0.0)
    gstr1_tax = Column(Float, default=0.0)
    gstr3b_liability = Column(Float, default=0.0)
    gstr3b_itc = Column(Float, default=0.0)
    cgst = Column(Float, default=0.0)
    sgst = Column(Float, default=0.0)
    igst = Column(Float, default=0.0)
    cess = Column(Float, default=0.0)
    status = Column(String(50))  # Filed, Pending, Draft
    cached_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


# ==================== COST CENTERS ====================

class CachedCostCenter(Base):
    """Cached Tally cost centers"""
    __tablename__ = 'cached_cost_centers'

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_name = Column(String(255), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    guid = Column(String(255))
    parent = Column(String(255))
    category = Column(String(255))
    cached_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


# ==================== BUDGETS ====================

class CachedBudget(Base):
    """Cached Tally budgets"""
    __tablename__ = 'cached_budgets'

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_name = Column(String(255), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    ledger_name = Column(String(255))
    group_name = Column(String(255))
    period_from = Column(DateTime)
    period_to = Column(DateTime)
    budget_amount = Column(Float, default=0.0)
    actual_amount = Column(Float, default=0.0)
    variance = Column(Float, default=0.0)
    cached_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


# ==================== PARTY / CUSTOMER / VENDOR ====================

class CachedParty(Base):
    """Cached party (customer/vendor) details"""
    __tablename__ = 'cached_parties'

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_name = Column(String(255), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    ledger_name = Column(String(255))
    party_type = Column(String(50))  # Customer, Vendor, Both
    gstin = Column(String(20))
    pan = Column(String(15))
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    pincode = Column(String(10))
    phone = Column(String(50))
    email = Column(String(255))
    credit_limit = Column(Float, default=0.0)
    credit_days = Column(Integer, default=0)
    outstanding = Column(Float, default=0.0)
    cached_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


# ==================== BILLS / OUTSTANDING ====================

class CachedBill(Base):
    """Cached outstanding bills"""
    __tablename__ = 'cached_bills'

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_name = Column(String(255), nullable=False, index=True)
    party_name = Column(String(255), nullable=False)
    bill_number = Column(String(100))
    bill_date = Column(DateTime)
    due_date = Column(DateTime)
    bill_type = Column(String(50))  # Receivable, Payable
    original_amount = Column(Float, default=0.0)
    pending_amount = Column(Float, default=0.0)
    is_overdue = Column(Boolean, default=False)
    days_overdue = Column(Integer, default=0)
    cached_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


# ==================== BANK / RECONCILIATION ====================

class CachedBankTransaction(Base):
    """Cached bank transactions for reconciliation"""
    __tablename__ = 'cached_bank_transactions'

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_name = Column(String(255), nullable=False, index=True)
    bank_name = Column(String(255), nullable=False)
    account_number = Column(String(50))
    transaction_date = Column(DateTime)
    voucher_number = Column(String(100))
    voucher_type = Column(String(100))
    narration = Column(Text)
    debit = Column(Float, default=0.0)
    credit = Column(Float, default=0.0)
    balance = Column(Float, default=0.0)
    is_reconciled = Column(Boolean, default=False)
    bank_date = Column(DateTime, nullable=True)
    cached_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


# ==================== DOCUMENTS ====================

class Document(Base):
    """Uploaded documents storage"""
    __tablename__ = 'documents'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255))
    file_type = Column(String(50))  # pdf, docx, image, xml
    file_size = Column(Integer)
    file_path = Column(String(500))
    content_text = Column(Text)  # Extracted text content
    document_type = Column(String(100))  # Invoice, Receipt, Contract, etc.
    company_name = Column(String(255))
    is_processed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


# ==================== AI CHAT HISTORY ====================

class ChatHistory(Base):
    """AI chat conversation history"""
    __tablename__ = 'chat_history'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    session_id = Column(String(100), index=True)
    role = Column(String(20))  # user, assistant, system
    message = Column(Text, nullable=False)
    company_context = Column(String(255))
    tokens_used = Column(Integer, default=0)
    response_time_ms = Column(Integer, default=0)
    created_at = Column(DateTime, default=func.now())


# ==================== DASHBOARD CACHE ====================

class CachedDashboard(Base):
    """Cached dashboard data for fast loading"""
    __tablename__ = 'cached_dashboards'

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_name = Column(String(255), nullable=False, index=True)
    dashboard_type = Column(String(50), nullable=False)  # ceo, cfo, sales, inventory, etc.
    data_json = Column(Text)  # JSON-serialized dashboard data
    cached_at = Column(DateTime, default=func.now())
    expires_at = Column(DateTime)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


# ==================== AUDIT LOGS ====================

class AuditLog(Base):
    """Security audit logs"""
    __tablename__ = 'audit_logs'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)  # login, logout, data_access, export, etc.
    resource = Column(String(255))  # What was accessed
    ip_address = Column(String(50))
    user_agent = Column(String(500))
    details = Column(Text)  # JSON details
    status = Column(String(20))  # success, failure
    created_at = Column(DateTime, default=func.now())


# ==================== USER SETTINGS ====================

class UserSettings(Base):
    """User preferences and settings"""
    __tablename__ = 'user_settings'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    default_company = Column(String(255))
    theme = Column(String(50), default="light")
    language = Column(String(10), default="en")
    date_format = Column(String(20), default="DD-MM-YYYY")
    currency_format = Column(String(20), default="INR")
    dashboard_layout = Column(Text)  # JSON layout preferences
    notifications_enabled = Column(Boolean, default=True)
    email_reports = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


# ==================== REPORTS ====================

class SavedReport(Base):
    """User-saved custom reports"""
    __tablename__ = 'saved_reports'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    report_type = Column(String(100))  # P&L, Balance Sheet, Custom, etc.
    company_name = Column(String(255))
    filters_json = Column(Text)  # JSON filters
    columns_json = Column(Text)  # JSON column configuration
    schedule = Column(String(50))  # daily, weekly, monthly, none
    last_generated = Column(DateTime)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


# ==================== BACKUP HISTORY ====================

class BackupHistory(Base):
    """Tally backup upload history"""
    __tablename__ = 'backup_history'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    company_name = Column(String(255), nullable=False)
    file_name = Column(String(255))
    file_size = Column(Integer)
    backup_type = Column(String(50))  # tbk, xml, json
    ledger_count = Column(Integer, default=0)
    voucher_count = Column(Integer, default=0)
    from_date = Column(DateTime)
    to_date = Column(DateTime)
    status = Column(String(50))  # uploaded, processing, completed, failed
    error_message = Column(Text)
    created_at = Column(DateTime, default=func.now())


# ==================== UNITS OF MEASURE ====================

class CachedUnit(Base):
    """Cached Tally units of measure"""
    __tablename__ = 'cached_units'

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_name = Column(String(255), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    symbol = Column(String(20))
    formal_name = Column(String(100))
    is_simple_unit = Column(Boolean, default=True)
    base_units = Column(Float, default=1.0)
    cached_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())