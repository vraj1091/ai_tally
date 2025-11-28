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
        """Normalize a ledger entry to ensure consistent structure - PRESERVES ALL BALANCE FIELDS"""
        if not isinstance(ledger, dict):
            return {}
        
        # Helper function to extract numeric value from any field
        def extract_balance_value(val):
            """Extract numeric balance from string or number"""
            if val is None:
                return 0.0
            try:
                if isinstance(val, str):
                    cleaned = val.replace('₹', '').replace(',', '').replace('Dr', '').replace('Cr', '').strip()
                    return abs(float(cleaned)) if cleaned else 0.0
                else:
                    return abs(float(val))
            except (ValueError, TypeError):
                return 0.0
        
        # PRESERVE ALL BALANCE FIELDS - don't consolidate into one value
        # This ensures extraction logic can use whichever field has data
        
        # Extract balance from multiple possible field names
        balance = 0.0
        closing_balance = 0.0
        current_balance = 0.0
        opening_balance = 0.0
        
        # Try all possible balance field names and preserve each
        balance_fields = {
            'balance': ['balance', 'BALANCE', 'Balance'],
            'closing_balance': ['closing_balance', 'CLOSINGBALANCE', 'closingbalance', 'Closing Balance'],
            'current_balance': ['current_balance', 'CURRENTBALANCE', 'currentbalance', 'Current Balance'],
            'opening_balance': ['opening_balance', 'OPENINGBALANCE', 'openingbalance', 'Opening Balance']
        }
        
        # Extract each balance field separately
        for balance_type, field_names in balance_fields.items():
            for field_name in field_names:
                val = ledger.get(field_name)
                if val is not None:
                    extracted = extract_balance_value(val)
                    if extracted > 0:
                        if balance_type == 'balance':
                            balance = extracted
                        elif balance_type == 'closing_balance':
                            closing_balance = extracted
                        elif balance_type == 'current_balance':
                            current_balance = extracted
                        elif balance_type == 'opening_balance':
                            opening_balance = extracted
                        break
        
        # Use the highest non-zero balance as the primary balance
        primary_balance = max(balance, closing_balance, current_balance, opening_balance)
        if primary_balance == 0:
            primary_balance = balance  # Fallback to balance field
        
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
            'balance': primary_balance,  # Primary balance (highest non-zero)
            'closing_balance': closing_balance if closing_balance > 0 else primary_balance,  # Preserve original or use primary
            'current_balance': current_balance if current_balance > 0 else primary_balance,  # Preserve original or use primary
            'opening_balance': opening_balance if opening_balance > 0 else (ledger.get('opening_balance', 0) or 0),  # Preserve original
            'guid': ledger.get('guid') or ledger.get('GUID', ''),
            'is_revenue': ledger.get('is_revenue', False) or (ledger.get('ISREVENUE', '').upper() == 'YES'),
            'is_deemed_positive': ledger.get('is_deemed_positive', False),
            # PRESERVE ALL ORIGINAL FIELDS for maximum compatibility
            **{k: v for k, v in ledger.items() if k not in ['name', 'parent', 'balance', 'closing_balance', 'current_balance', 'opening_balance', 'guid', 'is_revenue', 'is_deemed_positive']}
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

