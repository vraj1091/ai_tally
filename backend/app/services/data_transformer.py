"""
Data Transformer - Normalizes and validates data from different sources
Ensures consistent data structure for analytics
"""
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)


class DataTransformer:
    """Transform and normalize data from Tally (live or backup)"""
    
    @staticmethod
    def normalize_ledger(ledger: Dict) -> Dict:
        """Normalize a ledger entry to ensure consistent structure"""
        if not isinstance(ledger, dict):
            return {}
        
        # Extract balance - try multiple field names and use opening if closing is 0
        balance = 0.0
        opening_balance = 0.0
        
        # Try closing balance first
        for field in ['closing_balance', 'current_balance', 'balance', 'BALANCE', 'CLOSINGBALANCE']:
            val = ledger.get(field)
            if val is not None:
                try:
                    if isinstance(val, str):
                        cleaned = val.replace('₹', '').replace(',', '').replace('Dr', '').replace('Cr', '').strip()
                        balance = abs(float(cleaned)) if cleaned else 0.0
                    else:
                        balance = abs(float(val))
                    if balance > 0:
                        break
                except (ValueError, TypeError):
                    continue
        
        # If closing balance is 0, try opening balance (for income/expense accounts)
        if balance == 0:
            for field in ['opening_balance', 'OPENINGBALANCE', 'opening_bal']:
                val = ledger.get(field)
                if val is not None:
                    try:
                        if isinstance(val, str):
                            cleaned = val.replace('₹', '').replace(',', '').replace('Dr', '').replace('Cr', '').strip()
                            opening_balance = abs(float(cleaned)) if cleaned else 0.0
                        else:
                            opening_balance = abs(float(val))
                        if opening_balance > 0:
                            balance = opening_balance  # Use opening as fallback
                            break
                    except (ValueError, TypeError):
                        continue
        
        # Extract parent - try multiple field names
        parent = (ledger.get('parent') or 
                 ledger.get('PARENT') or 
                 ledger.get('group') or 
                 ledger.get('GROUP') or 
                 '').strip()
        
        # Extract name
        name = (ledger.get('name') or 
               ledger.get('NAME') or 
               '').strip()
        
        return {
            'name': name,
            'parent': parent,
            'balance': balance,
            'closing_balance': balance,  # Alias for compatibility
            'current_balance': balance,   # Alias for compatibility
            'opening_balance': float(ledger.get('opening_balance', 0) or 0),
            'guid': ledger.get('guid') or ledger.get('GUID', ''),
            'is_revenue': ledger.get('is_revenue', False) or (ledger.get('ISREVENUE', '').upper() == 'YES'),
            'is_deemed_positive': ledger.get('is_deemed_positive', False)
        }
    
    @staticmethod
    def normalize_ledgers(ledgers: List[Dict]) -> List[Dict]:
        """Normalize a list of ledgers"""
        if not ledgers:
            return []
        
        normalized = []
        for ledger in ledgers:
            normalized_ledger = DataTransformer.normalize_ledger(ledger)
            if normalized_ledger.get('name'):  # Only include if has name
                normalized.append(normalized_ledger)
        
        return normalized
    
    @staticmethod
    def normalize_voucher(voucher: Dict) -> Dict:
        """Normalize a voucher entry"""
        if not isinstance(voucher, dict):
            return {}
        
        # Extract amount
        amount = 0.0
        for field in ['amount', 'AMOUNT', 'value', 'VALUE']:
            val = voucher.get(field)
            if val is not None:
                try:
                    if isinstance(val, str):
                        cleaned = val.replace('₹', '').replace(',', '').strip()
                        amount = abs(float(cleaned)) if cleaned else 0.0
                    else:
                        amount = abs(float(val))
                    if amount > 0:
                        break
                except (ValueError, TypeError):
                    continue
        
        return {
            'voucher_type': (voucher.get('voucher_type') or voucher.get('VOUCHERTYPE') or '').lower(),
            'amount': amount,
            'date': voucher.get('date') or voucher.get('DATE', ''),
            'party_name': voucher.get('party_name') or voucher.get('PARTYNAME', ''),
            'narration': voucher.get('narration') or voucher.get('NARRATION', '')
        }
    
    @staticmethod
    def normalize_vouchers(vouchers: List[Dict]) -> List[Dict]:
        """Normalize a list of vouchers"""
        if not vouchers:
            return []
        
        normalized = []
        for voucher in vouchers:
            normalized_voucher = DataTransformer.normalize_voucher(voucher)
            if normalized_voucher.get('amount', 0) > 0:  # Only include if has amount
                normalized.append(normalized_voucher)
        
        return normalized
    
    @staticmethod
    def calculate_revenue_from_vouchers(vouchers: List[Dict]) -> float:
        """Calculate revenue from sales vouchers as fallback"""
        if not vouchers:
            return 0.0
        
        sales_keywords = ['sales', 'sale', 'receipt', 'income', 'credit note']
        revenue = 0.0
        
        for voucher in vouchers:
            vtype = voucher.get('voucher_type', '').lower()
            if any(keyword in vtype for keyword in sales_keywords):
                revenue += voucher.get('amount', 0)
        
        return revenue
    
    @staticmethod
    def calculate_expense_from_vouchers(vouchers: List[Dict]) -> float:
        """Calculate expense from payment/purchase vouchers as fallback"""
        if not vouchers:
            return 0.0
        
        expense_keywords = ['payment', 'purchase', 'purchases', 'expense', 'debit note']
        expense = 0.0
        
        for voucher in vouchers:
            vtype = voucher.get('voucher_type', '').lower()
            if any(keyword in vtype for keyword in expense_keywords):
                expense += voucher.get('amount', 0)
        
        return expense

