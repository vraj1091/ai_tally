"""
Pydantic Schemas
Request/Response models for API
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# ===== TALLY SCHEMAS =====


class Company(BaseModel):
    """Tally Company model"""
    name: str
    guid: Optional[str] = None
    company_number: Optional[str] = None
    financial_year: Optional[str] = None
    address: Optional[str] = None


class Ledger(BaseModel):
    """Tally Ledger model"""
    name: str
    guid: Optional[str] = None
    parent: Optional[str] = None
    primary_group: Optional[str] = None
    opening_balance: float = 0.0
    closing_balance: float = 0.0
    is_revenue: bool = False
    is_expense: bool = False


class Voucher(BaseModel):
    """Tally Voucher model"""
    voucher_number: str
    voucher_type: str
    date: str
    reference_number: Optional[str] = None
    narration: Optional[str] = None
    amount: float = 0.0
    party_name: Optional[str] = None


# ===== TALLY CONNECTION SCHEMAS (NEW) =====


class ConnectionTypeEnum(str, Enum):
    """Tally connection type options - uppercase names with lowercase values"""
    LOCALHOST = "localhost"
    SERVER = "server"


class TallyConnectionBase(BaseModel):
    """Base Tally connection schema"""
    connection_type: ConnectionTypeEnum
    server_url: Optional[str] = None
    port: int = 9000
    
    @validator('connection_type', pre=True)
    def validate_connection_type(cls, v):
        """Convert string to enum, handling both lowercase and uppercase"""
        if isinstance(v, str):
            # Try to match by value first (case-insensitive)
            v_lower = v.lower()
            for member in ConnectionTypeEnum:
                if member.value == v_lower:
                    return member
            # Try to match by name (case-insensitive)
            v_upper = v.upper()
            for member_name, member in ConnectionTypeEnum.__members__.items():
                if member_name == v_upper:
                    return member
            # If no match, try direct lookup
            try:
                return ConnectionTypeEnum[v_upper]
            except KeyError:
                pass
        # If already an enum, return as-is
        if isinstance(v, ConnectionTypeEnum):
            return v
        return v


class TallyConnectionCreate(TallyConnectionBase):
    """Create Tally connection schema"""
    pass


class TallyConnectionUpdate(BaseModel):
    """Update Tally connection schema"""
    connection_type: Optional[ConnectionTypeEnum] = None
    server_url: Optional[str] = None
    port: Optional[int] = None
    is_active: Optional[bool] = None


class TallyConnectionResponse(TallyConnectionBase):
    """Tally connection response schema"""
    id: int
    user_id: int
    is_active: bool
    last_connected: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TallyDataRequest(BaseModel):
    """Request for Tally data"""
    data_type: str
    force_refresh: bool = False


class TallyDataResponse(BaseModel):
    """Response with Tally data"""
    data: Dict[str, Any]
    source: str  # "live" or "cache"
    cached_at: Optional[datetime] = None
    message: Optional[str] = None


class ConnectionStatus(BaseModel):
    """Tally connection status"""
    is_connected: bool
    connection_type: str
    url: str
    port: int
    message: str
    last_checked: Optional[datetime] = None


# ===== CHAT SCHEMAS =====


class ChatMessage(BaseModel):
    """Chat message model"""
    role: str = Field(..., description="Role: user or assistant")
    content: str = Field(..., description="Message content")
    timestamp: Optional[datetime] = None


class ChatRequest(BaseModel):
    """Chat request model"""
    query: str = Field(..., description="User query")
    company_name: Optional[str] = "Demo Company"
    collection_name: Optional[str] = "tally_combined"
    tally_url: Optional[str] = None


class ChatResponse(BaseModel):
    """Chat response model"""
    answer: str
    query: str
    tally_sources: List[Dict[str, Any]]
    document_sources: List[Dict[str, Any]]
    success: bool


# ===== DOCUMENT SCHEMAS =====


class DocumentMetadata(BaseModel):
    """Document metadata model"""
    source: str
    type: str
    company: Optional[str] = None
    file_size: Optional[int] = None
    uploaded_at: Optional[datetime] = None


class DocumentUploadResponse(BaseModel):
    """Document upload response"""
    success: bool
    filename: str
    file_path: str
    file_size: int
    message: str


# ===== ANALYTICS SCHEMAS =====


class FinancialSummary(BaseModel):
    """Financial summary model"""
    company_name: str
    total_revenue: float = 0.0
    total_expense: float = 0.0
    net_profit: float = 0.0
    total_assets: float = 0.0
    total_liabilities: float = 0.0
    ledger_count: int = 0


class AnalyticsResponse(BaseModel):
    """Analytics response model"""
    company: str
    total_revenue: float
    total_expense: float
    net_profit: float
    profit_margin: float
    debt_to_equity: float
    health_score: float


# ===== VECTOR STORE SCHEMAS =====


class CollectionInfo(BaseModel):
    """Collection information model"""
    name: str
    document_count: int


class VectorStoreStats(BaseModel):
    """Vector store statistics"""
    total_collections: int
    collections: List[CollectionInfo]
    persist_directory: str


# ===== GOOGLE DRIVE SCHEMAS =====


class DriveFile(BaseModel):
    """Google Drive file model"""
    id: str
    name: str
    mimeType: str
    size: Optional[str] = None
    createdTime: Optional[str] = None
    modifiedTime: Optional[str] = None


class DriveFileList(BaseModel):
    """Google Drive file list"""
    files: List[DriveFile]
    count: int
    folder_id: str


# ===== GENERIC SCHEMAS =====


class SuccessResponse(BaseModel):
    """Generic success response"""
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None


class ErrorResponse(BaseModel):
    """Generic error response"""
    success: bool = False
    error: str
    details: Optional[str] = None