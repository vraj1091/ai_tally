"""
Generate Tally-compatible XML data file with 200,000 records
NO EXCEPTIONS - Clean data for testing
"""

import random
from datetime import datetime, timedelta
import os

# Configuration
NUM_LEDGERS = 50000      # 50,000 ledgers
NUM_VOUCHERS = 150000    # 150,000 vouchers
COMPANY_NAME = "Test Company 2L"
FY_START = "20240401"
FY_END = "20250331"

# Sample data pools
FIRST_NAMES = ["Raj", "Amit", "Priya", "Neha", "Vikram", "Anita", "Suresh", "Kavita", "Rahul", "Deepa",
               "Arun", "Meera", "Sanjay", "Pooja", "Vijay", "Rekha", "Manoj", "Sunita", "Ajay", "Geeta",
               "Ravi", "Shanti", "Gopal", "Lakshmi", "Mohan", "Radha", "Krishna", "Sita", "Ram", "Gita"]

LAST_NAMES = ["Patel", "Shah", "Mehta", "Joshi", "Sharma", "Verma", "Gupta", "Singh", "Kumar", "Agarwal",
              "Desai", "Pandey", "Trivedi", "Mishra", "Yadav", "Reddy", "Nair", "Menon", "Pillai", "Iyer",
              "Rao", "Naidu", "Choudhary", "Thakur", "Saxena", "Srivastava", "Chauhan", "Tiwari", "Dubey", "Shukla"]

COMPANY_SUFFIXES = ["Pvt Ltd", "Ltd", "Enterprises", "Industries", "Trading Co", "& Sons", "Corporation", 
                    "Solutions", "Services", "Associates", "Group", "International", "Traders", "Suppliers"]

CITIES = ["Mumbai", "Delhi", "Bangalore", "Chennai", "Kolkata", "Hyderabad", "Pune", "Ahmedabad", 
          "Jaipur", "Surat", "Lucknow", "Kanpur", "Nagpur", "Indore", "Thane", "Bhopal", "Patna", "Vadodara"]

PRODUCTS = ["Steel", "Cement", "Textiles", "Chemicals", "Electronics", "Machinery", "Paper", "Plastic",
            "Rubber", "Glass", "Wood", "Metal", "Paint", "Oil", "Food", "Pharma", "Auto Parts", "Hardware"]

def generate_ledger_name(i):
    """Generate unique ledger name"""
    if i % 3 == 0:
        # Company name
        return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)} {random.choice(COMPANY_SUFFIXES)}"
    elif i % 3 == 1:
        # Person name
        return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
    else:
        # Product/Service name
        return f"{random.choice(PRODUCTS)} {random.choice(['Supplies', 'Products', 'Materials', 'Goods'])} {i}"

def generate_xml():
    """Generate complete Tally XML file"""
    
    print(f"Generating Tally data file with {NUM_LEDGERS + NUM_VOUCHERS:,} records...")
    
    output_file = os.path.join(os.path.dirname(__file__), "tally_2lakh_data.xml")
    
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
        f.write(f'<STATICVARIABLES><SVCURRENTCOMPANY>{COMPANY_NAME}</SVCURRENTCOMPANY></STATICVARIABLES>\n')
        f.write('</REQUESTDESC>\n')
        f.write('<REQUESTDATA>\n')
        
        # Company
        f.write(f'''<TALLYMESSAGE xmlns:UDF="TallyUDF">
<COMPANY NAME="{COMPANY_NAME}" ACTION="Create">
<NAME>{COMPANY_NAME}</NAME>
<STARTINGFROM>{FY_START}</STARTINGFROM>
<ENDINGAT>{FY_END}</ENDINGAT>
<CURRENCYNAME>INR</CURRENCYNAME>
</COMPANY>
</TALLYMESSAGE>\n''')
        
        # Groups (Standard Tally Groups)
        groups = [
            ("Sundry Debtors", "Current Assets"),
            ("Sundry Creditors", "Current Liabilities"),
            ("Sales Accounts", "Revenue"),
            ("Purchase Accounts", "Expenses"),
            ("Direct Expenses", "Expenses"),
            ("Indirect Expenses", "Expenses"),
            ("Direct Incomes", "Revenue"),
            ("Indirect Incomes", "Revenue"),
            ("Bank Accounts", "Current Assets"),
            ("Cash-in-Hand", "Current Assets"),
            ("Fixed Assets", "Non-Current Assets"),
            ("Duties and Taxes", "Current Liabilities"),
        ]
        
        for gname, parent in groups:
            f.write(f'''<TALLYMESSAGE xmlns:UDF="TallyUDF">
<GROUP NAME="{gname}" ACTION="Create">
<NAME>{gname}</NAME>
<PARENT>{parent}</PARENT>
</GROUP>
</TALLYMESSAGE>\n''')
        
        # Generate Ledgers
        print(f"Generating {NUM_LEDGERS:,} ledgers...")
        
        ledger_groups = [
            ("Sundry Debtors", 15000),
            ("Sundry Creditors", 15000),
            ("Sales Accounts", 5000),
            ("Purchase Accounts", 5000),
            ("Direct Expenses", 3000),
            ("Indirect Expenses", 3000),
            ("Direct Incomes", 2000),
            ("Indirect Incomes", 2000),
        ]
        
        ledger_names = []
        ledger_count = 0
        
        for group_name, count in ledger_groups:
            for i in range(count):
                ledger_count += 1
                name = f"{generate_ledger_name(ledger_count)} {ledger_count}"
                ledger_names.append((name, group_name))
                
                # Random opening balance
                opening = random.randint(-100000, 500000)
                
                f.write(f'''<TALLYMESSAGE xmlns:UDF="TallyUDF">
<LEDGER NAME="{name}" ACTION="Create">
<NAME>{name}</NAME>
<PARENT>{group_name}</PARENT>
<OPENINGBALANCE>{opening}</OPENINGBALANCE>
</LEDGER>
</TALLYMESSAGE>\n''')
                
                if ledger_count % 10000 == 0:
                    print(f"  Created {ledger_count:,} ledgers...")
        
        # Add Bank and Cash ledgers
        f.write(f'''<TALLYMESSAGE xmlns:UDF="TallyUDF">
<LEDGER NAME="HDFC Bank" ACTION="Create">
<NAME>HDFC Bank</NAME>
<PARENT>Bank Accounts</PARENT>
<OPENINGBALANCE>1000000</OPENINGBALANCE>
</LEDGER>
</TALLYMESSAGE>\n''')
        
        f.write(f'''<TALLYMESSAGE xmlns:UDF="TallyUDF">
<LEDGER NAME="Cash" ACTION="Create">
<NAME>Cash</NAME>
<PARENT>Cash-in-Hand</PARENT>
<OPENINGBALANCE>50000</OPENINGBALANCE>
</LEDGER>
</TALLYMESSAGE>\n''')
        
        # Generate Vouchers
        print(f"Generating {NUM_VOUCHERS:,} vouchers...")
        
        voucher_types = [
            ("Sales", 50000),
            ("Purchase", 40000),
            ("Receipt", 25000),
            ("Payment", 25000),
            ("Journal", 10000),
        ]
        
        start_date = datetime(2024, 4, 1)
        voucher_count = 0
        
        debtors = [l[0] for l in ledger_names if l[1] == "Sundry Debtors"][:1000]
        creditors = [l[0] for l in ledger_names if l[1] == "Sundry Creditors"][:1000]
        sales_ledgers = [l[0] for l in ledger_names if l[1] == "Sales Accounts"][:500]
        purchase_ledgers = [l[0] for l in ledger_names if l[1] == "Purchase Accounts"][:500]
        
        for vtype, count in voucher_types:
            for i in range(count):
                voucher_count += 1
                
                # Random date within FY
                days_offset = random.randint(0, 364)
                vdate = (start_date + timedelta(days=days_offset)).strftime('%Y%m%d')
                
                # Random amount
                amount = random.randint(1000, 100000)
                
                # Select parties based on voucher type
                if vtype == "Sales":
                    party = random.choice(debtors) if debtors else "Cash Sales"
                    contra = random.choice(sales_ledgers) if sales_ledgers else "Sales"
                elif vtype == "Purchase":
                    party = random.choice(creditors) if creditors else "Cash Purchase"
                    contra = random.choice(purchase_ledgers) if purchase_ledgers else "Purchases"
                elif vtype == "Receipt":
                    party = random.choice(debtors) if debtors else "Cash"
                    contra = "HDFC Bank"
                elif vtype == "Payment":
                    party = random.choice(creditors) if creditors else "Cash"
                    contra = "HDFC Bank"
                else:  # Journal
                    party = random.choice(debtors) if debtors else "Suspense"
                    contra = random.choice(creditors) if creditors else "Suspense"
                
                f.write(f'''<TALLYMESSAGE xmlns:UDF="TallyUDF">
<VOUCHER VCHTYPE="{vtype}" ACTION="Create">
<DATE>{vdate}</DATE>
<VOUCHERTYPENAME>{vtype}</VOUCHERTYPENAME>
<VOUCHERNUMBER>{vtype[:3].upper()}{voucher_count}</VOUCHERNUMBER>
<PARTYLEDGERNAME>{party}</PARTYLEDGERNAME>
<AMOUNT>{amount}</AMOUNT>
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>{party}</LEDGERNAME>
<AMOUNT>{-amount if vtype in ['Sales', 'Receipt'] else amount}</AMOUNT>
</ALLLEDGERENTRIES.LIST>
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>{contra}</LEDGERNAME>
<AMOUNT>{amount if vtype in ['Sales', 'Receipt'] else -amount}</AMOUNT>
</ALLLEDGERENTRIES.LIST>
</VOUCHER>
</TALLYMESSAGE>\n''')
                
                if voucher_count % 25000 == 0:
                    print(f"  Created {voucher_count:,} vouchers...")
        
        # Close XML
        f.write('</REQUESTDATA>\n')
        f.write('</IMPORTDATA>\n')
        f.write('</BODY>\n')
        f.write('</ENVELOPE>\n')
    
    file_size = os.path.getsize(output_file) / (1024 * 1024)
    print(f"\n✅ File created: {output_file}")
    print(f"   Total records: {NUM_LEDGERS + NUM_VOUCHERS:,}")
    print(f"   Ledgers: {NUM_LEDGERS:,}")
    print(f"   Vouchers: {NUM_VOUCHERS:,}")
    print(f"   File size: {file_size:.2f} MB")
    print(f"\n📌 To import in Tally:")
    print(f"   1. Open Tally Prime")
    print(f"   2. Go to Gateway > Import > XML")
    print(f"   3. Select: {output_file}")
    
    return output_file

if __name__ == "__main__":
    generate_xml()

