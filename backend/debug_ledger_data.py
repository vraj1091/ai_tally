"""
Debug script to check actual ledger data structure and balances
"""
import sys
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.models.database import SessionLocal, TallyCache, User
from app.services.data_transformer import DataTransformer

def debug_ledger_data():
    db = SessionLocal()
    try:
        # Get user
        user = db.query(User).filter(User.email == "test@mail.com").first()
        if not user:
            print("User not found")
            return
        
        # Get backup data
        cache_entry = db.query(TallyCache).filter(
            TallyCache.user_id == user.id,
            TallyCache.cache_key.like("backup_data_%")
        ).first()
        
        if not cache_entry:
            print("No backup data found")
            return
        
        data = json.loads(cache_entry.cache_data)
        ledgers = data.get("ledgers", [])
        
        print(f"\n=== DEBUGGING LEDGER DATA ===")
        print(f"Total ledgers: {len(ledgers)}")
        
        # Check first 10 ledgers
        print(f"\n=== FIRST 10 LEDGERS (RAW) ===")
        for i, ledger in enumerate(ledgers[:10]):
            print(f"\nLedger {i+1}:")
            print(f"  Name: {ledger.get('name')}")
            print(f"  Parent: {ledger.get('parent')}")
            print(f"  Opening Balance: {ledger.get('opening_balance')}")
            print(f"  Current Balance: {ledger.get('current_balance')}")
            print(f"  Closing Balance: {ledger.get('closing_balance')}")
            print(f"  All keys: {list(ledger.keys())}")
        
        # Normalize and check
        normalized = DataTransformer.normalize_ledgers(ledgers)
        print(f"\n=== NORMALIZED LEDGERS ===")
        print(f"Total normalized: {len(normalized)}")
        
        # Check balances
        total_balance = sum(l.get('balance', 0) for l in normalized)
        ledgers_with_balance = [l for l in normalized if l.get('balance', 0) > 0]
        
        print(f"Total balance sum: {total_balance}")
        print(f"Ledgers with balance > 0: {len(ledgers_with_balance)}")
        
        # Check revenue/expense
        revenue_keywords = ['sales', 'income', 'revenue']
        expense_keywords = ['expense', 'purchase', 'cost']
        
        revenue_ledgers = [l for l in normalized 
                          if any(kw in (l.get('parent') or '').lower() for kw in revenue_keywords) or
                             any(kw in (l.get('name') or '').lower() for kw in revenue_keywords)]
        
        expense_ledgers = [l for l in normalized 
                          if any(kw in (l.get('parent') or '').lower() for kw in expense_keywords) or
                             any(kw in (l.get('name') or '').lower() for kw in expense_keywords)]
        
        print(f"\nRevenue ledgers found: {len(revenue_ledgers)}")
        revenue_total = sum(l.get('balance', 0) for l in revenue_ledgers)
        print(f"Revenue total: {revenue_total}")
        
        print(f"\nExpense ledgers found: {len(expense_ledgers)}")
        expense_total = sum(l.get('balance', 0) for l in expense_ledgers)
        print(f"Expense total: {expense_total}")
        
        # Show sample revenue/expense ledgers
        if revenue_ledgers:
            print(f"\n=== SAMPLE REVENUE LEDGERS ===")
            for l in revenue_ledgers[:5]:
                print(f"  {l.get('name')} ({l.get('parent')}): {l.get('balance')}")
        
        if expense_ledgers:
            print(f"\n=== SAMPLE EXPENSE LEDGERS ===")
            for l in expense_ledgers[:5]:
                print(f"  {l.get('name')} ({l.get('parent')}): {l.get('balance')}")
        
        # Check all unique parent groups
        parents = set(l.get('parent', '') for l in normalized if l.get('parent'))
        print(f"\n=== UNIQUE PARENT GROUPS ({len(parents)}) ===")
        for parent in sorted(list(parents))[:20]:
            count = len([l for l in normalized if l.get('parent') == parent])
            total = sum(l.get('balance', 0) for l in normalized if l.get('parent') == parent)
            print(f"  {parent}: {count} ledgers, total={total}")
        
    except Exception as e:
        import traceback
        print(f"Error: {e}")
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    debug_ledger_data()

