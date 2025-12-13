#!/usr/bin/env python3
"""
Tally XML Test Data Generator
Generates a comprehensive 1GB+ Tally XML backup file

Usage:
    python generate_tally_xml_data.py

Output:
    - tally_backup_1gb.xml (1GB+ Tally XML format)
"""

import random
import string
from datetime import datetime, timedelta
import os

# Configuration
TARGET_SIZE_MB = 1024  # 1GB target
COMPANY_NAME = "Test Enterprise Pvt Ltd"

# Indian names for realistic data
FIRST_NAMES = [
    "Rajesh", "Suresh", "Mahesh", "Ramesh", "Anil", "Vijay", "Sanjay", "Ajay",
    "Priya", "Neha", "Pooja", "Anjali", "Sunita", "Kavita", "Rekha", "Meena",
    "Amit", "Sumit", "Rohit", "Mohit", "Nitin", "Sachin", "Ravi", "Arun",
    "Deepak", "Rakesh", "Mukesh", "Sunil", "Vinod", "Ashok", "Manish", "Pankaj"
]

LAST_NAMES = [
    "Sharma", "Verma", "Gupta", "Singh", "Kumar", "Agarwal", "Jain", "Patel",
    "Shah", "Mehta", "Reddy", "Rao", "Iyer", "Nair", "Menon", "Pillai",
    "Choudhary", "Yadav", "Thakur", "Chauhan", "Rajput", "Malhotra", "Kapoor", "Khanna"
]

CITIES = [
    "Mumbai", "Delhi", "Bangalore", "Chennai", "Kolkata", "Hyderabad", "Pune",
    "Ahmedabad", "Jaipur", "Lucknow", "Kanpur", "Nagpur", "Indore", "Bhopal"
]

PRODUCTS = [
    "Steel", "Iron", "Copper", "Aluminum", "Cement", "Sand", "Bricks",
    "Cotton", "Silk", "Wool", "Rice", "Wheat", "Sugar", "Oil",
    "Chemicals", "Fertilizers", "Paints", "Electronics", "Machinery", "Tools"
]

EXPENSE_TYPES = [
    "Salary", "Wages", "Rent", "Electricity", "Telephone", "Internet",
    "Traveling", "Conveyance", "Printing", "Stationery", "Advertisement",
    "Commission", "Insurance", "Repairs", "Maintenance", "Legal Fees"
]

VOUCHER_TYPES = ["Sales", "Purchase", "Receipt", "Payment", "Contra", "Journal"]


def random_name():
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"


def random_amount(min_val=1000, max_val=10000000):
    return round(random.uniform(min_val, max_val), 2)


def random_date(start_year=2023, end_year=2024):
    start = datetime(start_year, 4, 1)
    end = datetime(end_year, 3, 31)
    delta = end - start
    random_days = random.randint(0, delta.days)
    return (start + timedelta(days=random_days)).strftime("%Y%m%d")


def escape_xml(text):
    """Escape special XML characters"""
    if text is None:
        return ""
    text = str(text)
    text = text.replace("&", "&amp;")
    text = text.replace("<", "&lt;")
    text = text.replace(">", "&gt;")
    text = text.replace("'", "&apos;")
    text = text.replace('"', "&quot;")
    return text


def generate_ledger_xml(index, ledger_type):
    """Generate a single ledger in Tally XML format"""
    
    if ledger_type == "debtor":
        name = f"{random_name()} D{index}"
        parent = "Sundry Debtors"
        balance = random_amount(10000, 5000000)
        is_revenue = "No"
    elif ledger_type == "creditor":
        name = f"{random_name()} C{index}"
        parent = "Sundry Creditors"
        balance = -random_amount(10000, 5000000)
        is_revenue = "No"
    elif ledger_type == "sales":
        product = random.choice(PRODUCTS)
        name = f"Sales {product} S{index}"
        parent = "Sales Accounts"
        balance = -random_amount(100000, 50000000)
        is_revenue = "Yes"
    elif ledger_type == "purchase":
        product = random.choice(PRODUCTS)
        name = f"Purchase {product} P{index}"
        parent = "Purchase Accounts"
        balance = random_amount(50000, 30000000)
        is_revenue = "No"
    elif ledger_type == "expense":
        expense = random.choice(EXPENSE_TYPES)
        name = f"{expense} E{index}"
        parent = random.choice(["Direct Expenses", "Indirect Expenses"])
        balance = random_amount(10000, 1000000)
        is_revenue = "No"
    elif ledger_type == "bank":
        banks = ["SBI", "HDFC", "ICICI", "Axis", "PNB", "BOB", "Kotak"]
        name = f"{random.choice(banks)} Bank A/c B{index}"
        parent = "Bank Accounts"
        balance = random_amount(100000, 50000000)
        is_revenue = "No"
    elif ledger_type == "cash":
        name = f"Cash {random.choice(CITIES)} C{index}"
        parent = "Cash-in-Hand"
        balance = random_amount(10000, 500000)
        is_revenue = "No"
    elif ledger_type == "asset":
        assets = ["Land", "Building", "Machinery", "Furniture", "Vehicle", "Computer"]
        name = f"{random.choice(assets)} A{index}"
        parent = "Fixed Assets"
        balance = random_amount(100000, 100000000)
        is_revenue = "No"
    elif ledger_type == "loan":
        name = f"Loan from {random_name()} L{index}"
        parent = random.choice(["Secured Loans", "Unsecured Loans"])
        balance = -random_amount(100000, 50000000)
        is_revenue = "No"
    elif ledger_type == "capital":
        name = f"Capital - {random_name()} K{index}"
        parent = "Capital Account"
        balance = -random_amount(1000000, 100000000)
        is_revenue = "No"
    elif ledger_type == "tax":
        taxes = ["CGST Input", "SGST Input", "IGST Input", "CGST Output", "SGST Output", "IGST Output", "TDS Payable"]
        name = f"{random.choice(taxes)} T{index}"
        parent = "Duties & Taxes"
        balance = random_amount(10000, 5000000) * random.choice([1, -1])
        is_revenue = "No"
    else:
        name = f"Ledger {index}"
        parent = "Sundry Debtors"
        balance = random_amount()
        is_revenue = "No"
    
    city = random.choice(CITIES)
    state_code = str(random.randint(1, 37)).zfill(2)
    gst = f"{state_code}{random.choice(string.ascii_uppercase)}{random.choice(string.ascii_uppercase)}{random.choice(string.ascii_uppercase)}{random.choice(string.ascii_uppercase)}{random.randint(1000, 9999)}{random.choice(string.ascii_uppercase)}{random.randint(1, 9)}Z{random.randint(1, 9)}"
    
    opening = balance * 0.8
    
    xml = f'''  <LEDGER NAME="{escape_xml(name)}" RESERVEDNAME="">
   <NAME>{escape_xml(name)}</NAME>
   <PARENT>{escape_xml(parent)}</PARENT>
   <ISBILLWISEON>Yes</ISBILLWISEON>
   <ISCOSTCENTRESON>No</ISCOSTCENTRESON>
   <ISREVENUE>{is_revenue}</ISREVENUE>
   <AFFECTSSTOCK>No</AFFECTSSTOCK>
   <OPENINGBALANCE>{opening:.2f}</OPENINGBALANCE>
   <CLOSINGBALANCE>{balance:.2f}</CLOSINGBALANCE>
   <ADDRESS.LIST>
    <ADDRESS>{random.randint(1, 999)}, {random.choice(['Main Road', 'Industrial Area', 'Market'])}</ADDRESS>
    <ADDRESS>{city}</ADDRESS>
   </ADDRESS.LIST>
   <LEDGERPHONE>{random.randint(7000000000, 9999999999)}</LEDGERPHONE>
   <LEDGERMOBILE>+91-{random.randint(7000000000, 9999999999)}</LEDGERMOBILE>
   <EMAIL>{name.lower().replace(' ', '.').replace('-', '')}@example.com</EMAIL>
   <COUNTRYNAME>India</COUNTRYNAME>
   <LEDSTATENAME>Maharashtra</LEDSTATENAME>
   <PINCODE>{random.randint(100000, 999999)}</PINCODE>
   <GSTREGISTRATIONTYPE>Regular</GSTREGISTRATIONTYPE>
   <PARTYGSTIN>{gst}</PARTYGSTIN>
   <PANNO>{random.choice(string.ascii_uppercase)}{random.choice(string.ascii_uppercase)}{random.choice(string.ascii_uppercase)}{random.choice(string.ascii_uppercase)}{random.choice(string.ascii_uppercase)}{random.randint(1000, 9999)}{random.choice(string.ascii_uppercase)}</PANNO>
   <CREDITDAYS>{random.choice([0, 7, 15, 30, 45, 60])}</CREDITDAYS>
   <CREDITLIMIT>{random_amount(100000, 10000000):.2f}</CREDITLIMIT>
  </LEDGER>
'''
    return xml, balance


def generate_voucher_xml(index, date):
    """Generate a single voucher in Tally XML format"""
    voucher_type = random.choice(VOUCHER_TYPES)
    amount = random_amount(1000, 500000)
    party = f"{random_name()} {random.choice(['D', 'C'])}{random.randint(1, 15000)}"
    
    if voucher_type == "Sales":
        dr_ledger = party
        cr_ledger = f"Sales {random.choice(PRODUCTS)} S{random.randint(1, 5000)}"
        narration = f"Being goods sold to {party}"
    elif voucher_type == "Purchase":
        dr_ledger = f"Purchase {random.choice(PRODUCTS)} P{random.randint(1, 5000)}"
        cr_ledger = party
        narration = f"Being goods purchased from {party}"
    elif voucher_type == "Receipt":
        dr_ledger = f"{random.choice(['SBI', 'HDFC', 'ICICI'])} Bank A/c B{random.randint(1, 100)}"
        cr_ledger = party
        narration = f"Being amount received from {party}"
    elif voucher_type == "Payment":
        dr_ledger = party
        cr_ledger = f"{random.choice(['SBI', 'HDFC', 'ICICI'])} Bank A/c B{random.randint(1, 100)}"
        narration = f"Being amount paid to {party}"
    else:
        dr_ledger = f"Ledger {random.randint(1, 1000)}"
        cr_ledger = f"Ledger {random.randint(1, 1000)}"
        narration = f"Journal entry for adjustment"
    
    voucher_num = f"{voucher_type[:3].upper()}/{date[:4]}/{index:06d}"
    
    xml = f'''  <VOUCHER DATE="{date}" VOUCHERTYPENAME="{voucher_type}" VOUCHERNUMBER="{voucher_num}">
   <DATE>{date}</DATE>
   <VOUCHERTYPENAME>{voucher_type}</VOUCHERTYPENAME>
   <VOUCHERNUMBER>{voucher_num}</VOUCHERNUMBER>
   <PARTYLEDGERNAME>{escape_xml(party)}</PARTYLEDGERNAME>
   <AMOUNT>{amount:.2f}</AMOUNT>
   <NARRATION>{escape_xml(narration)}</NARRATION>
   <REFERENCE>{voucher_num}</REFERENCE>
   <EFFECTIVEDATE>{date}</EFFECTIVEDATE>
   <ISINVOICE>No</ISINVOICE>
   <ISCANCELLED>No</ISCANCELLED>
   <ALLLEDGERENTRIES.LIST>
    <LEDGERNAME>{escape_xml(dr_ledger)}</LEDGERNAME>
    <AMOUNT>-{amount:.2f}</AMOUNT>
    <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
   </ALLLEDGERENTRIES.LIST>
   <ALLLEDGERENTRIES.LIST>
    <LEDGERNAME>{escape_xml(cr_ledger)}</LEDGERNAME>
    <AMOUNT>{amount:.2f}</AMOUNT>
    <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
   </ALLLEDGERENTRIES.LIST>
  </VOUCHER>
'''
    return xml


def generate_stock_item_xml(index):
    """Generate a single stock item in Tally XML format"""
    product = random.choice(PRODUCTS)
    units = ["Kg", "Nos", "Pcs", "Ltrs", "Mtrs", "Box", "Bags"]
    unit = random.choice(units)
    rate = random_amount(10, 10000)
    qty = random.randint(10, 10000)
    
    name = f"{product} Grade-{random.choice(['A', 'B', 'C', 'Premium'])} {index}"
    
    xml = f'''  <STOCKITEM NAME="{escape_xml(name)}">
   <NAME>{escape_xml(name)}</NAME>
   <PARENT>{product} Group</PARENT>
   <CATEGORY>{product}</CATEGORY>
   <BASEUNITS>{unit}</BASEUNITS>
   <OPENINGBALANCE>{qty * 0.8:.2f} {unit}</OPENINGBALANCE>
   <OPENINGRATE>{rate * 0.95:.2f}</OPENINGRATE>
   <OPENINGVALUE>{qty * 0.8 * rate * 0.95:.2f}</OPENINGVALUE>
   <CLOSINGBALANCE>{qty:.2f} {unit}</CLOSINGBALANCE>
   <CLOSINGRATE>{rate:.2f}</CLOSINGRATE>
   <CLOSINGVALUE>{qty * rate:.2f}</CLOSINGVALUE>
   <GSTAPPLICABLE>Applicable</GSTAPPLICABLE>
   <GSTRATE>{random.choice([5, 12, 18, 28])}</GSTRATE>
   <HSNCODE>{random.randint(1000, 9999)}</HSNCODE>
   <REORDERLEVEL>{random.randint(10, 100)}</REORDERLEVEL>
   <MINIMUMORDERQTY>{random.randint(1, 10)}</MINIMUMORDERQTY>
  </STOCKITEM>
'''
    return xml


def generate_group_xml():
    """Generate standard Tally groups"""
    groups = [
        ("Capital Account", "", "Liabilities"),
        ("Current Assets", "", "Assets"),
        ("Current Liabilities", "", "Liabilities"),
        ("Direct Expenses", "", "Expenses"),
        ("Direct Incomes", "", "Income"),
        ("Fixed Assets", "", "Assets"),
        ("Indirect Expenses", "", "Expenses"),
        ("Indirect Incomes", "", "Income"),
        ("Investments", "", "Assets"),
        ("Loans (Liability)", "", "Liabilities"),
        ("Purchase Accounts", "", "Expenses"),
        ("Sales Accounts", "", "Income"),
        ("Bank Accounts", "Current Assets", "Assets"),
        ("Cash-in-Hand", "Current Assets", "Assets"),
        ("Sundry Creditors", "Current Liabilities", "Liabilities"),
        ("Sundry Debtors", "Current Assets", "Assets"),
        ("Duties & Taxes", "Current Liabilities", "Liabilities"),
        ("Secured Loans", "Loans (Liability)", "Liabilities"),
        ("Unsecured Loans", "Loans (Liability)", "Liabilities"),
        ("Reserves & Surplus", "Capital Account", "Liabilities"),
    ]
    
    xml = ""
    for name, parent, nature in groups:
        xml += f'''  <GROUP NAME="{name}">
   <NAME>{name}</NAME>
   <PARENT>{parent}</PARENT>
   <NATUREOFGROUP>{nature}</NATUREOFGROUP>
   <ISREVENUE>{"Yes" if nature == "Income" else "No"}</ISREVENUE>
   <ISEXPENSE>{"Yes" if nature == "Expenses" else "No"}</ISEXPENSE>
  </GROUP>
'''
    return xml


def main():
    print("=" * 60)
    print("TALLY XML TEST DATA GENERATOR")
    print(f"Target Size: {TARGET_SIZE_MB} MB (1 GB)")
    print("=" * 60)
    
    output_file = "tally_backup_1gb.xml"
    
    # Start XML
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n')
        f.write('<ENVELOPE>\n')
        f.write(' <HEADER>\n')
        f.write('  <VERSION>1</VERSION>\n')
        f.write('  <TALLYREQUEST>Export</TALLYREQUEST>\n')
        f.write('  <TYPE>Data</TYPE>\n')
        f.write('  <ID>All Masters and Vouchers</ID>\n')
        f.write(' </HEADER>\n')
        f.write(' <BODY>\n')
        f.write('  <DESC>\n')
        f.write('   <STATICVARIABLES>\n')
        f.write(f'    <SVCURRENTCOMPANY>{COMPANY_NAME}</SVCURRENTCOMPANY>\n')
        f.write('   </STATICVARIABLES>\n')
        f.write('  </DESC>\n')
        f.write('  <DATA>\n')
        f.write('   <TALLYMESSAGE>\n')
        
        # Company
        f.write(f'''    <COMPANY NAME="{COMPANY_NAME}">
     <NAME>{COMPANY_NAME}</NAME>
     <ADDRESS>123, Industrial Area, Mumbai</ADDRESS>
     <STATENAME>Maharashtra</STATENAME>
     <COUNTRYNAME>India</COUNTRYNAME>
     <PINCODE>400001</PINCODE>
     <PHONENUMBER>+91 22 12345678</PHONENUMBER>
     <EMAIL>info@testenterprise.com</EMAIL>
     <GSTIN>27AABCT1234A1ZY</GSTIN>
     <PANNO>AABCT1234A</PANNO>
     <STARTINGFROM>20230401</STARTINGFROM>
     <BOOKSFROM>20200401</BOOKSFROM>
    </COMPANY>
''')
        
        # Groups
        print("\n📊 Generating Groups...")
        f.write(generate_group_xml())
        print("✅ Generated 20 groups")
        
        # Ledgers
        print("\n📊 Generating Ledgers...")
        ledger_types = [
            ("debtor", 15000),
            ("creditor", 15000),
            ("sales", 5000),
            ("purchase", 5000),
            ("expense", 2500),
            ("bank", 100),
            ("cash", 50),
            ("asset", 500),
            ("loan", 200),
            ("capital", 50),
            ("tax", 100)
        ]
        
        ledger_index = 0
        total_revenue = 0
        total_expense = 0
        
        for ledger_type, count in ledger_types:
            print(f"   Generating {count} {ledger_type} ledgers...")
            for i in range(count):
                ledger_index += 1
                xml, balance = generate_ledger_xml(ledger_index, ledger_type)
                f.write(xml)
                
                if ledger_type == "sales":
                    total_revenue += abs(balance)
                elif ledger_type in ["purchase", "expense"]:
                    total_expense += abs(balance)
                
                if ledger_index % 10000 == 0:
                    current_size = os.path.getsize(output_file) / 1024 / 1024
                    print(f"   Progress: {ledger_index} ledgers ({current_size:.1f} MB)")
        
        print(f"✅ Generated {ledger_index} ledgers")
        
        # Stock Items
        print("\n📦 Generating Stock Items...")
        for i in range(10000):
            f.write(generate_stock_item_xml(i + 1))
            if (i + 1) % 2000 == 0:
                print(f"   Progress: {i + 1} stock items")
        print("✅ Generated 10,000 stock items")
        
        # Vouchers
        print("\n📝 Generating Vouchers...")
        target_bytes = TARGET_SIZE_MB * 1024 * 1024
        voucher_count = 0
        
        while True:
            voucher_count += 1
            date = random_date(2023, 2024)
            f.write(generate_voucher_xml(voucher_count, date))
            
            if voucher_count % 50000 == 0:
                f.flush()
                current_size = os.path.getsize(output_file) / 1024 / 1024
                print(f"   Progress: {voucher_count} vouchers ({current_size:.1f} MB)")
                
                if current_size >= target_bytes / 1024 / 1024 * 0.95:
                    break
            
            if voucher_count >= 600000:
                break
        
        print(f"✅ Generated {voucher_count} vouchers")
        
        # Close XML
        f.write('   </TALLYMESSAGE>\n')
        f.write('  </DATA>\n')
        f.write(' </BODY>\n')
        f.write('</ENVELOPE>\n')
    
    file_size = os.path.getsize(output_file) / 1024 / 1024
    
    print("\n" + "=" * 60)
    print("✅ XML DATA GENERATION COMPLETE!")
    print("=" * 60)
    print(f"📁 Output File: {output_file}")
    print(f"📊 File Size: {file_size:.2f} MB")
    print(f"📋 Total Ledgers: {ledger_index:,}")
    print(f"📦 Total Stock Items: 10,000")
    print(f"📝 Total Vouchers: {voucher_count:,}")
    print(f"💰 Total Revenue: ₹{total_revenue:,.2f}")
    print(f"💸 Total Expense: ₹{total_expense:,.2f}")
    print("=" * 60)
    print("\n📌 Use this file to import into Tally or test with TallyConnector")


if __name__ == "__main__":
    main()

