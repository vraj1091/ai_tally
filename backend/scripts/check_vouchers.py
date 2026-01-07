"""Check voucher structure in backup data"""
import json
from app.models.database import SessionLocal, TallyCache

db = SessionLocal()
entries = db.query(TallyCache).filter(TallyCache.source == 'backup').all()

for entry in entries:
    data = json.loads(entry.cache_data) if isinstance(entry.cache_data, str) else entry.cache_data
    company = data.get('company', {}).get('name', 'Unknown')
    if 'Test Company 2L' in company:
        vouchers = data.get('vouchers', [])
        ledgers = data.get('ledgers', [])
        
        print(f"Company: {company}")
        print(f"Total vouchers: {len(vouchers)}")
        print(f"Total ledgers: {len(ledgers)}")
        
        # Check ledgers - find some with names
        print("\nSample Ledgers (Sundry Debtors):")
        debtors = [l for l in ledgers if 'debtor' in l.get('parent', '').lower()][:5]
        for l in debtors:
            print(f"  Name: {l.get('name')}, Parent: {l.get('parent')}, Balance: {l.get('closing_balance')}")
        
        # Check voucher ledger_entries
        print("\nVoucher with ledger_entries:")
        for v in vouchers[:20]:
            if v.get('ledger_entries'):
                print(f"  Found ledger_entries: {v.get('ledger_entries')}")
                break
        else:
            print("  No vouchers have ledger_entries field")
        
        break

db.close()

