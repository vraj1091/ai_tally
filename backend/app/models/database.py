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