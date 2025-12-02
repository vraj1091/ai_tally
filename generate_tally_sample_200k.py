#!/usr/bin/env python3
"""
Generate comprehensive Tally XML sample file with 200,000 vouchers
Includes all types of Tally data: Companies, Groups, Ledgers, Stock Items, and Vouchers
"""

import random
from datetime import datetime, timedelta
from decimal import Decimal

# Configuration
NUM_VOUCHERS = 200000
OUTPUT_FILE = "tally_sample_200k_comprehensive.xml"

# Data for realistic generation
CUSTOMER_NAMES = [
    "ABC Corporation Ltd", "XYZ Industries Pvt Ltd", "Global Traders Inc",
    "Tech Solutions Ltd", "Prime Manufacturing", "Elite Enterprises",
    "Metro Distributors", "Apex Trading Co", "Summit Industries",
    "Vertex Corporation", "Pinnacle Traders", "Zenith Exports"
]

VENDOR_NAMES = [
    "Supplier One Pvt Ltd", "Raw Material Suppliers Ltd", "Component Traders",
    "Industrial Suppliers", "Material Masters", "Quality Vendors Ltd"
]

PRODUCT_NAMES = [
    "Product A - Premium Widget", "Product B - Standard Widget", 
    "Product C - Economy Widget", "Product D - Deluxe Model",
    "Product E - Basic Model", "Service Package A", "Service Package B"
]

EXPENSE_CATEGORIES = [
    "Salary and Wages", "Rent Expense", "Electricity and Utilities",
    "Transportation Charges", "Marketing Expenses", "Office Supplies",
    "Telephone and Internet", "Insurance Premium", "Legal and Professional Fees",
    "Repairs and Maintenance", "Depreciation", "Bank Charges"
]

VOUCHER_TYPES = {
    "Sales": {"weight": 30, "revenue": True},
    "Purchase": {"weight": 25, "revenue": False},
    "Receipt": {"weight": 15, "revenue": True},
    "Payment": {"weight": 15, "revenue": False},
    "Journal": {"weight": 5, "revenue": False},
    "Contra": {"weight": 5, "revenue": False},
    "Credit Note": {"weight": 3, "revenue": True},
    "Debit Note": {"weight": 2, "revenue": False}
}

def random_date(start_date, end_date):
    """Generate random date between start and end"""
    delta = end_date - start_date
    random_days = random.randint(0, delta.days)
    return start_date + timedelta(days=random_days)

def random_amount(min_amt=1000, max_amt=500000):
    """Generate random amount"""
    return round(random.uniform(min_amt, max_amt), 2)

def generate_voucher_number(voucher_type, index):
    """Generate voucher number based on type"""
    prefix_map = {
        "Sales": "SI",
        "Purchase": "PI",
        "Receipt": "RC",
        "Payment": "PY",
        "Journal": "JV",
        "Contra": "CN",
        "Credit Note": "CR",
        "Debit Note": "DB"
    }
    prefix = prefix_map.get(voucher_type, "VC")
    return f"{prefix}-{index:06d}"

def write_xml_header(f):
    """Write XML header and company/master data"""
    f.write('''<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>All Masters and Vouchers</ID>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters and Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        
        <!-- COMPANY MASTER -->
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <COMPANY>
            <NAME>Sample Trading Company Pvt Ltd</NAME>
            <GUID>5a8f3c2d-1234-5678-9abc-def012345678</GUID>
            <BOOKSBEGINFROM>20240401</BOOKSBEGINFROM>
            <BOOKSENDINGON>20250331</BOOKSENDINGON>
            <CURRENCYNAME>₹</CURRENCYNAME>
            <FINANCIALYEARFROM>20240401</FINANCIALYEARFROM>
            <FINANCIALYEARTO>20250331</FINANCIALYEARTO>
            <ADDRESS>
              <ADDRESS>123 Business Park, MG Road</ADDRESS>
              <ADDRESS>Mumbai, Maharashtra - 400001</ADDRESS>
              <ADDRESS>India</ADDRESS>
            </ADDRESS>
            <GSTIN>27AABCT1234A1Z5</GSTIN>
            <PANNO>AABCT1234A</PANNO>
            <EMAIL>accounts@sampletrade.com</EMAIL>
            <PHONENO>+91-22-12345678</PHONENO>
          </COMPANY>
        </TALLYMESSAGE>
        
''')
    
    # Write Groups
    groups = [
        ("Sales Accounts", "Primary", "Yes", "No"),
        ("Purchase Accounts", "Primary", "No", "Yes"),
        ("Direct Expenses", "Primary", "No", "Yes"),
        ("Indirect Expenses", "Primary", "No", "Yes"),
        ("Current Assets", "Primary", "No", "Yes"),
        ("Current Liabilities", "Primary", "No", "No"),
        ("Sundry Debtors", "Current Assets", "No", "Yes"),
        ("Sundry Creditors", "Current Liabilities", "No", "No"),
        ("Bank Accounts", "Current Assets", "No", "Yes"),
        ("Cash-in-Hand", "Current Assets", "No", "Yes"),
        ("Duties & Taxes", "Current Liabilities", "No", "No"),
    ]
    
    for name, parent, is_revenue, is_deemed_positive in groups:
        f.write(f'''        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <GROUP NAME="{name}" RESERVEDNAME="">
            <NAME>{name}</NAME>
            <PARENT>{parent}</PARENT>
            <ISREVENUE>{is_revenue}</ISREVENUE>
            <ISDEEMEDPOSITIVE>{is_deemed_positive}</ISDEEMEDPOSITIVE>
          </GROUP>
        </TALLYMESSAGE>
        
''')
    
    # Write Revenue Ledgers
    revenue_ledgers = [
        ("Domestic Sales", "Sales Accounts", -45000000.00),
        ("Export Sales", "Sales Accounts", -28000000.00),
        ("Service Income", "Sales Accounts", -12500000.00),
        ("Consulting Revenue", "Sales Accounts", -8750000.00),
        ("Interest Income", "Sales Accounts", -1250000.00),
    ]
    
    for idx, (name, parent, balance) in enumerate(revenue_ledgers, 1):
        f.write(f'''        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <LEDGER NAME="{name}" RESERVEDNAME="">
            <NAME>{name}</NAME>
            <GUID>led-{idx:03d}-revenue</GUID>
            <PARENT>{parent}</PARENT>
            <ISREVENUE>Yes</ISREVENUE>
            <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
            <OPENINGBALANCE>0.00</OPENINGBALANCE>
            <CLOSINGBALANCE>{balance}</CLOSINGBALANCE>
            <CURRENTBALANCE>{balance}</CURRENTBALANCE>
          </LEDGER>
        </TALLYMESSAGE>
        
''')
    
    # Write Expense Ledgers
    expense_ledgers = [
        ("Purchase of Raw Materials", "Purchase Accounts", 32000000.00),
        ("Salary and Wages", "Direct Expenses", 18500000.00),
        ("Rent Expense", "Indirect Expenses", 3600000.00),
        ("Electricity and Utilities", "Indirect Expenses", 2400000.00),
        ("Transportation Charges", "Direct Expenses", 4800000.00),
        ("Marketing Expenses", "Indirect Expenses", 3200000.00),
        ("Office Supplies", "Indirect Expenses", 1200000.00),
        ("Telephone and Internet", "Indirect Expenses", 600000.00),
        ("Insurance Premium", "Indirect Expenses", 1800000.00),
        ("Legal and Professional Fees", "Indirect Expenses", 2400000.00),
    ]
    
    for idx, (name, parent, balance) in enumerate(expense_ledgers, 101):
        f.write(f'''        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <LEDGER NAME="{name}" RESERVEDNAME="">
            <NAME>{name}</NAME>
            <GUID>led-{idx:03d}-expense</GUID>
            <PARENT>{parent}</PARENT>
            <ISREVENUE>No</ISREVENUE>
            <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
            <OPENINGBALANCE>0.00</OPENINGBALANCE>
            <CLOSINGBALANCE>{balance}</CLOSINGBALANCE>
            <CURRENTBALANCE>{balance}</CURRENTBALANCE>
          </LEDGER>
        </TALLYMESSAGE>
        
''')
    
    # Write Customer Ledgers
    for idx, customer in enumerate(CUSTOMER_NAMES, 201):
        balance = random_amount(500000, 15000000)
        f.write(f'''        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <LEDGER NAME="{customer}" RESERVEDNAME="">
            <NAME>{customer}</NAME>
            <GUID>led-{idx:03d}-customer</GUID>
            <PARENT>Sundry Debtors</PARENT>
            <ISREVENUE>No</ISREVENUE>
            <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
            <OPENINGBALANCE>0.00</OPENINGBALANCE>
            <CLOSINGBALANCE>{balance}</CLOSINGBALANCE>
            <CURRENTBALANCE>{balance}</CURRENTBALANCE>
            <GSTIN>27AABC{idx}1234A1Z{idx}</GSTIN>
          </LEDGER>
        </TALLYMESSAGE>
        
''')
    
    # Write Vendor Ledgers
    for idx, vendor in enumerate(VENDOR_NAMES, 301):
        balance = -random_amount(300000, 10000000)
        f.write(f'''        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <LEDGER NAME="{vendor}" RESERVEDNAME="">
            <NAME>{vendor}</NAME>
            <GUID>led-{idx:03d}-vendor</GUID>
            <PARENT>Sundry Creditors</PARENT>
            <ISREVENUE>No</ISREVENUE>
            <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
            <OPENINGBALANCE>0.00</OPENINGBALANCE>
            <CLOSINGBALANCE>{balance}</CLOSINGBALANCE>
            <CURRENTBALANCE>{balance}</CURRENTBALANCE>
            <GSTIN>27AABC{idx}1234B1Z{idx}</GSTIN>
          </LEDGER>
        </TALLYMESSAGE>
        
''')
    
    # Write Bank Ledgers
    banks = [
        ("HDFC Bank Current Account", 5000000.00, 18750000.00, "50200012345678", "HDFC0001234"),
        ("ICICI Bank Savings Account", 2000000.00, 6500000.00, "000405012345", "ICIC0000004"),
        ("SBI Current Account", 3000000.00, 9200000.00, "30012345678", "SBIN0001234"),
    ]
    
    for idx, (name, opening, closing, acc_no, ifsc) in enumerate(banks, 401):
        f.write(f'''        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <LEDGER NAME="{name}" RESERVEDNAME="">
            <NAME>{name}</NAME>
            <GUID>led-{idx:03d}-bank</GUID>
            <PARENT>Bank Accounts</PARENT>
            <ISREVENUE>No</ISREVENUE>
            <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
            <OPENINGBALANCE>{opening}</OPENINGBALANCE>
            <CLOSINGBALANCE>{closing}</CLOSINGBALANCE>
            <CURRENTBALANCE>{closing}</CURRENTBALANCE>
            <BANKACCOUNTHOLDER>Sample Trading Company Pvt Ltd</BANKACCOUNTHOLDER>
            <ACCOUNTNUMBER>{acc_no}</ACCOUNTNUMBER>
            <IFSCODE>{ifsc}</IFSCODE>
          </LEDGER>
        </TALLYMESSAGE>
        
''')
    
    # Write Cash Ledger
    f.write('''        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <LEDGER NAME="Cash in Hand" RESERVEDNAME="">
            <NAME>Cash in Hand</NAME>
            <GUID>led-501-cash</GUID>
            <PARENT>Cash-in-Hand</PARENT>
            <ISREVENUE>No</ISREVENUE>
            <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
            <OPENINGBALANCE>500000.00</OPENINGBALANCE>
            <CLOSINGBALANCE>2850000.00</CLOSINGBALANCE>
            <CURRENTBALANCE>2850000.00</CURRENTBALANCE>
          </LEDGER>
        </TALLYMESSAGE>
        
''')
    
    # Write Tax Ledgers
    tax_ledgers = [
        ("GST Output CGST @ 9%", "Duties & Taxes", -4050000.00),
        ("GST Output SGST @ 9%", "Duties & Taxes", -4050000.00),
        ("GST Input CGST @ 9%", "Duties & Taxes", 2880000.00),
        ("GST Input SGST @ 9%", "Duties & Taxes", 2880000.00),
        ("GST Output IGST @ 18%", "Duties & Taxes", -2100000.00),
        ("GST Input IGST @ 18%", "Duties & Taxes", 1500000.00),
    ]
    
    for idx, (name, parent, balance) in enumerate(tax_ledgers, 601):
        is_positive = "Yes" if balance > 0 else "No"
        f.write(f'''        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <LEDGER NAME="{name}" RESERVEDNAME="">
            <NAME>{name}</NAME>
            <GUID>led-{idx:03d}-tax</GUID>
            <PARENT>{parent}</PARENT>
            <ISREVENUE>No</ISREVENUE>
            <ISDEEMEDPOSITIVE>{is_positive}</ISDEEMEDPOSITIVE>
            <OPENINGBALANCE>0.00</OPENINGBALANCE>
            <CLOSINGBALANCE>{balance}</CLOSINGBALANCE>
            <CURRENTBALANCE>{balance}</CURRENTBALANCE>
            <TAXTYPE>GST</TAXTYPE>
            <GSTAPPLICABLE>Applicable</GSTAPPLICABLE>
          </LEDGER>
        </TALLYMESSAGE>
        
''')
    
    # Write Stock Items
    for idx, product in enumerate(PRODUCT_NAMES, 1):
        opening_qty = random.randint(100, 2000)
        closing_qty = random.randint(200, 5000)
        rate = random_amount(1000, 10000)
        f.write(f'''        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <STOCKITEM NAME="{product}" RESERVEDNAME="">
            <NAME>{product}</NAME>
            <GUID>stk-{idx:03d}-product</GUID>
            <PARENT>Raw Materials</PARENT>
            <CATEGORY>Finished Goods</CATEGORY>
            <BASEUNITS>Nos</BASEUNITS>
            <OPENINGBALANCE>{opening_qty}</OPENINGBALANCE>
            <OPENINGVALUE>{opening_qty * rate:.2f}</OPENINGVALUE>
            <OPENINGRATE>{rate:.2f}</OPENINGRATE>
            <CLOSINGBALANCE>{closing_qty}</CLOSINGBALANCE>
            <CLOSINGVALUE>{closing_qty * rate * 1.1:.2f}</CLOSINGVALUE>
            <CLOSINGRATE>{rate * 1.1:.2f}</CLOSINGRATE>
            <GSTAPPLICABLE>Applicable</GSTAPPLICABLE>
            <HSNCODE>84159000</HSNCODE>
          </STOCKITEM>
        </TALLYMESSAGE>
        
''')

def write_voucher(f, voucher_type, voucher_no, date, amount, party_name, ledger_name, narration):
    """Write a single voucher entry"""
    date_str = date.strftime("%Y%m%d")
    guid = f"vchr-{voucher_no}-{voucher_type.replace(' ', '-').lower()}"
    
    # Determine debit/credit based on voucher type
    if voucher_type in ["Sales", "Receipt", "Credit Note"]:
        # Revenue vouchers
        dr_ledger = party_name if voucher_type == "Sales" else "HDFC Bank Current Account"
        cr_ledger = ledger_name
    elif voucher_type in ["Purchase", "Payment", "Debit Note"]:
        # Expense vouchers
        dr_ledger = ledger_name
        cr_ledger = party_name if voucher_type == "Purchase" else "HDFC Bank Current Account"
    else:
        # Journal/Contra
        dr_ledger = "Cash in Hand"
        cr_ledger = "HDFC Bank Current Account"
    
    f.write(f'''        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER REMOTEID="" VCHKEY="" VCHTYPE="{voucher_type}" ACTION="Create" OBJVIEW="Accounting Voucher View">
            <DATE>{date_str}</DATE>
            <GUID>{guid}</GUID>
            <VOUCHERTYPENAME>{voucher_type}</VOUCHERTYPENAME>
            <VOUCHERNUMBER>{voucher_no}</VOUCHERNUMBER>
            <PARTYLEDGERNAME>{party_name}</PARTYLEDGERNAME>
            <EFFECTIVEDATE>{date_str}</EFFECTIVEDATE>
            <NARRATION>{narration}</NARRATION>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>{dr_ledger}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>{amount:.2f}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>{cr_ledger}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>-{amount:.2f}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
          </VOUCHER>
        </TALLYMESSAGE>
        
''')

def write_xml_footer(f):
    """Write XML footer"""
    f.write('''      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>
''')

def generate_sample_file():
    """Generate complete sample file with 200k vouchers"""
    print(f"Generating Tally XML sample file with {NUM_VOUCHERS:,} vouchers...")
    print(f"Output file: {OUTPUT_FILE}")
    
    start_date = datetime(2024, 4, 1)
    end_date = datetime(2025, 3, 31)
    
    # Create weighted list of voucher types
    voucher_type_list = []
    for vtype, config in VOUCHER_TYPES.items():
        voucher_type_list.extend([vtype] * config["weight"])
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        # Write header and master data
        print("Writing XML header and master data...")
        write_xml_header(f)
        
        # Generate vouchers
        print(f"Generating {NUM_VOUCHERS:,} vouchers...")
        for i in range(1, NUM_VOUCHERS + 1):
            if i % 10000 == 0:
                print(f"  Generated {i:,} vouchers...")
            
            # Random voucher type
            voucher_type = random.choice(voucher_type_list)
            voucher_no = generate_voucher_number(voucher_type, i)
            
            # Random date
            date = random_date(start_date, end_date)
            
            # Random amount
            if voucher_type in ["Sales", "Purchase"]:
                amount = random_amount(5000, 500000)
            elif voucher_type in ["Receipt", "Payment"]:
                amount = random_amount(10000, 1000000)
            else:
                amount = random_amount(1000, 100000)
            
            # Select party and ledger based on voucher type
            if voucher_type in ["Sales", "Receipt", "Credit Note"]:
                party_name = random.choice(CUSTOMER_NAMES)
                ledger_name = random.choice(["Domestic Sales", "Export Sales", "Service Income", "Consulting Revenue"])
                narration = f"{voucher_type} transaction - {party_name}"
            elif voucher_type in ["Purchase", "Payment", "Debit Note"]:
                party_name = random.choice(VENDOR_NAMES)
                ledger_name = random.choice(["Purchase of Raw Materials"] + EXPENSE_CATEGORIES[:5])
                narration = f"{voucher_type} transaction - {party_name}"
            else:
                party_name = "Internal Transfer"
                ledger_name = random.choice(EXPENSE_CATEGORIES)
                narration = f"{voucher_type} - {ledger_name}"
            
            # Write voucher
            write_voucher(f, voucher_type, voucher_no, date, amount, party_name, ledger_name, narration)
        
        # Write footer
        print("Writing XML footer...")
        write_xml_footer(f)
    
    print(f"\n✅ Successfully generated {OUTPUT_FILE}")
    print(f"   Total vouchers: {NUM_VOUCHERS:,}")
    print(f"   File size: {os.path.getsize(OUTPUT_FILE) / (1024*1024):.2f} MB")
    print("\n📊 Sample includes:")
    print("   ✓ 1 Company with full details")
    print("   ✓ 11 Groups (Sales, Purchase, Expenses, Assets, Liabilities, etc.)")
    print(f"   ✓ {5 + 10 + len(CUSTOMER_NAMES) + len(VENDOR_NAMES) + 3 + 1 + 6} Ledgers (Revenue, Expense, Customers, Vendors, Banks, Cash, Tax)")
    print(f"   ✓ {len(PRODUCT_NAMES)} Stock Items")
    print(f"   ✓ {NUM_VOUCHERS:,} Vouchers (Sales, Purchase, Receipt, Payment, Journal, Contra, Credit/Debit Notes)")
    print("\n🎯 Ready to test with your AI Tally Assistant!")

if __name__ == "__main__":
    import os
    generate_sample_file()

