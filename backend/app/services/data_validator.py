"""
Data Validator - Comprehensive validation and error handling for Tally data
Ensures data completeness, consistency, and accuracy
"""

import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime

logger = logging.getLogger(__name__)


class DataValidator:
    """Validates and ensures data quality for Tally data"""
    
    @staticmethod
    def validate_ledger_data(ledgers: List[Dict]) -> Tuple[bool, List[str], Dict]:
        """
        Validate ledger data completeness and consistency
        
        Returns:
            (is_valid, errors, validated_data)
        """
        errors = []
        validated_ledgers = []
        
        if not ledgers:
            errors.append("No ledgers found in data")
            return False, errors, {"ledgers": [], "summary": {}}
        
        # Required fields for a valid ledger
        required_fields = ['name']
        balance_fields = ['balance', 'closing_balance', 'current_balance', 'opening_balance']
        
        total_balance = 0.0
        ledgers_with_balance = 0
        debtors_count = 0
        creditors_count = 0
        
        for ledger in ledgers:
            # Check required fields
            if not ledger.get('name'):
                continue  # Skip invalid ledgers
            
            # Validate balance fields
            has_balance = False
            balance_value = 0.0
            
            for field in balance_fields:
                val = ledger.get(field)
                if val is not None and val != '':
                    try:
                        balance_value = abs(float(val))
                        if balance_value > 0:
                            has_balance = True
                            total_balance += balance_value
                            break
                    except (ValueError, TypeError):
                        continue
            
            if has_balance:
                ledgers_with_balance += 1
            
            # Count debtors and creditors
            parent = (ledger.get('parent') or '').lower()
            name = (ledger.get('name') or '').lower()
            
            if 'debtor' in parent or 'debtor' in name:
                debtors_count += 1
            if 'creditor' in parent or 'creditor' in name:
                creditors_count += 1
            
            validated_ledgers.append(ledger)
        
        # Validation checks
        if len(validated_ledgers) == 0:
            errors.append("No valid ledgers found after validation")
        
        if ledgers_with_balance == 0:
            errors.append("Warning: No ledgers with non-zero balances found")
        
        summary = {
            "total_ledgers": len(validated_ledgers),
            "ledgers_with_balance": ledgers_with_balance,
            "total_balance": total_balance,
            "debtors_count": debtors_count,
            "creditors_count": creditors_count
        }
        
        is_valid = len(validated_ledgers) > 0
        
        if errors:
            logger.warning(f"Ledger validation issues: {errors}")
        
        return is_valid, errors, {
            "ledgers": validated_ledgers,
            "summary": summary
        }
    
    @staticmethod
    def validate_voucher_data(vouchers: List[Dict]) -> Tuple[bool, List[str], Dict]:
        """
        Validate voucher data completeness and consistency
        
        Returns:
            (is_valid, errors, validated_data)
        """
        errors = []
        validated_vouchers = []
        
        if not vouchers:
            errors.append("No vouchers found in data")
            return False, errors, {"vouchers": [], "summary": {}}
        
        total_amount = 0.0
        vouchers_with_amount = 0
        sales_count = 0
        purchase_count = 0
        payment_count = 0
        
        for voucher in vouchers:
            # Validate amount
            amount = 0.0
            for field in ['amount', 'AMOUNT', 'value', 'VALUE']:
                val = voucher.get(field)
                if val is not None and val != '':
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
            
            if amount > 0:
                vouchers_with_amount += 1
                total_amount += amount
            
            # Count by type
            vtype = (voucher.get('voucher_type', '') or voucher.get('VOUCHERTYPE', '') or '').lower()
            if 'sales' in vtype or 'sale' in vtype:
                sales_count += 1
            elif 'purchase' in vtype or 'purchases' in vtype:
                purchase_count += 1
            elif 'payment' in vtype:
                payment_count += 1
            
            validated_vouchers.append(voucher)
        
        # Validation checks
        if len(validated_vouchers) == 0:
            errors.append("No valid vouchers found after validation")
        
        if vouchers_with_amount == 0:
            errors.append("Warning: No vouchers with non-zero amounts found")
        
        summary = {
            "total_vouchers": len(validated_vouchers),
            "vouchers_with_amount": vouchers_with_amount,
            "total_amount": total_amount,
            "sales_count": sales_count,
            "purchase_count": purchase_count,
            "payment_count": payment_count
        }
        
        is_valid = len(validated_vouchers) > 0
        
        if errors:
            logger.warning(f"Voucher validation issues: {errors}")
        
        return is_valid, errors, {
            "vouchers": validated_vouchers,
            "summary": summary
        }
    
    @staticmethod
    def validate_stock_data(stock_items: List[Dict]) -> Tuple[bool, List[str], Dict]:
        """
        Validate stock item data completeness
        
        Returns:
            (is_valid, errors, validated_data)
        """
        errors = []
        validated_stock = []
        
        if not stock_items:
            errors.append("No stock items found in data")
            return False, errors, {"stock_items": [], "summary": {}}
        
        total_value = 0.0
        items_with_value = 0
        
        for item in stock_items:
            if not item.get('name'):
                continue
            
            # Validate value/quantity
            value = 0.0
            for field in ['value', 'balance', 'closing_balance', 'current_balance', 'quantity']:
                val = item.get(field)
                if val is not None and val != '':
                    try:
                        value = abs(float(val))
                        if value > 0:
                            break
                    except (ValueError, TypeError):
                        continue
            
            if value > 0:
                items_with_value += 1
                total_value += value
            
            validated_stock.append(item)
        
        summary = {
            "total_items": len(validated_stock),
            "items_with_value": items_with_value,
            "total_value": total_value
        }
        
        is_valid = len(validated_stock) > 0
        
        if errors:
            logger.warning(f"Stock validation issues: {errors}")
        
        return is_valid, errors, {
            "stock_items": validated_stock,
            "summary": summary
        }
    
    @staticmethod
    def validate_all_data(data: Dict) -> Dict:
        """
        Comprehensive validation of all Tally data
        
        Returns:
            {
                "is_valid": bool,
                "errors": List[str],
                "warnings": List[str],
                "validated_data": Dict,
                "summary": Dict
            }
        """
        all_errors = []
        all_warnings = []
        validated_data = {}
        summary = {}
        
        # Validate ledgers
        ledgers = data.get("ledgers", [])
        ledgers_valid, ledger_errors, ledger_data = DataValidator.validate_ledger_data(ledgers)
        validated_data["ledgers"] = ledger_data["ledgers"]
        summary["ledgers"] = ledger_data["summary"]
        
        if not ledgers_valid:
            all_errors.extend(ledger_errors)
        else:
            all_warnings.extend([e for e in ledger_errors if "Warning" in e])
        
        # Validate vouchers
        vouchers = data.get("vouchers", [])
        vouchers_valid, voucher_errors, voucher_data = DataValidator.validate_voucher_data(vouchers)
        validated_data["vouchers"] = voucher_data["vouchers"]
        summary["vouchers"] = voucher_data["summary"]
        
        if not vouchers_valid:
            all_errors.extend(voucher_errors)
        else:
            all_warnings.extend([e for e in voucher_errors if "Warning" in e])
        
        # Validate stock items
        stock_items = data.get("stock_items", [])
        stock_valid, stock_errors, stock_data = DataValidator.validate_stock_data(stock_items)
        validated_data["stock_items"] = stock_data["stock_items"]
        summary["stock_items"] = stock_data["summary"]
        
        if not stock_valid:
            all_warnings.extend(stock_errors)  # Stock is optional, so warnings only
        
        # Overall validation
        is_valid = ledgers_valid or vouchers_valid  # At least one must be valid
        
        if not is_valid:
            all_errors.append("No valid data found - both ledgers and vouchers are empty or invalid")
        
        # Add data quality metrics
        summary["data_quality"] = {
            "has_ledgers": len(validated_data.get("ledgers", [])) > 0,
            "has_vouchers": len(validated_data.get("vouchers", [])) > 0,
            "has_stock": len(validated_data.get("stock_items", [])) > 0,
            "ledgers_with_data": summary.get("ledgers", {}).get("ledgers_with_balance", 0),
            "vouchers_with_data": summary.get("vouchers", {}).get("vouchers_with_amount", 0)
        }
        
        logger.info(f"Data validation complete: valid={is_valid}, errors={len(all_errors)}, warnings={len(all_warnings)}")
        
        return {
            "is_valid": is_valid,
            "errors": all_errors,
            "warnings": all_warnings,
            "validated_data": validated_data,
            "summary": summary,
            "timestamp": datetime.now().isoformat()
        }

