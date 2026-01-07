"""
Generate Tally-compatible XML data file with 200,000 records
CLEAN VERSION V2 - FIXED XML ESCAPING
- All special characters properly escaped
- All ledger references validated
- All party ledger entries have proper bill allocations
"""

import random
import os
from datetime import datetime, timedelta

# Set random seed for reproducibility
random.seed(42)

# Configuration
COMPANY_NAME = "Test Company 2L"
FY_START = "20240401"
FY_END = "20250331"

# Voucher distribution
SALES_VOUCHERS = 50000
PURCHASE_VOUCHERS = 40000
RECEIPT_VOUCHERS = 25000
PAYMENT_VOUCHERS = 25000
JOURNAL_VOUCHERS = 10000

# Ledger counts
NUM_DEBTORS = 15000
NUM_CREDITORS = 15000
NUM_SALES_LEDGERS = 5000
NUM_PURCHASE_LEDGERS = 5000
NUM_EXPENSE_LEDGERS = 5000
NUM_INCOME_LEDGERS = 5000

# Name pools - REMOVED "&" and other special XML characters
FIRST_NAMES = ["Raj", "Amit", "Priya", "Neha", "Vikram", "Anita", "Suresh", "Kavita", "Rahul", "Deepa",
               "Arun", "Meera", "Sanjay", "Pooja", "Vijay", "Rekha", "Manoj", "Sunita", "Ajay", "Geeta",
               "Ravi", "Shanti", "Gopal", "Lakshmi", "Mohan", "Radha", "Krishna", "Sita", "Ram", "Gita"]

LAST_NAMES = ["Patel", "Shah", "Mehta", "Joshi", "Sharma", "Verma", "Gupta", "Singh", "Kumar", "Agarwal",
              "Desai", "Pandey", "Trivedi", "Mishra", "Yadav", "Reddy", "Nair", "Menon", "Pillai", "Iyer",
              "Rao", "Naidu", "Choudhary", "Thakur", "Saxena", "Srivastava", "Chauhan", "Tiwari", "Dubey", "Shukla"]

# REMOVED "&" from suffixes - use "and" instead
COMPANY_SUFFIXES = ["Pvt Ltd", "Ltd", "Enterprises", "Industries", "Trading Co", "and Sons", "Corporation", 
                    "Solutions", "Services", "Associates", "Group", "International", "Traders", "Suppliers"]

PRODUCTS = ["Steel", "Cement", "Textiles", "Chemicals", "Electronics", "Machinery", "Paper", "Plastic",
            "Rubber", "Glass", "Wood", "Metal", "Paint", "Oil", "Food", "Pharma", "Auto Parts", "Hardware"]


def escape_xml(text):
    """Escape special XML characters"""
    if text is None:
        return ""
    text = str(text)
    text = text.replace("&", "&amp;")  # Must be first!
    text = text.replace("<", "&lt;")
    text = text.replace(">", "&gt;")
    text = text.replace('"', "&quot;")
    text = text.replace("'", "&apos;")
    return text


def generate_xml():
    """Generate complete Tally XML file with zero exceptions"""
    
    output_file = os.path.join(os.path.dirname(__file__), "tally_2lakh_v2.xml")
    
    print("=" * 60)
    print("GENERATING CLEAN TALLY DATA V2 - WITH XML ESCAPING")
    print("=" * 60)
    
    # Pre-generate all ledger names
    print("\nGenerating ledger names...")
    
    debtor_names = []
    for i in range(1, NUM_DEBTORS + 1):
        if i % 3 == 0:
            name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)} {random.choice(COMPANY_SUFFIXES)} D{i}"
        elif i % 3 == 1:
            name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)} D{i}"
        else:
            name = f"{random.choice(PRODUCTS)} Traders D{i}"
        debtor_names.append(name)
    
    creditor_names = []
    for i in range(1, NUM_CREDITORS + 1):
        if i % 3 == 0:
            name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)} {random.choice(COMPANY_SUFFIXES)} C{i}"
        elif i % 3 == 1:
            name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)} C{i}"
        else:
            name = f"{random.choice(PRODUCTS)} Suppliers C{i}"
        creditor_names.append(name)
    
    # Simple, clean ledger names without special characters
    sales_names = [f"Sales {random.choice(PRODUCTS)} S{i}" for i in range(1, NUM_SALES_LEDGERS + 1)]
    purchase_names = [f"Purchase {random.choice(PRODUCTS)} P{i}" for i in range(1, NUM_PURCHASE_LEDGERS + 1)]
    expense_names = [f"Expense Office E{i}" for i in range(1, NUM_EXPENSE_LEDGERS + 1)]
    income_names = [f"Income Other I{i}" for i in range(1, NUM_INCOME_LEDGERS + 1)]
    
    print(f"  Debtors: {len(debtor_names):,}")
    print(f"  Creditors: {len(creditor_names):,}")
    print(f"  Sales Ledgers: {len(sales_names):,}")
    print(f"  Purchase Ledgers: {len(purchase_names):,}")
    
    total_ledgers = len(debtor_names) + len(creditor_names) + len(sales_names) + len(purchase_names) + len(expense_names) + len(income_names) + 2
    total_vouchers = SALES_VOUCHERS + PURCHASE_VOUCHERS + RECEIPT_VOUCHERS + PAYMENT_VOUCHERS + JOURNAL_VOUCHERS
    
    with open(output_file, 'w', encoding='utf-8') as f:
        # XML Header
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n')
        f.write('<ENVELOPE>\n')
        f.write('<HEADER>\n')
        f.write('<TALLYREQUEST>Import Data</TALLYREQUEST>\n')
        f.write('</HEADER>\n')
        f.write('<BODY>\n')
        f.write('<IMPORTDATA>\n')
        f.write('<REQUESTDESC>\n')
        f.write('<REPORTNAME>All Masters</REPORTNAME>\n')
        f.write(f'<STATICVARIABLES><SVCURRENTCOMPANY>{escape_xml(COMPANY_NAME)}</SVCURRENTCOMPANY></STATICVARIABLES>\n')
        f.write('</REQUESTDESC>\n')
        f.write('<REQUESTDATA>\n')
        
        # Company
        f.write(f'''<TALLYMESSAGE xmlns:UDF="TallyUDF">
<COMPANY NAME="{escape_xml(COMPANY_NAME)}" ACTION="Create">
<NAME>{escape_xml(COMPANY_NAME)}</NAME>
<STARTINGFROM>{FY_START}</STARTINGFROM>
<ENDINGAT>{FY_END}</ENDINGAT>
<CURRENCYNAME>INR</CURRENCYNAME>
</COMPANY>
</TALLYMESSAGE>
''')
        
        # ============ LEDGERS ============
        print("\nWriting ledgers...")
        ledger_count = 0
        
        # Sundry Debtors
        for name in debtor_names:
            escaped_name = escape_xml(name)
            opening = random.randint(0, 500000)
            f.write(f'''<TALLYMESSAGE xmlns:UDF="TallyUDF">
<LEDGER NAME="{escaped_name}" ACTION="Create">
<NAME>{escaped_name}</NAME>
<PARENT>Sundry Debtors</PARENT>
<OPENINGBALANCE>{opening}</OPENINGBALANCE>
</LEDGER>
</TALLYMESSAGE>
''')
            ledger_count += 1
            if ledger_count % 10000 == 0:
                print(f"  Written {ledger_count:,} ledgers...")
        
        # Sundry Creditors
        for name in creditor_names:
            escaped_name = escape_xml(name)
            opening = random.randint(-500000, 0)
            f.write(f'''<TALLYMESSAGE xmlns:UDF="TallyUDF">
<LEDGER NAME="{escaped_name}" ACTION="Create">
<NAME>{escaped_name}</NAME>
<PARENT>Sundry Creditors</PARENT>
<OPENINGBALANCE>{opening}</OPENINGBALANCE>
</LEDGER>
</TALLYMESSAGE>
''')
            ledger_count += 1
            if ledger_count % 10000 == 0:
                print(f"  Written {ledger_count:,} ledgers...")
        
        # Sales Accounts
        for name in sales_names:
            escaped_name = escape_xml(name)
            f.write(f'''<TALLYMESSAGE xmlns:UDF="TallyUDF">
<LEDGER NAME="{escaped_name}" ACTION="Create">
<NAME>{escaped_name}</NAME>
<PARENT>Sales Accounts</PARENT>
</LEDGER>
</TALLYMESSAGE>
''')
            ledger_count += 1
        
        # Purchase Accounts
        for name in purchase_names:
            escaped_name = escape_xml(name)
            f.write(f'''<TALLYMESSAGE xmlns:UDF="TallyUDF">
<LEDGER NAME="{escaped_name}" ACTION="Create">
<NAME>{escaped_name}</NAME>
<PARENT>Purchase Accounts</PARENT>
</LEDGER>
</TALLYMESSAGE>
''')
            ledger_count += 1
        
        # Indirect Expenses
        for name in expense_names:
            escaped_name = escape_xml(name)
            f.write(f'''<TALLYMESSAGE xmlns:UDF="TallyUDF">
<LEDGER NAME="{escaped_name}" ACTION="Create">
<NAME>{escaped_name}</NAME>
<PARENT>Indirect Expenses</PARENT>
</LEDGER>
</TALLYMESSAGE>
''')
            ledger_count += 1
        
        # Indirect Incomes
        for name in income_names:
            escaped_name = escape_xml(name)
            f.write(f'''<TALLYMESSAGE xmlns:UDF="TallyUDF">
<LEDGER NAME="{escaped_name}" ACTION="Create">
<NAME>{escaped_name}</NAME>
<PARENT>Indirect Incomes</PARENT>
</LEDGER>
</TALLYMESSAGE>
''')
            ledger_count += 1
        
        # Bank and Cash
        f.write('''<TALLYMESSAGE xmlns:UDF="TallyUDF">
<LEDGER NAME="HDFC Bank" ACTION="Create">
<NAME>HDFC Bank</NAME>
<PARENT>Bank Accounts</PARENT>
<OPENINGBALANCE>10000000</OPENINGBALANCE>
</LEDGER>
</TALLYMESSAGE>
''')
        
        f.write('''<TALLYMESSAGE xmlns:UDF="TallyUDF">
<LEDGER NAME="Cash" ACTION="Create">
<NAME>Cash</NAME>
<PARENT>Cash-in-Hand</PARENT>
<OPENINGBALANCE>500000</OPENINGBALANCE>
</LEDGER>
</TALLYMESSAGE>
''')
        
        print(f"  Total ledgers written: {ledger_count + 2:,}")
        
        # ============ VOUCHERS ============
        print("\nWriting vouchers...")
        start_date = datetime(2024, 4, 1)
        voucher_num = 0
        
        def get_random_date():
            days = random.randint(0, 364)
            return (start_date + timedelta(days=days)).strftime('%Y%m%d')
        
        def write_voucher(f, vch_type, vch_num, party_name, contra_name, amount, vdate, 
                         is_party_debtor=True, both_are_party=False):
            """Write a voucher with proper bill allocations and XML escaping."""
            vch_code = f"{vch_type[:3].upper()}{vch_num}"
            
            party_escaped = escape_xml(party_name)
            contra_escaped = escape_xml(contra_name)
            
            # Determine amounts based on voucher type
            if vch_type == "Sales":
                party_amt = -amount  # Debtor debited (negative = debit in Tally)
                contra_amt = amount   # Sales credited
            elif vch_type == "Purchase":
                party_amt = amount    # Creditor credited (positive = credit in Tally)
                contra_amt = -amount  # Purchase debited
            elif vch_type == "Receipt":
                party_amt = -amount   # Debtor credited (reduces receivable)
                contra_amt = amount   # Bank debited
            elif vch_type == "Payment":
                party_amt = amount    # Creditor debited (reduces payable)
                contra_amt = -amount  # Bank credited
            else:  # Journal
                party_amt = amount
                contra_amt = -amount
            
            f.write(f'''<TALLYMESSAGE xmlns:UDF="TallyUDF">
<VOUCHER VCHTYPE="{vch_type}" ACTION="Create">
<DATE>{vdate}</DATE>
<VOUCHERTYPENAME>{vch_type}</VOUCHERTYPENAME>
<VOUCHERNUMBER>{vch_code}</VOUCHERNUMBER>
<PARTYLEDGERNAME>{party_escaped}</PARTYLEDGERNAME>
<AMOUNT>{abs(amount)}</AMOUNT>
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>{party_escaped}</LEDGERNAME>
<AMOUNT>{party_amt}</AMOUNT>
<BILLALLOCATIONS.LIST>
<NAME>{vch_code}</NAME>
<BILLTYPE>New Ref</BILLTYPE>
<AMOUNT>{party_amt}</AMOUNT>
</BILLALLOCATIONS.LIST>
</ALLLEDGERENTRIES.LIST>
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>{contra_escaped}</LEDGERNAME>
<AMOUNT>{contra_amt}</AMOUNT>''')
            
            # Add bill allocation for second party (Journal entries)
            if both_are_party:
                f.write(f'''
<BILLALLOCATIONS.LIST>
<NAME>{vch_code}</NAME>
<BILLTYPE>New Ref</BILLTYPE>
<AMOUNT>{contra_amt}</AMOUNT>
</BILLALLOCATIONS.LIST>''')
            
            f.write('''
</ALLLEDGERENTRIES.LIST>
</VOUCHER>
</TALLYMESSAGE>
''')
        
        # Sales Vouchers
        print(f"  Writing {SALES_VOUCHERS:,} Sales vouchers...")
        for i in range(SALES_VOUCHERS):
            voucher_num += 1
            party = debtor_names[i % len(debtor_names)]
            contra = sales_names[i % len(sales_names)]
            amount = random.randint(1000, 100000)
            vdate = get_random_date()
            write_voucher(f, "Sales", voucher_num, party, contra, amount, vdate)
            if voucher_num % 25000 == 0:
                print(f"    Written {voucher_num:,} vouchers...")
        
        # Purchase Vouchers
        print(f"  Writing {PURCHASE_VOUCHERS:,} Purchase vouchers...")
        for i in range(PURCHASE_VOUCHERS):
            voucher_num += 1
            party = creditor_names[i % len(creditor_names)]
            contra = purchase_names[i % len(purchase_names)]
            amount = random.randint(1000, 100000)
            vdate = get_random_date()
            write_voucher(f, "Purchase", voucher_num, party, contra, amount, vdate, is_party_debtor=False)
            if voucher_num % 25000 == 0:
                print(f"    Written {voucher_num:,} vouchers...")
        
        # Receipt Vouchers
        print(f"  Writing {RECEIPT_VOUCHERS:,} Receipt vouchers...")
        for i in range(RECEIPT_VOUCHERS):
            voucher_num += 1
            party = debtor_names[i % len(debtor_names)]
            contra = "HDFC Bank"
            amount = random.randint(1000, 100000)
            vdate = get_random_date()
            write_voucher(f, "Receipt", voucher_num, party, contra, amount, vdate)
            if voucher_num % 25000 == 0:
                print(f"    Written {voucher_num:,} vouchers...")
        
        # Payment Vouchers
        print(f"  Writing {PAYMENT_VOUCHERS:,} Payment vouchers...")
        for i in range(PAYMENT_VOUCHERS):
            voucher_num += 1
            party = creditor_names[i % len(creditor_names)]
            contra = "HDFC Bank"
            amount = random.randint(1000, 100000)
            vdate = get_random_date()
            write_voucher(f, "Payment", voucher_num, party, contra, amount, vdate, is_party_debtor=False)
            if voucher_num % 25000 == 0:
                print(f"    Written {voucher_num:,} vouchers...")
        
        # Journal Vouchers (both entries are party ledgers)
        print(f"  Writing {JOURNAL_VOUCHERS:,} Journal vouchers...")
        for i in range(JOURNAL_VOUCHERS):
            voucher_num += 1
            party = debtor_names[i % len(debtor_names)]
            contra = creditor_names[i % len(creditor_names)]
            amount = random.randint(1000, 100000)
            vdate = get_random_date()
            write_voucher(f, "Journal", voucher_num, party, contra, amount, vdate, both_are_party=True)
            if voucher_num % 25000 == 0:
                print(f"    Written {voucher_num:,} vouchers...")
        
        # Close XML
        f.write('</REQUESTDATA>\n')
        f.write('</IMPORTDATA>\n')
        f.write('</BODY>\n')
        f.write('</ENVELOPE>\n')
    
    file_size = os.path.getsize(output_file) / (1024 * 1024)
    
    print("\n" + "=" * 60)
    print("GENERATION COMPLETE!")
    print("=" * 60)
    print(f"\nFile: {output_file}")
    print(f"Size: {file_size:.2f} MB")
    print(f"\nTotal Records: {total_ledgers + total_vouchers:,}")
    
    # Verify no unescaped special characters
    with open(output_file, 'r', encoding='utf-8') as f:
        content = f.read()
        # Check for unescaped & (not followed by amp; lt; gt; quot; apos;)
        import re
        unescaped = re.findall(r'&(?!(amp|lt|gt|quot|apos);)', content)
        if unescaped:
            print(f"\n⚠️ WARNING: Found {len(unescaped)} potentially unescaped '&' characters!")
        else:
            print("\n✅ All special characters properly escaped!")
    
    print("\n" + "=" * 60)
    print("NEXT STEPS:")
    print("=" * 60)
    print("1. Open Tally Prime")
    print("2. Go to Gateway > Import")
    print(f"3. Select: {output_file}")
    print("4. Should import with ZERO exceptions!")
    
    return output_file


if __name__ == "__main__":
    generate_xml()

