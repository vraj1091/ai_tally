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

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/upload")
async def upload_tbk_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload and parse a Tally .tbk backup file
    
    This allows viewing Tally data without running Tally ERP
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
        # Check file size (100 MB limit)
        MAX_FILE_SIZE = 100 * 1024 * 1024  # 100 MB
        
        # Save uploaded file temporarily
        logger.info(f"Starting upload for {file.filename} from user {current_user.email}")
        with tempfile.NamedTemporaryFile(delete=False, suffix='.tbk') as temp_file:
            content = await file.read()
            file_size = len(content)
            
            if file_size > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=413,
                    detail=f"File too large. Maximum size is 100 MB, received {file_size / (1024*1024):.2f} MB"
                )
            
            temp_file.write(content)
            temp_path = temp_file.name
        
        logger.info(f"User {current_user.email} uploaded {file.filename} ({file_size / (1024*1024):.2f} MB)")
        
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
        
        for company in companies_list:
            company_name = company["name"]
            
            # Cache companies list
            cache_entry = db.query(TallyCache).filter(
                TallyCache.user_id == current_user.id,
                TallyCache.cache_key == "companies"
            ).first()
            
            if not cache_entry:
                cache_entry = TallyCache(
                    user_id=current_user.id,
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
                TallyCache.user_id == current_user.id,
                TallyCache.cache_key == f"backup_data_{company_name}"
            ).first()
            
            cache_content = {
                "company": company,
                "ledgers": data.get("ledgers", []),
                "vouchers": data.get("vouchers", []),
                "stock_items": data.get("stock_items", []),
                "groups": data.get("groups", []),
                "metadata": data.get("metadata", {})
            }
            
            if not company_cache:
                company_cache = TallyCache(
                    user_id=current_user.id,
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
    current_user: User = Depends(get_current_user)
):
    """Get list of companies from uploaded backup files - optimized for speed"""
    try:
        user_email = current_user.email if current_user else "anonymous"
        logger.info(f"Fetching backup companies for user {user_email}")
        
        # Optimized query - use filter_by for faster lookup, limit to 1 result
        cache_entry = db.query(TallyCache).filter_by(
            user_id=current_user.id,
            cache_key="companies",
            source="backup"
        ).first()
        
        # If not found, try without source filter (for backward compatibility)
        if not cache_entry:
            cache_entry = db.query(TallyCache).filter_by(
                user_id=current_user.id,
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
        
        if not cache_entry:
            logger.info(f"No backup companies found for user {current_user.email}")
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
        
        logger.info(f"Returning {len(companies)} backup companies for user {current_user.email}")
        
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
    current_user: User = Depends(get_current_user)
):
    """Get all data for a company from backup"""
    
    # Try exact match first
    cache_entry = db.query(TallyCache).filter(
        TallyCache.user_id == current_user.id,
        TallyCache.cache_key == f"backup_data_{company_name}",
        TallyCache.source == "backup"
    ).first()
    
    # If not found, try without source filter (backward compatibility)
    if not cache_entry:
        cache_entry = db.query(TallyCache).filter(
            TallyCache.user_id == current_user.id,
            TallyCache.cache_key == f"backup_data_{company_name}"
        ).first()
    
    # If still not found, try case-insensitive search
    if not cache_entry:
        # Get all backup cache entries for this user
        all_backup_entries = db.query(TallyCache).filter(
            TallyCache.user_id == current_user.id,
            TallyCache.source == "backup"
        ).all()
        
        # Try to find a match by checking company names in cache data
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
    
    if not cache_entry:
        logger.warning(f"No backup data found for company: {company_name} (user: {current_user.email})")
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
    
    # Try multiple balance field names - comprehensive extraction
    def get_balance(ledger):
        """Get balance from any available field, prioritizing closing/current balance"""
        balance = 0.0
        # Try all possible balance fields in priority order
        for field in ['current_balance', 'closing_balance', 'balance', 'opening_balance']:
            val = ledger.get(field)
            if val:
                try:
                    balance = abs(float(val))
                    if balance > 0:
                        return balance
                except:
                    continue
        return 0.0
    
    total_debit = sum(get_balance(l) for l in ledgers if get_balance(l) > 0)
    total_credit = sum(abs(get_balance(l)) for l in ledgers if get_balance(l) < 0)
    
    # Calculate revenue and expenses from ledgers
    revenue_keywords = ['sales', 'income', 'revenue', 'receipt', 'service income', 
                       'other income', 'commission', 'discount received']
    expense_keywords = ['expense', 'purchase', 'cost', 'payment', 'salary', 'rent']
    
    total_revenue = 0.0
    total_expense = 0.0
    
    for ledger in ledgers:
        parent = (ledger.get("parent") or "").lower()
        name = (ledger.get("name") or "").lower()
        
        # Get balance from all possible fields
        balance = get_balance(ledger)
        abs_balance = balance  # get_balance already returns absolute value
        
        is_revenue = any(kw in parent or kw in name for kw in revenue_keywords) or ledger.get("is_revenue", False)
        is_expense = any(kw in parent or kw in name for kw in expense_keywords)
        
        # For revenue: use absolute balance if it's a revenue account
        if is_revenue and abs_balance > 0:
            total_revenue += abs_balance
        # For expense: use absolute balance if it's an expense account
        elif is_expense and abs_balance > 0:
            total_expense += abs_balance
    
    net_profit = total_revenue - total_expense
    profit_margin = (net_profit / total_revenue * 100) if total_revenue > 0 else 0
    
    # Calculate assets and liabilities
    asset_keywords = ['asset', 'bank', 'cash', 'investment', 'fixed asset']
    liability_keywords = ['liability', 'loan', 'capital', 'payable', 'debt']
    
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
    current_user: User = Depends(get_current_user)
):
    """Clear all backup data for current user"""
    
    deleted = db.query(TallyCache).filter(
        TallyCache.user_id == current_user.id,
        TallyCache.source == "backup"
    ).delete()
    
    db.commit()
    
    return {
        "success": True,
        "message": f"Cleared {deleted} backup cache entries"
    }

