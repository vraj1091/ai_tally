"""
Tally Backup File Routes
Upload and manage .tbk backup files
"""

from fastapi import APIRouter, File, UploadFile, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Dict, Any
import os
import tempfile
import logging
import traceback
import json
from datetime import datetime

from app.models.database import get_db, User, TallyCache
from app.routes.auth_routes import get_current_user
from app.services.tbk_parser import TallyBackupParser
from app.config import Config
from fastapi import Header
from typing import Optional

logger = logging.getLogger(__name__)
router = APIRouter()


# Helper function to get optional user (for anonymous backup access)
async def get_optional_user_backup(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Get user if authenticated, otherwise return None (for anonymous backup access)"""
    # No authorization header = anonymous access (allowed)
    if not authorization:
        return None
    
    # Check for Bearer token (case-insensitive)
    auth_lower = authorization.lower()
    if not auth_lower.startswith("bearer "):
        return None
    
    try:
        from jose import JWTError, jwt
        import os
        
        # Get secret key and algorithm from environment or defaults
        SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
        ALGORITHM = "HS256"
        
        # Extract token (case-insensitive Bearer)
        token = authorization[7:].strip()  # Skip "Bearer " (7 chars)
        
        # Skip validation for demo/empty tokens - allow anonymous
        if not token or token.startswith("demo-token-") or len(token) < 10:
            return None
            
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
        
        user = db.query(User).filter(User.email == email).first()
        return user
    except Exception as e:
        # ANY error = allow anonymous access (don't block on bad tokens)
        logger.debug(f"Token validation skipped (anonymous access allowed): {e}")
        return None


@router.post("/upload")
async def upload_tbk_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user_backup)
):
    """
    Upload and parse a Tally .tbk backup file
    
    This allows viewing Tally data without running Tally ERP
    Supports anonymous access for demo/testing purposes
    Supports files up to 2GB using chunked upload
    """
    
    # Validate file extension - accept .tbk, .001, .002, etc. (multi-part), .zip, .xml
    valid_extensions = ('.tbk', '.001', '.002', '.003', '.004', '.005', '.zip', '.xml')
    if not file.filename.lower().endswith(valid_extensions):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Supported formats: .tbk, .001, .002, .zip, .xml"
        )
    
    temp_path = None
    try:
        # File size limit: 2 GB for large Tally backups
        MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024  # 2 GB
        CHUNK_SIZE = 8 * 1024 * 1024  # 8 MB chunks for efficient streaming
        
        # Save uploaded file in chunks (memory efficient for large files)
        user_email = current_user.email if current_user else "anonymous"
        logger.info(f"Starting chunked upload for {file.filename} from user {user_email}")
        
        file_size = 0
        with tempfile.NamedTemporaryFile(delete=False, suffix='.tbk') as temp_file:
            temp_path = temp_file.name
            
            # Read and write in chunks to avoid memory issues
            while True:
                chunk = await file.read(CHUNK_SIZE)
                if not chunk:
                    break
                file_size += len(chunk)
                
                # Check size limit during upload
                if file_size > MAX_FILE_SIZE:
                    # Clean up and raise error
                    temp_file.close()
                    if os.path.exists(temp_path):
                        os.unlink(temp_path)
                    raise HTTPException(
                        status_code=413,
                        detail=f"File too large. Maximum size is 2 GB, received {file_size / (1024*1024):.2f} MB so far"
                    )
                
                temp_file.write(chunk)
                
                # Log progress for large files
                if file_size % (100 * 1024 * 1024) == 0:  # Every 100MB
                    logger.info(f"Upload progress: {file_size / (1024*1024):.0f} MB received...")
        
        logger.info(f"User {user_email} uploaded {file.filename} ({file_size / (1024*1024):.2f} MB)")
        
        # Parse the file
        logger.info(f"Starting to parse {file.filename} ({file_size / (1024*1024):.2f} MB) - this may take a moment for large files...")
        parser = TallyBackupParser()
        try:
            data = parser.parse_tbk_file(temp_path)
            logger.info(f"Successfully parsed {file.filename}")
            logger.info(f"  - Companies: {len(data.get('companies', []))}")
            logger.info(f"  - Ledgers: {len(data.get('ledgers', []))}")
            logger.info(f"  - Vouchers: {len(data.get('vouchers', []))}")
            logger.info(f"  - Stock Items: {len(data.get('stock_items', []))}")
            
            # Log sample data for verification
            ledgers = data.get('ledgers', [])
            if ledgers:
                sample_ledger = ledgers[0]
                logger.info(f"Sample ledger structure: {list(sample_ledger.keys())}")
                logger.info(f"Sample ledger: {sample_ledger.get('name')} - balance fields: current={sample_ledger.get('current_balance')}, closing={sample_ledger.get('closing_balance')}, balance={sample_ledger.get('balance')}")
        except ValueError as ve:
            error_msg = str(ve) if str(ve) else "Unknown parsing error"
            logger.error(f"Parsing error: {error_msg}", exc_info=True)
            raise HTTPException(
                status_code=400,
                detail=f"Invalid backup file format: {error_msg}"
            )
        except Exception as parse_error:
            error_msg = str(parse_error) if str(parse_error) else f"Unknown error: {type(parse_error).__name__}"
            logger.error(f"Unexpected parsing error: {error_msg}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"Failed to parse backup file: {error_msg}"
            )
        
        # Store in cache for each company found
        companies_cached = []
        companies_list = data.get("companies", [])
        if not companies_list:
            logger.warning(f"No companies found in backup file {file.filename}")
            raise HTTPException(
                status_code=400,
                detail="No companies found in backup file. Please ensure the file contains valid Tally data."
            )
        
        # Get user_id (None for anonymous users)
        user_id = current_user.id if current_user else None
        
        for company in companies_list:
            company_name = company["name"]
            
            # Cache companies list
            cache_entry = db.query(TallyCache).filter(
                TallyCache.user_id == user_id,
                TallyCache.cache_key == "companies"
            ).first()
            
            if not cache_entry:
                cache_entry = TallyCache(
                    user_id=user_id,
                    cache_key="companies",
                    cache_data=json.dumps({"companies": [company]}),
                    source="backup"
                )
                db.add(cache_entry)
            else:
                # Add to existing companies
                try:
                    existing_data = json.loads(cache_entry.cache_data) if isinstance(cache_entry.cache_data, str) else cache_entry.cache_data
                    existing_companies = existing_data.get("companies", [])
                except:
                    existing_companies = []
                    
                existing_names = {c["name"] for c in existing_companies}
                if company_name not in existing_names:
                    existing_companies.append(company)
                    cache_entry.cache_data = json.dumps({"companies": existing_companies})
                    cache_entry.source = "backup"
                    cache_entry.last_updated = datetime.utcnow()
            
            # Cache company data
            company_cache = db.query(TallyCache).filter(
                TallyCache.user_id == user_id,
                TallyCache.cache_key == f"backup_data_{company_name}"
            ).first()
            
            # Pre-calculate summary for faster dashboard loading
            ledgers_for_summary = data.get("ledgers", [])
            vouchers_for_summary = data.get("vouchers", [])
            stock_items_for_summary = data.get("stock_items", [])
            
            # Calculate financial summary
            def get_balance(ledger):
                for field in ['current_balance', 'closing_balance', 'balance', 'opening_balance']:
                    val = ledger.get(field)
                    if val is not None:
                        try:
                            if isinstance(val, str):
                                cleaned = val.replace('₹', '').replace(',', '').replace('Dr', '').replace('Cr', '').strip()
                                return abs(float(cleaned)) if cleaned else 0
                            return abs(float(val))
                        except:
                            continue
                return 0.0
            
            revenue_keywords = ['sales accounts', 'sales', 'direct incomes', 'indirect incomes', 
                               'income', 'revenue', 'other income', 'incomes']
            expense_keywords = ['purchase accounts', 'purchases', 'direct expenses', 'indirect expenses',
                               'expense', 'expenses', 'cost', 'salary', 'wages']
            asset_keywords = ['current assets', 'fixed assets', 'bank accounts', 'bank', 
                             'cash-in-hand', 'cash', 'sundry debtors', 'debtors', 'assets']
            liability_keywords = ['current liabilities', 'liabilities', 'sundry creditors', 
                                 'creditors', 'duties and taxes', 'loans', 'payable']
            
            total_revenue = sum(get_balance(l) for l in ledgers_for_summary 
                               if any(kw in (l.get('parent') or '').lower() for kw in revenue_keywords))
            total_expense = sum(get_balance(l) for l in ledgers_for_summary 
                               if any(kw in (l.get('parent') or '').lower() for kw in expense_keywords))
            total_assets = sum(get_balance(l) for l in ledgers_for_summary 
                              if any(kw in (l.get('parent') or '').lower() for kw in asset_keywords))
            total_liabilities = sum(get_balance(l) for l in ledgers_for_summary 
                                   if any(kw in (l.get('parent') or '').lower() for kw in liability_keywords))
            
            pre_calculated_summary = {
                "total_ledgers": len(ledgers_for_summary),
                "total_vouchers": len(vouchers_for_summary),
                "total_stock_items": len(stock_items_for_summary),
                "total_revenue": total_revenue,
                "total_expense": total_expense,
                "net_profit": total_revenue - total_expense,
                "profit_margin": ((total_revenue - total_expense) / total_revenue * 100) if total_revenue > 0 else 0,
                "total_assets": total_assets,
                "total_liabilities": total_liabilities,
                "total_equity": total_assets - total_liabilities
            }
            
            cache_content = {
                "company": company,
                "ledgers": data.get("ledgers", []),
                "vouchers": data.get("vouchers", []),
                "stock_items": data.get("stock_items", []),
                "groups": data.get("groups", []),
                "metadata": data.get("metadata", {}),
                "summary": pre_calculated_summary  # Pre-calculated summary for faster dashboard loading
            }
            
            if not company_cache:
                company_cache = TallyCache(
                    user_id=user_id,
                    cache_key=f"backup_data_{company_name}",
                    cache_data=json.dumps(cache_content),
                    source="backup"
                )
                db.add(company_cache)
            else:
                company_cache.cache_data = json.dumps(cache_content)
                company_cache.source = "backup"
                company_cache.last_updated = datetime.utcnow()
                company_cache.cached_at = datetime.utcnow()
            
            companies_cached.append(company_name)
        
        db.commit()
        
        return {
            "success": True,
            "message": f"Backup file parsed successfully",
            "filename": file.filename,
            "companies_found": len(companies_cached),
            "companies": companies_cached,
            "total_vouchers": len(data.get("vouchers", [])),
            "total_ledgers": len(data.get("ledgers", [])),
            "total_stock_items": len(data.get("stock_items", [])),
            "metadata": data.get("metadata", {})
        }
        
    except HTTPException as he:
        # Re-raise HTTPException without wrapping (FastAPI handles these specially)
        logger.info(f"HTTPException caught and re-raised: {he.status_code} - {he.detail}")
        raise he
        
    except Exception as e:
        error_trace = traceback.format_exc()
        error_msg = str(e) if str(e) else f"Unknown error ({type(e).__name__})"
        logger.error(f"NON-HTTP Exception caught! Type: {type(e).__name__}")
        logger.error(f"Error message: {error_msg}")
        logger.error(f"Full traceback:\n{error_trace}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False, 
                "error": "Internal server error", 
                "detail": f"Error processing backup file: {error_msg}",
                "trace": error_trace[:1000] if hasattr(Config, 'DEBUG') and Config.DEBUG else None  # Limit trace size
            }
        )
    
    finally:
        # Cleanup temp file
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except:
                pass


@router.get("/companies")
async def get_backup_companies(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user_backup)
):
    """Get list of companies from uploaded backup files - optimized for speed"""
    try:
        user_id = current_user.id if current_user else None
        logger.info(f"Fetching backup companies for user_id={user_id}")
        
        # Optimized query - use filter_by for faster lookup, limit to 1 result
        cache_entry = db.query(TallyCache).filter_by(
            user_id=user_id,
            cache_key="companies",
            source="backup"
        ).first()
        
        # If not found, try without source filter (for backward compatibility)
        if not cache_entry:
            cache_entry = db.query(TallyCache).filter_by(
                user_id=user_id,
                cache_key="companies"
            ).first()
            # If found without source filter, update it to have source='backup'
            if cache_entry:
                cache_entry.source = "backup"
                try:
                    db.commit()
                except Exception as commit_error:
                    logger.warning(f"Error committing source update: {commit_error}")
                    db.rollback()
        
        # If still not found, search ALL users for backup data (shared access)
        if not cache_entry:
            logger.info(f"No backup companies for user {user_id}, searching all users...")
            cache_entry = db.query(TallyCache).filter_by(
                cache_key="companies",
                source="backup"
            ).first()
            if cache_entry:
                logger.info(f"Found backup companies from another user")
        
        if not cache_entry:
            logger.info(f"No backup companies found anywhere")
            return {
                "success": True,
                "companies": [],
                "message": "No backup data available. Please upload a backup file."
            }
        
        # Fast JSON parsing with error handling
        try:
            if isinstance(cache_entry.cache_data, str):
                data = json.loads(cache_entry.cache_data)
            else:
                data = cache_entry.cache_data
            companies = data.get("companies", []) if isinstance(data, dict) else []
        except (json.JSONDecodeError, AttributeError, TypeError) as json_error:
            logger.error(f"Error parsing backup companies data: {json_error}")
            companies = []

        # Safely get last_updated (handle cases where column might not exist)
        try:
            last_updated_str = cache_entry.last_updated.isoformat() if hasattr(cache_entry, 'last_updated') and cache_entry.last_updated else (cache_entry.cached_at.isoformat() if cache_entry.cached_at else datetime.utcnow().isoformat())
        except (AttributeError, TypeError):
            last_updated_str = cache_entry.cached_at.isoformat() if cache_entry.cached_at else datetime.utcnow().isoformat()
        
        logger.info(f"Returning {len(companies)} backup companies for user_id={user_id}")
        
        return {
            "success": True,
            "companies": companies,
            "source": "backup",
            "last_updated": last_updated_str
        }
    except Exception as e:
        logger.error(f"Error in get_backup_companies: {e}", exc_info=True)
        # Return empty list instead of raising error to prevent frontend timeout
        return {
            "success": False,
            "companies": [],
            "source": "backup",
            "error": str(e),
            "message": "Error fetching backup companies. Please try again."
        }


@router.get("/data/{company_name}")
async def get_backup_data(
    company_name: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user_backup)
):
    """Get all data for a company from backup - supports anonymous access"""
    
    user_id = current_user.id if current_user else None
    user_email = current_user.email if current_user else "anonymous"
    
    # Try exact match first
    cache_entry = db.query(TallyCache).filter(
        TallyCache.user_id == user_id,
        TallyCache.cache_key == f"backup_data_{company_name}",
        TallyCache.source == "backup"
    ).first()
    
    # If not found, try without source filter (backward compatibility)
    if not cache_entry:
        cache_entry = db.query(TallyCache).filter(
            TallyCache.user_id == user_id,
            TallyCache.cache_key == f"backup_data_{company_name}"
        ).first()
    
    # If still not found, try case-insensitive search for current user
    if not cache_entry:
        all_backup_entries = db.query(TallyCache).filter(
            TallyCache.user_id == user_id,
            TallyCache.source == "backup"
        ).all()
        
        company_name_lower = company_name.lower()
        for entry in all_backup_entries:
            if entry.cache_key.startswith("backup_data_"):
                try:
                    data = json.loads(entry.cache_data) if isinstance(entry.cache_data, str) else entry.cache_data
                    cached_company = data.get("company", {})
                    cached_company_name = cached_company.get("name", "")
                    if cached_company_name.lower() == company_name_lower:
                        cache_entry = entry
                        break
                except:
                    continue
    
    # If STILL not found, search ALL users for backup data (shared access)
    if not cache_entry:
        logger.info(f"Not found for user {user_id}, searching all users for backup data...")
        all_backup_entries = db.query(TallyCache).filter(
            TallyCache.source == "backup"
        ).all()
        
        company_name_lower = company_name.lower()
        for entry in all_backup_entries:
            if entry.cache_key.startswith("backup_data_"):
                try:
                    data = json.loads(entry.cache_data) if isinstance(entry.cache_data, str) else entry.cache_data
                    cached_company = data.get("company", {})
                    cached_company_name = cached_company.get("name", "")
                    if cached_company_name.lower() == company_name_lower:
                        cache_entry = entry
                        logger.info(f"Found backup data from another user for: '{cached_company_name}'")
                        break
                except:
                    continue
    
    if not cache_entry:
        logger.warning(f"No backup data found for company: {company_name} (user: {user_email})")
        raise HTTPException(
            status_code=404,
            detail=f"No backup data found for company: {company_name}. Please ensure the backup file was uploaded and contains this company."
        )
    
    import json
    try:
        data = json.loads(cache_entry.cache_data) if isinstance(cache_entry.cache_data, str) else cache_entry.cache_data
    except Exception as e:
        logger.error(f"Error deserializing cache data: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error reading cached data"
        )
    
    # Calculate comprehensive summary with analytics
    total_ledgers = len(data.get("ledgers", []))
    total_vouchers = len(data.get("vouchers", []))
    total_stock_items = len(data.get("stock_items", []))
    
    # Calculate financial summary from ledgers
    ledgers = data.get("ledgers", [])
    
    # Try multiple balance field names - comprehensive extraction WITH SIGN PRESERVATION
    def get_balance(ledger, preserve_sign=False):
        """Get balance from any available field, preserving sign if requested
        
        Tally convention: Cr (Credit) = negative, Dr (Debit) = positive
        - Revenue accounts typically have Credit (negative) balances
        - Expense accounts typically have Debit (positive) balances
        """
        # Try all possible balance fields in priority order
        for field in ['current_balance', 'closing_balance', 'balance', 'opening_balance']:
            val = ledger.get(field)
            if val is not None:
                try:
                    if isinstance(val, str):
                        # Check for Cr indicator
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
    # CRITICAL: Revenue typically has CREDIT (negative) balances, Expenses have DEBIT (positive)
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
        
        # Revenue accounts: Typically have CREDIT (negative) balances
        # Use absolute value for display
        if is_revenue and abs_balance > 0:
            total_revenue += abs_balance
        # Expense accounts: Typically have DEBIT (positive) balances  
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
    stock_items = data.get("stock_items", [])
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
    
    # Log summary calculation for debugging
    logger.info(f"Summary calculation for {company_name}:")
    logger.info(f"  - Revenue: {total_revenue:,.2f}")
    logger.info(f"  - Expense: {total_expense:,.2f}")
    logger.info(f"  - Profit: {net_profit:,.2f}")
    logger.info(f"  - Assets: {total_assets:,.2f}")
    logger.info(f"  - Liabilities: {total_liabilities:,.2f}")
    logger.info(f"  - Equity: {total_equity:,.2f}")
    logger.info(f"  - Inventory Value: {total_inventory_value:,.2f}")
    
    summary = {
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
    
    return {
        "success": True,
        "source": "backup",
        "company": data.get("company", {}),
        "ledgers": ledgers,
        "vouchers": data.get("vouchers", []),
        "stock_items": data.get("stock_items", []),
        "groups": data.get("groups", []),
        "summary": summary,
        "metadata": data.get("metadata", {}),
        "last_updated": cache_entry.last_updated.isoformat() if hasattr(cache_entry, 'last_updated') and cache_entry.last_updated else (cache_entry.cached_at.isoformat() if cache_entry.cached_at else datetime.utcnow().isoformat())
    }


@router.delete("/clear")
async def clear_backup_data(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user_backup)
):
    """Clear all backup data for current user - supports anonymous access"""
    
    user_id = current_user.id if current_user else None
    
    deleted = db.query(TallyCache).filter(
        TallyCache.user_id == user_id,
        TallyCache.source == "backup"
    ).delete()
    
    db.commit()
    
    return {
        "success": True,
        "message": f"Cleared {deleted} backup cache entries"
    }

