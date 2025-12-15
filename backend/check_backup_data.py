"""
Diagnostic script to check why dashboards show 0 data
Run with: python check_backup_data.py
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.models.database import get_db, TallyCache
import json

def check_backup_data():
    print("\n" + "="*60)
    print("CHECKING BACKUP DATA IN DATABASE")
    print("="*60 + "\n")
    
    db = next(get_db())
    
    try:
        # 1. Check if there's any backup data
        all_backups = db.query(TallyCache).filter(TallyCache.source == "backup").all()
        
        if not all_backups:
            print("[ERROR] NO BACKUP DATA FOUND IN DATABASE!")
            print("\n[INFO] Solution: Upload a backup file via the UI first.")
            return
        
        print(f"[SUCCESS] Found {len(all_backups)} backup entries in database\n")
        
        # 2. Check each backup entry
        for i, backup in enumerate(all_backups, 1):
            print(f"\n--- Entry #{i} ---")
            print(f"Cache Key: {backup.cache_key}")
            print(f"Source: {backup.source}")
            print(f"User ID: {backup.user_id}")
            print(f"Created: {backup.cached_at}")
            
            try:
                data = json.loads(backup.cache_data) if isinstance(backup.cache_data, str) else backup.cache_data
                
                company_name = data.get("company", {}).get("name", "Unknown")
                ledgers = data.get("ledgers", [])
                vouchers = data.get("vouchers", [])
                summary = data.get("summary", {})
                
                print(f"Company: {company_name}")
                print(f"Ledgers: {len(ledgers)}")
                print(f"Vouchers: {len(vouchers)}")
                
                if summary:
                    print(f"\n[SUMMARY] Pre-calculated Summary:")
                    print(f"   Revenue: Rs.{summary.get('total_revenue', 0):,.2f}")
                    print(f"   Expenses: Rs.{summary.get('total_expense', 0):,.2f}")
                    print(f"   Profit: Rs.{summary.get('net_profit', 0):,.2f}")
                
                # 3. Check if ledgers have actual balances
                if ledgers:
                    print(f"\n[LEDGERS] Sample Ledgers (first 5):")
                    for j, ledger in enumerate(ledgers[:5], 1):
                        name = ledger.get("name", "Unknown")
                        balance = ledger.get("closing_balance") or ledger.get("opening_balance") or 0
                        group = ledger.get("parent_group", "Unknown")
                        print(f"   {j}. {name} | Balance: Rs.{balance:,.2f} | Group: {group}")
                    
                    # Calculate totals manually
                    total_debit = sum(float(l.get("closing_balance") or l.get("opening_balance") or 0) 
                                    for l in ledgers 
                                    if float(l.get("closing_balance") or l.get("opening_balance") or 0) > 0)
                    total_credit = sum(abs(float(l.get("closing_balance") or l.get("opening_balance") or 0)) 
                                     for l in ledgers 
                                     if float(l.get("closing_balance") or l.get("opening_balance") or 0) < 0)
                    
                    print(f"\n[TOTALS] Manual Calculation from Ledgers:")
                    print(f"   Total Debit: Rs.{total_debit:,.2f}")
                    print(f"   Total Credit: Rs.{total_credit:,.2f}")
                    
                    # Try to identify revenue/expense ledgers
                    revenue_groups = ['Sales', 'Revenue', 'Income', 'Sales Accounts']
                    expense_groups = ['Purchase', 'Expenses', 'Expense', 'Purchase Accounts']
                    
                    revenue_ledgers = [l for l in ledgers 
                                      if any(rg.lower() in (l.get("parent_group") or "").lower() 
                                           for rg in revenue_groups)]
                    expense_ledgers = [l for l in ledgers 
                                      if any(eg.lower() in (l.get("parent_group") or "").lower() 
                                           for eg in expense_groups)]
                    
                    revenue = sum(abs(float(l.get("closing_balance") or l.get("opening_balance") or 0)) 
                                for l in revenue_ledgers)
                    expenses = sum(abs(float(l.get("closing_balance") or l.get("opening_balance") or 0)) 
                                 for l in expense_ledgers)
                    
                    print(f"\n[ANALYTICS] Revenue/Expense Ledgers:")
                    print(f"   Revenue Ledgers: {len(revenue_ledgers)}")
                    print(f"   Expense Ledgers: {len(expense_ledgers)}")
                    print(f"   Calculated Revenue: Rs.{revenue:,.2f}")
                    print(f"   Calculated Expenses: Rs.{expenses:,.2f}")
                    print(f"   Calculated Profit: Rs.{(revenue - expenses):,.2f}")
                    
                    if revenue == 0 and expenses == 0:
                        print(f"\n[WARNING] No revenue/expense ledgers found!")
                        print(f"   This might be because:")
                        print(f"   1. The backup file has no revenue/expense data")
                        print(f"   2. The parent_group names don't match expected patterns")
                        print(f"\n   Unique groups in your data:")
                        unique_groups = set(l.get("parent_group", "Unknown") for l in ledgers if l.get("parent_group"))
                        for group in sorted(unique_groups)[:20]:  # Show first 20 groups
                            print(f"      - {group}")
                
            except Exception as e:
                print(f"[ERROR] Error parsing backup data: {e}")
                import traceback
                traceback.print_exc()
        
        print("\n" + "="*60)
        print("[SUCCESS] DIAGNOSTIC COMPLETE")
        print("="*60 + "\n")
        
    finally:
        db.close()

if __name__ == "__main__":
    check_backup_data()

