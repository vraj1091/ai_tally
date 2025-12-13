"""
Cache Manager Service
Handles clearing and refreshing cached Tally data when live connection is established
"""

import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import delete

from app.models.database import (
    CachedCompany, CachedLedger, CachedVoucher, CachedGroup,
    CachedStockItem, CachedStockGroup, CachedGodown, CachedBatch,
    CachedGSTData, CachedCostCenter, CachedBudget, CachedParty,
    CachedBill, CachedBankTransaction, CachedAnalytics, CachedDashboard,
    CachedUnit, TallyCache
)

logger = logging.getLogger(__name__)


class CacheManager:
    """
    Manages Tally data cache - clears old data and stores fresh data from live Tally
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    # ==================== CLEAR CACHE ====================
    
    def clear_company_cache(self, company_name: str) -> Dict[str, int]:
        """
        Clear all cached data for a specific company
        Called when Tally connects to refresh data
        """
        logger.info(f"🗑️ Clearing cache for company: {company_name}")
        
        deleted_counts = {}
        
        try:
            # Clear ledgers
            result = self.db.execute(
                delete(CachedLedger).where(CachedLedger.company_name == company_name)
            )
            deleted_counts['ledgers'] = result.rowcount
            
            # Clear vouchers
            result = self.db.execute(
                delete(CachedVoucher).where(CachedVoucher.company_name == company_name)
            )
            deleted_counts['vouchers'] = result.rowcount
            
            # Clear groups
            result = self.db.execute(
                delete(CachedGroup).where(CachedGroup.company_name == company_name)
            )
            deleted_counts['groups'] = result.rowcount
            
            # Clear stock items
            result = self.db.execute(
                delete(CachedStockItem).where(CachedStockItem.company_name == company_name)
            )
            deleted_counts['stock_items'] = result.rowcount
            
            # Clear stock groups
            result = self.db.execute(
                delete(CachedStockGroup).where(CachedStockGroup.company_name == company_name)
            )
            deleted_counts['stock_groups'] = result.rowcount
            
            # Clear godowns
            result = self.db.execute(
                delete(CachedGodown).where(CachedGodown.company_name == company_name)
            )
            deleted_counts['godowns'] = result.rowcount
            
            # Clear batches
            result = self.db.execute(
                delete(CachedBatch).where(CachedBatch.company_name == company_name)
            )
            deleted_counts['batches'] = result.rowcount
            
            # Clear GST data
            result = self.db.execute(
                delete(CachedGSTData).where(CachedGSTData.company_name == company_name)
            )
            deleted_counts['gst_data'] = result.rowcount
            
            # Clear cost centers
            result = self.db.execute(
                delete(CachedCostCenter).where(CachedCostCenter.company_name == company_name)
            )
            deleted_counts['cost_centers'] = result.rowcount
            
            # Clear budgets
            result = self.db.execute(
                delete(CachedBudget).where(CachedBudget.company_name == company_name)
            )
            deleted_counts['budgets'] = result.rowcount
            
            # Clear parties
            result = self.db.execute(
                delete(CachedParty).where(CachedParty.company_name == company_name)
            )
            deleted_counts['parties'] = result.rowcount
            
            # Clear bills
            result = self.db.execute(
                delete(CachedBill).where(CachedBill.company_name == company_name)
            )
            deleted_counts['bills'] = result.rowcount
            
            # Clear bank transactions
            result = self.db.execute(
                delete(CachedBankTransaction).where(CachedBankTransaction.company_name == company_name)
            )
            deleted_counts['bank_transactions'] = result.rowcount
            
            # Clear analytics
            result = self.db.execute(
                delete(CachedAnalytics).where(CachedAnalytics.company_name == company_name)
            )
            deleted_counts['analytics'] = result.rowcount
            
            # Clear dashboards
            result = self.db.execute(
                delete(CachedDashboard).where(CachedDashboard.company_name == company_name)
            )
            deleted_counts['dashboards'] = result.rowcount
            
            # Clear units
            result = self.db.execute(
                delete(CachedUnit).where(CachedUnit.company_name == company_name)
            )
            deleted_counts['units'] = result.rowcount
            
            self.db.commit()
            
            total_deleted = sum(deleted_counts.values())
            logger.info(f"✅ Cleared {total_deleted} cached records for {company_name}")
            logger.info(f"   Details: {deleted_counts}")
            
            return deleted_counts
            
        except Exception as e:
            logger.error(f"❌ Error clearing cache for {company_name}: {e}")
            self.db.rollback()
            raise
    
    def clear_all_cache(self) -> Dict[str, int]:
        """Clear ALL cached data (use with caution)"""
        logger.warning("🗑️ Clearing ALL cached data!")
        
        deleted_counts = {}
        
        try:
            tables = [
                ('ledgers', CachedLedger),
                ('vouchers', CachedVoucher),
                ('groups', CachedGroup),
                ('stock_items', CachedStockItem),
                ('stock_groups', CachedStockGroup),
                ('godowns', CachedGodown),
                ('batches', CachedBatch),
                ('gst_data', CachedGSTData),
                ('cost_centers', CachedCostCenter),
                ('budgets', CachedBudget),
                ('parties', CachedParty),
                ('bills', CachedBill),
                ('bank_transactions', CachedBankTransaction),
                ('analytics', CachedAnalytics),
                ('dashboards', CachedDashboard),
                ('units', CachedUnit),
                ('companies', CachedCompany),
            ]
            
            for name, model in tables:
                result = self.db.execute(delete(model))
                deleted_counts[name] = result.rowcount
            
            self.db.commit()
            
            total_deleted = sum(deleted_counts.values())
            logger.info(f"✅ Cleared {total_deleted} total cached records")
            
            return deleted_counts
            
        except Exception as e:
            logger.error(f"❌ Error clearing all cache: {e}")
            self.db.rollback()
            raise
    
    # ==================== STORE DATA ====================
    
    def store_ledgers(self, company_name: str, ledgers: List[Dict]) -> int:
        """Store ledgers in cache"""
        logger.info(f"💾 Storing {len(ledgers)} ledgers for {company_name}")
        
        try:
            for ledger in ledgers:
                cached = CachedLedger(
                    company_name=company_name,
                    name=ledger.get('name', ''),
                    guid=ledger.get('guid'),
                    parent=ledger.get('parent'),
                    primary_group=ledger.get('primary_group') or ledger.get('group'),
                    opening_balance=float(ledger.get('opening_balance', 0) or 0),
                    closing_balance=float(ledger.get('closing_balance', 0) or ledger.get('balance', 0) or 0),
                    is_revenue=ledger.get('is_revenue', False),
                    is_expense=ledger.get('is_expense', False),
                )
                self.db.add(cached)
            
            self.db.commit()
            logger.info(f"✅ Stored {len(ledgers)} ledgers")
            return len(ledgers)
            
        except Exception as e:
            logger.error(f"❌ Error storing ledgers: {e}")
            self.db.rollback()
            raise
    
    def store_vouchers(self, company_name: str, vouchers: List[Dict]) -> int:
        """Store vouchers in cache"""
        logger.info(f"💾 Storing {len(vouchers)} vouchers for {company_name}")
        
        try:
            for voucher in vouchers:
                cached = CachedVoucher(
                    company_name=company_name,
                    voucher_number=voucher.get('voucher_number', voucher.get('number', '')),
                    voucher_type=voucher.get('voucher_type', voucher.get('type', '')),
                    date=voucher.get('date', ''),
                    reference_number=voucher.get('reference', voucher.get('ref', '')),
                    narration=voucher.get('narration', ''),
                    amount=float(voucher.get('amount', 0) or 0),
                    party_name=voucher.get('party_name', voucher.get('party', '')),
                )
                self.db.add(cached)
            
            self.db.commit()
            logger.info(f"✅ Stored {len(vouchers)} vouchers")
            return len(vouchers)
            
        except Exception as e:
            logger.error(f"❌ Error storing vouchers: {e}")
            self.db.rollback()
            raise
    
    def store_groups(self, company_name: str, groups: List[Dict]) -> int:
        """Store groups in cache"""
        logger.info(f"💾 Storing {len(groups)} groups for {company_name}")
        
        try:
            for group in groups:
                cached = CachedGroup(
                    company_name=company_name,
                    name=group.get('name', ''),
                    guid=group.get('guid'),
                    parent=group.get('parent'),
                    primary_group=group.get('primary_group'),
                    is_revenue=group.get('is_revenue', False),
                    is_expense=group.get('is_expense', False),
                    nature=group.get('nature'),
                )
                self.db.add(cached)
            
            self.db.commit()
            logger.info(f"✅ Stored {len(groups)} groups")
            return len(groups)
            
        except Exception as e:
            logger.error(f"❌ Error storing groups: {e}")
            self.db.rollback()
            raise
    
    def store_stock_items(self, company_name: str, items: List[Dict]) -> int:
        """Store stock items in cache"""
        logger.info(f"💾 Storing {len(items)} stock items for {company_name}")
        
        try:
            for item in items:
                cached = CachedStockItem(
                    company_name=company_name,
                    name=item.get('name', ''),
                    guid=item.get('guid'),
                    parent=item.get('parent', item.get('group', '')),
                    category=item.get('category'),
                    unit=item.get('unit', item.get('uom', '')),
                    opening_balance=float(item.get('opening_balance', 0) or 0),
                    opening_value=float(item.get('opening_value', 0) or 0),
                    closing_balance=float(item.get('closing_balance', 0) or 0),
                    closing_value=float(item.get('closing_value', 0) or 0),
                    rate=float(item.get('rate', 0) or 0),
                    gst_rate=float(item.get('gst_rate', 0) or 0),
                    hsn_code=item.get('hsn_code', item.get('hsn', '')),
                )
                self.db.add(cached)
            
            self.db.commit()
            logger.info(f"✅ Stored {len(items)} stock items")
            return len(items)
            
        except Exception as e:
            logger.error(f"❌ Error storing stock items: {e}")
            self.db.rollback()
            raise
    
    def store_parties(self, company_name: str, parties: List[Dict]) -> int:
        """Store party details in cache"""
        logger.info(f"💾 Storing {len(parties)} parties for {company_name}")
        
        try:
            for party in parties:
                cached = CachedParty(
                    company_name=company_name,
                    name=party.get('name', ''),
                    ledger_name=party.get('ledger_name', party.get('name', '')),
                    party_type=party.get('party_type', 'Customer'),
                    gstin=party.get('gstin', party.get('gst_number', '')),
                    pan=party.get('pan', ''),
                    address=party.get('address', ''),
                    city=party.get('city', ''),
                    state=party.get('state', ''),
                    pincode=party.get('pincode', ''),
                    phone=party.get('phone', party.get('mobile', '')),
                    email=party.get('email', ''),
                    outstanding=float(party.get('outstanding', 0) or 0),
                )
                self.db.add(cached)
            
            self.db.commit()
            logger.info(f"✅ Stored {len(parties)} parties")
            return len(parties)
            
        except Exception as e:
            logger.error(f"❌ Error storing parties: {e}")
            self.db.rollback()
            raise
    
    def store_analytics(self, company_name: str, analytics: Dict) -> bool:
        """Store analytics summary in cache"""
        logger.info(f"💾 Storing analytics for {company_name}")
        
        try:
            # Delete existing analytics for this company
            self.db.execute(
                delete(CachedAnalytics).where(CachedAnalytics.company_name == company_name)
            )
            
            cached = CachedAnalytics(
                company_name=company_name,
                total_revenue=float(analytics.get('total_revenue', 0) or 0),
                total_expense=float(analytics.get('total_expense', 0) or 0),
                net_profit=float(analytics.get('net_profit', 0) or 0),
                profit_margin=float(analytics.get('profit_margin', 0) or 0),
                health_score=float(analytics.get('health_score', 0) or 0),
            )
            self.db.add(cached)
            self.db.commit()
            
            logger.info(f"✅ Stored analytics for {company_name}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error storing analytics: {e}")
            self.db.rollback()
            raise
    
    # ==================== REFRESH DATA FROM TALLY ====================
    
    def refresh_company_data(
        self,
        company_name: str,
        ledgers: List[Dict] = None,
        vouchers: List[Dict] = None,
        groups: List[Dict] = None,
        stock_items: List[Dict] = None,
        parties: List[Dict] = None,
        analytics: Dict = None
    ) -> Dict[str, Any]:
        """
        Clear old cache and store fresh data from Tally
        This is the main method called when Tally connects
        """
        logger.info(f"🔄 Refreshing all data for company: {company_name}")
        
        result = {
            'company': company_name,
            'cleared': {},
            'stored': {},
            'timestamp': datetime.utcnow().isoformat()
        }
        
        try:
            # Step 1: Clear existing cache
            result['cleared'] = self.clear_company_cache(company_name)
            
            # Step 2: Store new data
            if ledgers:
                result['stored']['ledgers'] = self.store_ledgers(company_name, ledgers)
            
            if vouchers:
                result['stored']['vouchers'] = self.store_vouchers(company_name, vouchers)
            
            if groups:
                result['stored']['groups'] = self.store_groups(company_name, groups)
            
            if stock_items:
                result['stored']['stock_items'] = self.store_stock_items(company_name, stock_items)
            
            if parties:
                result['stored']['parties'] = self.store_parties(company_name, parties)
            
            if analytics:
                result['stored']['analytics'] = self.store_analytics(company_name, analytics)
            
            logger.info(f"✅ Refresh complete for {company_name}")
            logger.info(f"   Stored: {result['stored']}")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Error refreshing company data: {e}")
            raise
    
    # ==================== GET CACHED DATA ====================
    
    def get_cached_ledgers(self, company_name: str) -> List[Dict]:
        """Get ledgers from cache"""
        ledgers = self.db.query(CachedLedger).filter(
            CachedLedger.company_name == company_name
        ).all()
        
        return [
            {
                'name': l.name,
                'guid': l.guid,
                'parent': l.parent,
                'primary_group': l.primary_group,
                'opening_balance': l.opening_balance,
                'closing_balance': l.closing_balance,
                'is_revenue': l.is_revenue,
                'is_expense': l.is_expense,
            }
            for l in ledgers
        ]
    
    def get_cached_vouchers(self, company_name: str) -> List[Dict]:
        """Get vouchers from cache"""
        vouchers = self.db.query(CachedVoucher).filter(
            CachedVoucher.company_name == company_name
        ).all()
        
        return [
            {
                'voucher_number': v.voucher_number,
                'voucher_type': v.voucher_type,
                'date': v.date,
                'reference': v.reference_number,
                'narration': v.narration,
                'amount': v.amount,
                'party_name': v.party_name,
            }
            for v in vouchers
        ]
    
    def get_cached_analytics(self, company_name: str) -> Optional[Dict]:
        """Get analytics from cache"""
        analytics = self.db.query(CachedAnalytics).filter(
            CachedAnalytics.company_name == company_name
        ).first()
        
        if analytics:
            return {
                'total_revenue': analytics.total_revenue,
                'total_expense': analytics.total_expense,
                'net_profit': analytics.net_profit,
                'profit_margin': analytics.profit_margin,
                'health_score': analytics.health_score,
                'cached_at': analytics.cached_at.isoformat() if analytics.cached_at else None,
            }
        return None
    
    def get_cache_status(self, company_name: str) -> Dict[str, Any]:
        """Get cache status for a company"""
        return {
            'company': company_name,
            'ledgers': self.db.query(CachedLedger).filter(CachedLedger.company_name == company_name).count(),
            'vouchers': self.db.query(CachedVoucher).filter(CachedVoucher.company_name == company_name).count(),
            'groups': self.db.query(CachedGroup).filter(CachedGroup.company_name == company_name).count(),
            'stock_items': self.db.query(CachedStockItem).filter(CachedStockItem.company_name == company_name).count(),
            'parties': self.db.query(CachedParty).filter(CachedParty.company_name == company_name).count(),
            'has_analytics': self.db.query(CachedAnalytics).filter(CachedAnalytics.company_name == company_name).count() > 0,
        }

