from app.services.custom_tally_connector import CustomTallyConnector

c = CustomTallyConnector()
connected, msg = c.test_connection()
print(f"Connected: {connected}, {msg}")

if connected:
    print("\n=== LEDGERS ===")
    ledgers = c.get_ledgers('Tally')
    print(f"Total: {len(ledgers)}")
    if ledgers:
        for i, l in enumerate(ledgers[:5]):
            print(f"  {i+1}. {l['name']} | Parent: {l['parent']} | Balance: {l['closing_balance']}")
    
    print("\n=== FINANCIAL SUMMARY ===")
    summary = c.get_financial_summary('Tally')
    print(f"Revenue: {summary['total_revenue']}")
    print(f"Expense: {summary['total_expense']}")
    print(f"Profit: {summary['net_profit']}")
    print(f"Ledgers: {summary['ledger_count']}")

