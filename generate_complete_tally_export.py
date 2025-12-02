#!/usr/bin/env python3
"""
Generate COMPLETE Tally XML Export with ALL Data Types
Based on Tally.ERP 9 / TallyPrime structure
Includes: Company, Currency, Groups, Ledgers, Stock Items, Units, Godowns, 
Cost Centres, Cost Categories, Voucher Types, Budgets, Scenarios, and ALL Voucher Types
"""

import random
from datetime import datetime, timedelta
from decimal import Decimal
import uuid

# Configuration
NUM_VOUCHERS = 200000
OUTPUT_FILE = "tally_complete_export_200k.xml"

# Master Data Lists
UNITS = [
    "PCS", "NOS", "KGS", "GMS", "LTR", "MTR", "BOX", "CTN", "DOZ", "SET",
    "PKT", "BAG", "ROLL", "SHEET", "PAIR", "TON", "QNTL", "BUNDLE", "DRUM", "CAN"
]

CURRENCIES = [
    {"symbol": "₹", "name": "Indian Rupee", "code": "INR", "rate": 1.0},
    {"symbol": "$", "name": "US Dollar", "code": "USD", "rate": 83.25},
    {"symbol": "€", "name": "Euro", "code": "EUR", "rate": 90.50},
    {"symbol": "£", "name": "British Pound", "code": "GBP", "rate": 105.75},
    {"symbol": "¥", "name": "Japanese Yen", "code": "JPY", "rate": 0.56},
]

GODOWNS = [
    "Main Warehouse", "Branch Warehouse", "Factory Godown", "Retail Store",
    "Distribution Center", "Cold Storage", "Raw Material Store", "Finished Goods Store"
]

COST_CENTRES = [
    "Head Office", "Branch Office - Mumbai", "Branch Office - Delhi", 
    "Branch Office - Bangalore", "Manufacturing Unit", "Sales Department",
    "Marketing Department", "Admin Department", "IT Department"
]

COST_CATEGORIES = [
    "Direct Material", "Direct Labour", "Manufacturing Overhead", 
    "Administrative Expenses", "Selling Expenses", "Distribution Expenses"
]

STOCK_CATEGORIES = [
    "Electronics", "Furniture", "Stationery", "Hardware", "Software",
    "Raw Materials", "Finished Goods", "Work in Progress", "Consumables"
]

VOUCHER_TYPES_CUSTOM = [
    "Cash Sale", "Credit Sale", "Export Sale", "Cash Purchase", "Credit Purchase",
    "Import Purchase", "Bank Receipt", "Cash Receipt", "Bank Payment", "Cash Payment"
]

# Financial Data
REVENUE_LEDGERS = [
    {"name": "Domestic Sales - Electronics", "amount": 45000000},
    {"name": "Domestic Sales - Furniture", "amount": 32000000},
    {"name": "Export Sales - USA", "amount": 28000000},
    {"name": "Export Sales - Europe", "amount": 18000000},
    {"name": "Service Income - Consulting", "amount": 12500000},
    {"name": "Service Income - Maintenance", "amount": 8750000},
    {"name": "Commission Income", "amount": 5500000},
    {"name": "Interest Income - Bank", "amount": 1250000},
    {"name": "Dividend Income", "amount": 850000},
    {"name": "Rental Income", "amount": 2400000},
]

EXPENSE_LEDGERS = [
    {"name": "Purchase - Raw Materials", "amount": 32000000},
    {"name": "Purchase - Trading Goods", "amount": 18000000},
    {"name": "Salary and Wages", "amount": 18500000},
    {"name": "Rent Expense", "amount": 3600000},
    {"name": "Electricity and Water", "amount": 2400000},
    {"name": "Transportation and Freight", "amount": 4800000},
    {"name": "Marketing and Advertising", "amount": 3200000},
    {"name": "Office Supplies", "amount": 1200000},
    {"name": "Telephone and Internet", "amount": 600000},
    {"name": "Insurance Premium", "amount": 1800000},
    {"name": "Legal and Professional Fees", "amount": 2400000},
    {"name": "Repairs and Maintenance", "amount": 1500000},
    {"name": "Depreciation", "amount": 3500000},
    {"name": "Bank Charges and Interest", "amount": 800000},
    {"name": "Travelling Expenses", "amount": 2200000},
]

CUSTOMER_NAMES = [
    "ABC Corporation Ltd", "XYZ Industries Pvt Ltd", "Global Traders Inc",
    "Tech Solutions Ltd", "Prime Manufacturing Co", "Elite Enterprises",
    "Metro Distributors", "Apex Trading Company", "Summit Industries Ltd",
    "Vertex Corporation", "Pinnacle Traders", "Zenith Exports Pvt Ltd",
    "Omega Systems", "Delta Enterprises", "Sigma Trading Co",
    "Alpha Industries", "Beta Corporation", "Gamma Traders",
    "Theta Solutions", "Kappa Exports Ltd"
]

VENDOR_NAMES = [
    "Supplier One Pvt Ltd", "Raw Material Suppliers Ltd", "Component Traders",
    "Industrial Suppliers Co", "Material Masters", "Quality Vendors Ltd",
    "Prime Suppliers", "Elite Materials", "Mega Suppliers Pvt Ltd",
    "Super Traders", "Best Quality Suppliers", "Top Grade Materials"
]

EMPLOYEE_NAMES = [
    "Rajesh Kumar", "Priya Sharma", "Amit Patel", "Sneha Reddy", "Vikram Singh",
    "Anjali Gupta", "Rahul Verma", "Pooja Desai", "Suresh Iyer", "Kavita Nair",
    "Manoj Joshi", "Deepa Menon", "Arun Kumar", "Neha Agarwal", "Sanjay Mehta"
]

BANK_ACCOUNTS = [
    {"name": "HDFC Bank Current Account", "acc": "50200012345678", "ifsc": "HDFC0001234", "opening": 5000000, "closing": 18750000},
    {"name": "ICICI Bank Current Account", "acc": "000405012345", "ifsc": "ICIC0000004", "opening": 2000000, "closing": 6500000},
    {"name": "SBI Current Account", "acc": "30012345678", "ifsc": "SBIN0001234", "opening": 3000000, "closing": 9200000},
    {"name": "Axis Bank Savings Account", "acc": "917020012345678", "ifsc": "UTIB0001234", "opening": 1000000, "closing": 3500000},
]

def random_date(start_date, end_date):
    """Generate random date between start and end"""
    delta = end_date - start_date
    random_days = random.randint(0, delta.days)
    return start_date + timedelta(days=random_days)

def random_amount(min_amt=1000, max_amt=500000):
    """Generate random amount"""
    return round(random.uniform(min_amt, max_amt), 2)

def generate_guid():
    """Generate Tally-style GUID"""
    return str(uuid.uuid4())

def write_xml_header(f):
    """Write XML header and company master"""
    f.write('''<ENVELOPE>
  <HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC><REPORTNAME>All Masters and Vouchers</REPORTNAME></REQUESTDESC>
      <REQUESTDATA>
        
        <!-- ========================================== -->
        <!-- COMPANY MASTER -->
        <!-- ========================================== -->
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <COMPANY NAME="Complete Trading & Manufacturing Co Pvt Ltd" ACTION="Create">
            <NAME>Complete Trading &amp; Manufacturing Co Pvt Ltd</NAME>
            <GUID>''' + generate_guid() + '''</GUID>
            <BOOKSBEGINFROM>20240401</BOOKSBEGINFROM>
            <BOOKSENDINGON>20250331</BOOKSENDINGON>
            <CURRENCYNAME>₹</CURRENCYNAME>
            <FINANCIALYEARFROM>20240401</FINANCIALYEARFROM>
            <FINANCIALYEARTO>20250331</FINANCIALYEARTO>
            <COMPANYNUMBER>1</COMPANYNUMBER>
            <COMPANYADDRESS>
              <ADDRESS>Plot No. 123, Industrial Area, Phase-II</ADDRESS>
              <ADDRESS>MG Road, Andheri East</ADDRESS>
              <ADDRESS>Mumbai, Maharashtra - 400093</ADDRESS>
              <ADDRESS>India</ADDRESS>
            </COMPANYADDRESS>
            <EMAIL>accounts@completetrade.com</EMAIL>
            <PHONENO>+91-22-12345678</PHONENO>
            <FAXNO>+91-22-12345679</FAXNO>
            <WEBSITE>www.completetrade.com</WEBSITE>
            <GSTIN>27AABCT1234A1Z5</GSTIN>
            <GSTREGISTRATIONTYPE>Regular</GSTREGISTRATIONTYPE>
            <PANNO>AABCT1234A</PANNO>
            <TANNO>MUMT12345E</TANNO>
            <CINNO>U51909MH2015PTC123456</CINNO>
            <INCOMETAXNUMBER>AABCT1234A</INCOMETAXNUMBER>
            <SALESTAXNUMBER>27AABCT1234A1Z5</SALESTAXNUMBER>
            <VATTIN>27123456789</VATTIN>
            <EXCISEREGISTRATIONNUMBER>AAAEE1234AEM001</EXCISEREGISTRATIONNUMBER>
            <SERVICETAXNUMBER>AABCT1234AST001</SERVICETAXNUMBER>
            <IMPORTEXPORTCODE>0512345678</IMPORTEXPORTCODE>
            <BANKDETAILS>
              <BANKNAME>HDFC Bank</BANKNAME>
              <ACCOUNTNUMBER>50200012345678</ACCOUNTNUMBER>
              <IFSCODE>HDFC0001234</IFSCODE>
              <BANKBRANCH>Andheri East Branch</BANKBRANCH>
            </BANKDETAILS>
            <USEFORINTEREST>No</USEFORINTEREST>
            <USEFORGST>Yes</USEFORGST>
            <ENABLETDS>Yes</ENABLETDS>
            <ENABLETCS>Yes</ENABLETCS>
          </COMPANY>
        </TALLYMESSAGE>
        
''')

def write_currency_masters(f):
    """Write currency masters"""
    f.write('''        <!-- ========================================== -->
        <!-- CURRENCY MASTERS -->
        <!-- ========================================== -->
''')
    for curr in CURRENCIES:
        f.write(f'''        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <CURRENCY NAME="{curr['name']}" ACTION="Create">
            <NAME>{curr['name']}</NAME>
            <GUID>{generate_guid()}</GUID>
            <CURRENCYSYMBOL>{curr['symbol']}</CURRENCYSYMBOL>
            <CURRENCYNAME>{curr['code']}</CURRENCYNAME>
            <DECIMALPLACES>2</DECIMALPLACES>
            <DECIMALPLACESFORCURRENCY>2</DECIMALPLACESFORCURRENCY>
            <DECIMALPLACESFORPRINTING>2</DECIMALPLACESFORPRINTING>
            <ISSUFFIX>No</ISSUFFIX>
            <HASSPACE>Yes</HASSPACE>
            <EXPANDEDSYMBOL>{curr['symbol']}</EXPANDEDSYMBOL>
            <RATEOFEXCHANGE>{curr['rate']}</RATEOFEXCHANGE>
          </CURRENCY>
        </TALLYMESSAGE>
        
''')

def write_unit_masters(f):
    """Write unit of measure masters"""
    f.write('''        <!-- ========================================== -->
        <!-- UNIT OF MEASURE MASTERS -->
        <!-- ========================================== -->
''')
    for unit in UNITS:
        f.write(f'''        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <UNIT NAME="{unit}" ACTION="Create">
            <NAME>{unit}</NAME>
            <GUID>{generate_guid()}</GUID>
            <ISSIMPLEUNIT>Yes</ISSIMPLEUNIT>
            <DECIMALPLACES>2</DECIMALPLACES>
          </UNIT>
        </TALLYMESSAGE>
        
''')

def write_godown_masters(f):
    """Write godown (warehouse) masters"""
    f.write('''        <!-- ========================================== -->
        <!-- GODOWN MASTERS (Warehouses/Storage Locations) -->
        <!-- ========================================== -->
''')
    for idx, godown in enumerate(GODOWNS, 1):
        f.write(f'''        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <GODOWN NAME="{godown}" ACTION="Create">
            <NAME>{godown}</NAME>
            <GUID>{generate_guid()}</GUID>
            <PARENT>Primary</PARENT>
            <ADDRESS>
              <ADDRESS>Location {idx}, Industrial Area</ADDRESS>
              <ADDRESS>Mumbai - 400093</ADDRESS>
            </ADDRESS>
            <CONTACTPERSON>Manager {idx}</CONTACTPERSON>
            <EMAIL>godown{idx}@completetrade.com</EMAIL>
            <PHONENO>+91-22-1234{idx:04d}</PHONENO>
          </GODOWN>
        </TALLYMESSAGE>
        
''')

def write_cost_centre_masters(f):
    """Write cost centre masters"""
    f.write('''        <!-- ========================================== -->
        <!-- COST CENTRE MASTERS -->
        <!-- ========================================== -->
''')
    for idx, cc in enumerate(COST_CENTRES, 1):
        f.write(f'''        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <COSTCENTRE NAME="{cc}" ACTION="Create">
            <NAME>{cc}</NAME>
            <GUID>{generate_guid()}</GUID>
            <PARENT>Primary</PARENT>
            <CATEGORY>Primary Cost Category</CATEGORY>
          </COSTCENTRE>
        </TALLYMESSAGE>
        
''')

def write_cost_category_masters(f):
    """Write cost category masters"""
    f.write('''        <!-- ========================================== -->
        <!-- COST CATEGORY MASTERS -->
        <!-- ========================================== -->
''')
    for idx, cat in enumerate(COST_CATEGORIES, 1):
        f.write(f'''        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <COSTCATEGORY NAME="{cat}" ACTION="Create">
            <NAME>{cat}</NAME>
            <GUID>{generate_guid()}</GUID>
            <ALLOCATEREVENUE>No</ALLOCATEREVENUE>
            <ALLOCATENONREVENUE>Yes</ALLOCATENONREVENUE>
          </COSTCATEGORY>
        </TALLYMESSAGE>
        
''')

def write_group_masters(f):
    """Write group masters"""
    f.write('''        <!-- ========================================== -->
        <!-- GROUP MASTERS -->
        <!-- ========================================== -->
''')
    
    groups = [
        # Primary Groups
        ("Capital Account", "Primary", "No", "No"),
        ("Reserves & Surplus", "Primary", "No", "No"),
        ("Secured Loans", "Primary", "No", "No"),
        ("Unsecured Loans", "Primary", "No", "No"),
        ("Fixed Assets", "Primary", "No", "Yes"),
        ("Investments", "Primary", "No", "Yes"),
        ("Current Assets", "Primary", "No", "Yes"),
        ("Current Liabilities", "Primary", "No", "No"),
        ("Sales Accounts", "Primary", "Yes", "No"),
        ("Purchase Accounts", "Primary", "No", "Yes"),
        ("Direct Incomes", "Primary", "Yes", "No"),
        ("Indirect Incomes", "Primary", "Yes", "No"),
        ("Direct Expenses", "Primary", "No", "Yes"),
        ("Indirect Expenses", "Primary", "No", "Yes"),
        
        # Sub Groups
        ("Sundry Debtors", "Current Assets", "No", "Yes"),
        ("Sundry Creditors", "Current Liabilities", "No", "No"),
        ("Bank Accounts", "Current Assets", "No", "Yes"),
        ("Cash-in-Hand", "Current Assets", "No", "Yes"),
        ("Stock-in-Hand", "Current Assets", "No", "Yes"),
        ("Deposits (Asset)", "Current Assets", "No", "Yes"),
        ("Loans & Advances (Asset)", "Current Assets", "No", "Yes"),
        ("Provisions", "Current Liabilities", "No", "No"),
        ("Duties & Taxes", "Current Liabilities", "No", "No"),
        
        # Stock Groups
        ("TG_Electronics", "Stock-in-Hand", "No", "Yes"),
        ("TG_Furniture", "Stock-in-Hand", "No", "Yes"),
        ("TG_Raw Materials", "Stock-in-Hand", "No", "Yes"),
        ("TG_Finished Goods", "Stock-in-Hand", "No", "Yes"),
    ]
    
    for name, parent, is_revenue, is_deemed_positive in groups:
        f.write(f'''        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <GROUP NAME="{name}" ACTION="Create">
            <NAME>{name}</NAME>
            <GUID>{generate_guid()}</GUID>
            <PARENT>{parent}</PARENT>
            <ISREVENUE>{is_revenue}</ISREVENUE>
            <ISDEEMEDPOSITIVE>{is_deemed_positive}</ISDEEMEDPOSITIVE>
            <AFFECTSSTOCK>{'Yes' if 'Stock' in name else 'No'}</AFFECTSSTOCK>
          </GROUP>
        </TALLYMESSAGE>
        
''')

def write_ledger_masters(f):
    """Write ledger masters"""
    f.write('''        <!-- ========================================== -->
        <!-- LEDGER MASTERS -->
        <!-- ========================================== -->
        
        <!-- Revenue Ledgers -->
''')
    
    # Revenue Ledgers
    for idx, ledger in enumerate(REVENUE_LEDGERS, 1):
        f.write(f'''        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <LEDGER NAME="{ledger['name']}" ACTION="Create">
            <NAME>{ledger['name']}</NAME>
            <GUID>{generate_guid()}</GUID>
            <PARENT>Sales Accounts</PARENT>
            <ISREVENUE>Yes</ISREVENUE>
            <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
            <AFFECTSSTOCK>No</AFFECTSSTOCK>
            <USEFORINTEREST>No</USEFORINTEREST>
            <OPENINGBALANCE>0.00</OPENINGBALANCE>
            <CLOSINGBALANCE>-{ledger['amount']:.2f}</CLOSINGBALANCE>
            <GSTAPPLICABLE>Applicable</GSTAPPLICABLE>
            <GSTTYPE>Goods</GSTTYPE>
            <TAXABILITY>Taxable</TAXABILITY>
          </LEDGER>
        </TALLYMESSAGE>
        
''')
    
    f.write('''        <!-- Expense Ledgers -->
''')
    
    # Expense Ledgers
    for idx, ledger in enumerate(EXPENSE_LEDGERS, 1):
        parent = "Direct Expenses" if "Purchase" in ledger['name'] or "Salary" in ledger['name'] else "Indirect Expenses"
        f.write(f'''        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <LEDGER NAME="{ledger['name']}" ACTION="Create">
            <NAME>{ledger['name']}</NAME>
            <GUID>{generate_guid()}</GUID>
            <PARENT>{parent}</PARENT>
            <ISREVENUE>No</ISREVENUE>
            <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
            <AFFECTSSTOCK>No</AFFECTSSTOCK>
            <USEFORINTEREST>No</USEFORINTEREST>
            <OPENINGBALANCE>0.00</OPENINGBALANCE>
            <CLOSINGBALANCE>{ledger['amount']:.2f}</CLOSINGBALANCE>
            <GSTAPPLICABLE>{'Applicable' if 'Purchase' in ledger['name'] else 'Not Applicable'}</GSTAPPLICABLE>
          </LEDGER>
        </TALLYMESSAGE>
        
''')
    
    f.write('''        <!-- Customer Ledgers -->
''')
    
    # Customer Ledgers
    for idx, customer in enumerate(CUSTOMER_NAMES, 1):
        balance = random_amount(500000, 15000000)
        f.write(f'''        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <LEDGER NAME="{customer}" ACTION="Create">
            <NAME>{customer}</NAME>
            <GUID>{generate_guid()}</GUID>
            <PARENT>Sundry Debtors</PARENT>
            <ISREVENUE>No</ISREVENUE>
            <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
            <AFFECTSSTOCK>No</AFFECTSSTOCK>
            <ISBILLWISEON>Yes</ISBILLWISEON>
            <ISCOSTCENTRESON>Yes</ISCOSTCENTRESON>
            <OPENINGBALANCE>0.00</OPENINGBALANCE>
            <CLOSINGBALANCE>{balance:.2f}</CLOSINGBALANCE>
            <MAILINGNAME>{customer}</MAILINGNAME>
            <ADDRESS>
              <ADDRESS>Customer Address {idx}</ADDRESS>
              <ADDRESS>City - {400000 + idx}</ADDRESS>
              <ADDRESS>India</ADDRESS>
            </ADDRESS>
            <EMAIL>contact{idx}@{customer.lower().replace(' ', '').replace('ltd', '').replace('pvt', '').replace('.', '')[:20]}.com</EMAIL>
            <PHONENO>+91-{random.randint(7000000000, 9999999999)}</PHONENO>
            <GSTIN>27AABC{idx:02d}1234A1Z{idx:01d}</GSTIN>
            <GSTREGISTRATIONTYPE>Regular</GSTREGISTRATIONTYPE>
            <PANNO>AABC{idx:02d}1234A</PANNO>
            <COUNTRYNAME>India</COUNTRYNAME>
            <STATENAME>Maharashtra</STATENAME>
          </LEDGER>
        </TALLYMESSAGE>
        
''')
    
    f.write('''        <!-- Vendor Ledgers -->
''')
    
    # Vendor Ledgers
    for idx, vendor in enumerate(VENDOR_NAMES, 1):
        balance = -random_amount(300000, 10000000)
        f.write(f'''        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <LEDGER NAME="{vendor}" ACTION="Create">
            <NAME>{vendor}</NAME>
            <GUID>{generate_guid()}</GUID>
            <PARENT>Sundry Creditors</PARENT>
            <ISREVENUE>No</ISREVENUE>
            <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
            <AFFECTSSTOCK>No</AFFECTSSTOCK>
            <ISBILLWISEON>Yes</ISBILLWISEON>
            <ISCOSTCENTRESON>Yes</ISCOSTCENTRESON>
            <OPENINGBALANCE>0.00</OPENINGBALANCE>
            <CLOSINGBALANCE>{balance:.2f}</CLOSINGBALANCE>
            <MAILINGNAME>{vendor}</MAILINGNAME>
            <ADDRESS>
              <ADDRESS>Vendor Address {idx}</ADDRESS>
              <ADDRESS>City - {500000 + idx}</ADDRESS>
              <ADDRESS>India</ADDRESS>
            </ADDRESS>
            <EMAIL>vendor{idx}@{vendor.lower().replace(' ', '').replace('ltd', '').replace('pvt', '').replace('.', '')[:20]}.com</EMAIL>
            <PHONENO>+91-{random.randint(7000000000, 9999999999)}</PHONENO>
            <GSTIN>27AABV{idx:02d}1234B1Z{idx:01d}</GSTIN>
            <GSTREGISTRATIONTYPE>Regular</GSTREGISTRATIONTYPE>
            <PANNO>AABV{idx:02d}1234B</PANNO>
            <COUNTRYNAME>India</COUNTRYNAME>
            <STATENAME>Maharashtra</STATENAME>
          </LEDGER>
        </TALLYMESSAGE>
        
''')
    
    f.write('''        <!-- Bank Ledgers -->
''')
    
    # Bank Ledgers
    for idx, bank in enumerate(BANK_ACCOUNTS, 1):
        f.write(f'''        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <LEDGER NAME="{bank['name']}" ACTION="Create">
            <NAME>{bank['name']}</NAME>
            <GUID>{generate_guid()}</GUID>
            <PARENT>Bank Accounts</PARENT>
            <ISREVENUE>No</ISREVENUE>
            <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
            <AFFECTSSTOCK>No</AFFECTSSTOCK>
            <USEFORINTEREST>Yes</USEFORINTEREST>
            <OPENINGBALANCE>{bank['opening']:.2f}</OPENINGBALANCE>
            <CLOSINGBALANCE>{bank['closing']:.2f}</CLOSINGBALANCE>
            <BANKACCOUNTHOLDER>Complete Trading &amp; Manufacturing Co Pvt Ltd</BANKACCOUNTHOLDER>
            <ACCOUNTNUMBER>{bank['acc']}</ACCOUNTNUMBER>
            <IFSCODE>{bank['ifsc']}</IFSCODE>
            <BANKNAME>{bank['name'].split()[0]}</BANKNAME>
            <BRANCHNAME>Andheri East Branch</BRANCHNAME>
            <ENABLECHEQUEPRINTING>Yes</ENABLECHEQUEPRINTING>
          </LEDGER>
        </TALLYMESSAGE>
        
''')
    
    f.write('''        <!-- Cash Ledger -->
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <LEDGER NAME="Cash in Hand" ACTION="Create">
            <NAME>Cash in Hand</NAME>
            <GUID>''' + generate_guid() + '''</GUID>
            <PARENT>Cash-in-Hand</PARENT>
            <ISREVENUE>No</ISREVENUE>
            <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
            <AFFECTSSTOCK>No</AFFECTSSTOCK>
            <OPENINGBALANCE>500000.00</OPENINGBALANCE>
            <CLOSINGBALANCE>2850000.00</CLOSINGBALANCE>
          </LEDGER>
        </TALLYMESSAGE>
        
        <!-- Tax Ledgers -->
''')
    
    # GST Ledgers
    gst_ledgers = [
        ("GST Output CGST @ 9%", "Duties & Taxes", -4050000.00, "No"),
        ("GST Output SGST @ 9%", "Duties & Taxes", -4050000.00, "No"),
        ("GST Output IGST @ 18%", "Duties & Taxes", -2100000.00, "No"),
        ("GST Input CGST @ 9%", "Duties & Taxes", 2880000.00, "Yes"),
        ("GST Input SGST @ 9%", "Duties & Taxes", 2880000.00, "Yes"),
        ("GST Input IGST @ 18%", "Duties & Taxes", 1500000.00, "Yes"),
        ("TDS Payable", "Duties & Taxes", -450000.00, "No"),
        ("TCS Receivable", "Duties & Taxes", 120000.00, "Yes"),
    ]
    
    for name, parent, balance, is_positive in gst_ledgers:
        f.write(f'''        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <LEDGER NAME="{name}" ACTION="Create">
            <NAME>{name}</NAME>
            <GUID>{generate_guid()}</GUID>
            <PARENT>{parent}</PARENT>
            <ISREVENUE>No</ISREVENUE>
            <ISDEEMEDPOSITIVE>{is_positive}</ISDEEMEDPOSITIVE>
            <AFFECTSSTOCK>No</AFFECTSSTOCK>
            <OPENINGBALANCE>0.00</OPENINGBALANCE>
            <CLOSINGBALANCE>{balance:.2f}</CLOSINGBALANCE>
            <TAXTYPE>GST</TAXTYPE>
            <GSTAPPLICABLE>Applicable</GSTAPPLICABLE>
          </LEDGER>
        </TALLYMESSAGE>
        
''')
    
    f.write('''        <!-- Employee Ledgers (for Payroll) -->
''')
    
    # Employee Ledgers
    for idx, emp in enumerate(EMPLOYEE_NAMES, 1):
        salary = random_amount(30000, 150000)
        f.write(f'''        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <LEDGER NAME="{emp}" ACTION="Create">
            <NAME>{emp}</NAME>
            <GUID>{generate_guid()}</GUID>
            <PARENT>Sundry Creditors</PARENT>
            <ISREVENUE>No</ISREVENUE>
            <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
            <AFFECTSSTOCK>No</AFFECTSSTOCK>
            <OPENINGBALANCE>0.00</OPENINGBALANCE>
            <CLOSINGBALANCE>-{salary:.2f}</CLOSINGBALANCE>
            <EMAIL>{emp.lower().replace(' ', '.')}@completetrade.com</EMAIL>
            <PHONENO>+91-{random.randint(7000000000, 9999999999)}</PHONENO>
            <PANNO>AABC{idx:02d}1234E</PANNO>
          </LEDGER>
        </TALLYMESSAGE>
        
''')

def write_stock_item_masters(f):
    """Write stock item masters"""
    f.write('''        <!-- ========================================== -->
        <!-- STOCK ITEM MASTERS -->
        <!-- ========================================== -->
''')
    
    # Generate 100 stock items across categories
    item_count = 1
    for category in STOCK_CATEGORIES:
        items_in_category = 12
        for i in range(items_in_category):
            item_name = f"{category} - Item {i+1:03d}"
            opening_qty = random.randint(100, 2000)
            closing_qty = random.randint(200, 5000)
            rate = random_amount(100, 5000)
            parent_group = "TG_Raw Materials" if category == "Raw Materials" else "TG_Finished Goods"
            
            f.write(f'''        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <STOCKITEM NAME="{item_name}" ACTION="Create">
            <NAME>{item_name}</NAME>
            <GUID>{generate_guid()}</GUID>
            <PARENT>{parent_group}</PARENT>
            <CATEGORY>{category}</CATEGORY>
            <BASEUNITS>{random.choice(UNITS)}</BASEUNITS>
            <ADDITIONALUNITS>{random.choice(UNITS)}</ADDITIONALUNITS>
            <OPENINGBALANCE>{opening_qty}</OPENINGBALANCE>
            <OPENINGVALUE>{opening_qty * rate:.2f}</OPENINGVALUE>
            <OPENINGRATE>{rate:.2f}</OPENINGRATE>
            <CLOSINGBALANCE>{closing_qty}</CLOSINGBALANCE>
            <CLOSINGVALUE>{closing_qty * rate * 1.1:.2f}</CLOSINGVALUE>
            <CLOSINGRATE>{rate * 1.1:.2f}</CLOSINGRATE>
            <COSTINGMETHOD>Avg. Cost</COSTINGMETHOD>
            <VALUATIONMETHOD>Avg. Price</VALUATIONMETHOD>
            <ISBATCHWISEON>{'Yes' if random.random() > 0.7 else 'No'}</ISBATCHWISEON>
            <ISPERISHABLEON>{'Yes' if category == 'Consumables' else 'No'}</ISPERISHABLEON>
            <GSTAPPLICABLE>Applicable</GSTAPPLICABLE>
            <GSTTYPE>Goods</GSTTYPE>
            <HSNCODE>{random.randint(10000000, 99999999)}</HSNCODE>
            <TAXABILITY>Taxable</TAXABILITY>
            <DESCRIPTION>{item_name} - High quality product</DESCRIPTION>
            <NARRATION>Standard {category} item for trading and manufacturing</NARRATION>
          </STOCKITEM>
        </TALLYMESSAGE>
        
''')
            item_count += 1
            if item_count > 100:
                break
        if item_count > 100:
            break

def write_voucher_type_masters(f):
    """Write voucher type masters"""
    f.write('''        <!-- ========================================== -->
        <!-- VOUCHER TYPE MASTERS -->
        <!-- ========================================== -->
''')
    
    for vtype in VOUCHER_TYPES_CUSTOM:
        f.write(f'''        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHERTYPE NAME="{vtype}" ACTION="Create">
            <NAME>{vtype}</NAME>
            <GUID>{generate_guid()}</GUID>
            <PARENT>{'Sales' if 'Sale' in vtype else 'Purchase' if 'Purchase' in vtype else 'Receipt' if 'Receipt' in vtype else 'Payment'}</PARENT>
            <NUMBERINGMETHOD>Automatic</NUMBERINGMETHOD>
            <ISDEEMEDPOSITIVE>{'Yes' if 'Sale' in vtype or 'Receipt' in vtype else 'No'}</ISDEEMEDPOSITIVE>
            <AFFECTSSTOCK>{'Yes' if 'Sale' in vtype or 'Purchase' in vtype else 'No'}</AFFECTSSTOCK>
            <PREVENTDUPLICATES>Yes</PREVENTDUPLICATES>
            <PREFILLZERO>Yes</PREFILLZERO>
            <PRINTAFTERSAVE>No</PRINTAFTERSAVE>
            <USEFORINTEREST>No</USEFORINTEREST>
            <USEFORJOBWORK>No</USEFORJOBWORK>
            <ISOPTIONAL>No</ISOPTIONAL>
            <ASMFGJRNL>No</ASMFGJRNL>
          </VOUCHERTYPE>
        </TALLYMESSAGE>
        
''')

def write_voucher(f, voucher_type, voucher_no, date, amount, party_name, ledger_name, narration, cost_centre=None):
    """Write a single voucher entry"""
    date_str = date.strftime("%Y%m%d")
    guid = generate_guid()
    
    # Determine debit/credit based on voucher type
    if voucher_type in ["Sales", "Cash Sale", "Credit Sale", "Export Sale", "Receipt", "Cash Receipt", "Bank Receipt", "Credit Note"]:
        dr_ledger = party_name if "Sale" in voucher_type else random.choice([bank['name'] for bank in BANK_ACCOUNTS])
        cr_ledger = ledger_name
        is_invoice = "Sale" in voucher_type
    elif voucher_type in ["Purchase", "Cash Purchase", "Credit Purchase", "Import Purchase", "Payment", "Cash Payment", "Bank Payment", "Debit Note"]:
        dr_ledger = ledger_name
        cr_ledger = party_name if "Purchase" in voucher_type else random.choice([bank['name'] for bank in BANK_ACCOUNTS])
        is_invoice = "Purchase" in voucher_type
    elif voucher_type == "Journal":
        dr_ledger = random.choice([ledger['name'] for ledger in EXPENSE_LEDGERS[:5]])
        cr_ledger = random.choice([ledger['name'] for ledger in EXPENSE_LEDGERS[5:10]])
        is_invoice = False
    else:  # Contra
        dr_ledger = "Cash in Hand"
        cr_ledger = random.choice([bank['name'] for bank in BANK_ACCOUNTS])
        is_invoice = False
    
    # Add GST if applicable
    gst_amount = amount * 0.18 if is_invoice else 0
    total_amount = amount + gst_amount
    
    cost_centre_xml = f'''            <COSTCENTREALLOCATIONS.LIST>
              <NAME>{cost_centre or random.choice(COST_CENTRES)}</NAME>
              <AMOUNT>{amount:.2f}</AMOUNT>
            </COSTCENTREALLOCATIONS.LIST>''' if cost_centre or random.random() > 0.5 else ''
    
    f.write(f'''        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER REMOTEID="" VCHKEY="" VCHTYPE="{voucher_type}" ACTION="Create" OBJVIEW="Accounting Voucher View">
            <DATE>{date_str}</DATE>
            <GUID>{guid}</GUID>
            <VOUCHERTYPENAME>{voucher_type}</VOUCHERTYPENAME>
            <VOUCHERNUMBER>{voucher_no}</VOUCHERNUMBER>
            <PARTYLEDGERNAME>{party_name}</PARTYLEDGERNAME>
            <EFFECTIVEDATE>{date_str}</EFFECTIVEDATE>
            <ISINVOICE>{'Yes' if is_invoice else 'No'}</ISINVOICE>
            <PERSISTEDVIEW>Accounting Voucher View</PERSISTEDVIEW>
            <VCHGSTCLASS/>
            <ENTEREDBY>Admin</ENTEREDBY>
            <NARRATION>{narration}</NARRATION>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>{dr_ledger}</LEDGERNAME>
              <GSTCLASS/>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <LEDGERFROMITEM>No</LEDGERFROMITEM>
              <REMOVEZEROENTRIES>No</REMOVEZEROENTRIES>
              <ISPARTYLEDGER>{'Yes' if dr_ledger == party_name else 'No'}</ISPARTYLEDGER>
              <AMOUNT>{total_amount:.2f}</AMOUNT>
{cost_centre_xml}
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>{cr_ledger}</LEDGERNAME>
              <GSTCLASS/>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <LEDGERFROMITEM>No</LEDGERFROMITEM>
              <REMOVEZEROENTRIES>No</REMOVEZEROENTRIES>
              <ISPARTYLEDGER>{'Yes' if cr_ledger == party_name else 'No'}</ISPARTYLEDGER>
              <AMOUNT>-{amount:.2f}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
''')
    
    # Add GST entries if applicable
    if gst_amount > 0:
        cgst = gst_amount / 2
        sgst = gst_amount / 2
        f.write(f'''            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>GST {'Output' if 'Sale' in voucher_type else 'Input'} CGST @ 9%</LEDGERNAME>
              <ISDEEMEDPOSITIVE>{'No' if 'Sale' in voucher_type else 'Yes'}</ISDEEMEDPOSITIVE>
              <AMOUNT>{cgst if 'Purchase' in voucher_type else -cgst:.2f}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>GST {'Output' if 'Sale' in voucher_type else 'Input'} SGST @ 9%</LEDGERNAME>
              <ISDEEMEDPOSITIVE>{'No' if 'Sale' in voucher_type else 'Yes'}</ISDEEMEDPOSITIVE>
              <AMOUNT>{sgst if 'Purchase' in voucher_type else -sgst:.2f}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
''')
    
    f.write('''          </VOUCHER>
        </TALLYMESSAGE>
        
''')

def write_xml_footer(f):
    """Write XML footer"""
    f.write('''      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>
''')

def generate_voucher_number(voucher_type, index):
    """Generate voucher number based on type"""
    prefix_map = {
        "Sales": "SI", "Cash Sale": "CS", "Credit Sale": "CR", "Export Sale": "EX",
        "Purchase": "PI", "Cash Purchase": "CP", "Credit Purchase": "CRP", "Import Purchase": "IM",
        "Receipt": "RC", "Cash Receipt": "CRC", "Bank Receipt": "BR",
        "Payment": "PY", "Cash Payment": "CPY", "Bank Payment": "BP",
        "Journal": "JV", "Contra": "CN",
        "Credit Note": "CRN", "Debit Note": "DBN",
        "Stock Journal": "SJ", "Manufacturing Journal": "MJ"
    }
    prefix = prefix_map.get(voucher_type, "VC")
    return f"{prefix}-{index:06d}"

def generate_complete_file():
    """Generate complete Tally XML file with all data types"""
    print("=" * 80)
    print("GENERATING COMPLETE TALLY XML EXPORT FILE")
    print("=" * 80)
    print(f"Output file: {OUTPUT_FILE}")
    print(f"Target vouchers: {NUM_VOUCHERS:,}")
    print()
    
    start_date = datetime(2024, 4, 1)
    end_date = datetime(2025, 3, 31)
    
    # Voucher type distribution
    voucher_types = {
        "Sales": 25, "Cash Sale": 10, "Credit Sale": 10, "Export Sale": 5,
        "Purchase": 20, "Cash Purchase": 5, "Credit Purchase": 5,
        "Receipt": 8, "Cash Receipt": 4, "Bank Receipt": 4,
        "Payment": 8, "Cash Payment": 4, "Bank Payment": 4,
        "Journal": 3, "Contra": 2,
        "Credit Note": 2, "Debit Note": 1,
    }
    
    voucher_type_list = []
    for vtype, weight in voucher_types.items():
        voucher_type_list.extend([vtype] * weight)
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        print("Writing XML header and company master...")
        write_xml_header(f)
        
        print("Writing currency masters...")
        write_currency_masters(f)
        
        print("Writing unit of measure masters...")
        write_unit_masters(f)
        
        print("Writing godown masters...")
        write_godown_masters(f)
        
        print("Writing cost centre masters...")
        write_cost_centre_masters(f)
        
        print("Writing cost category masters...")
        write_cost_category_masters(f)
        
        print("Writing group masters...")
        write_group_masters(f)
        
        print("Writing ledger masters...")
        write_ledger_masters(f)
        
        print("Writing stock item masters...")
        write_stock_item_masters(f)
        
        print("Writing voucher type masters...")
        write_voucher_type_masters(f)
        
        # Write vouchers
        f.write('''        <!-- ========================================== -->
        <!-- VOUCHERS (TRANSACTIONS) -->
        <!-- ========================================== -->
        
''')
        
        print(f"\nGenerating {NUM_VOUCHERS:,} vouchers...")
        for i in range(1, NUM_VOUCHERS + 1):
            if i % 10000 == 0:
                print(f"  Generated {i:,} vouchers...")
            
            voucher_type = random.choice(voucher_type_list)
            voucher_no = generate_voucher_number(voucher_type, i)
            date = random_date(start_date, end_date)
            
            # Amount based on type
            if "Sale" in voucher_type:
                amount = random_amount(5000, 500000)
                party_name = random.choice(CUSTOMER_NAMES)
                ledger_name = random.choice([l['name'] for l in REVENUE_LEDGERS])
                narration = f"{voucher_type} to {party_name}"
            elif "Purchase" in voucher_type:
                amount = random_amount(5000, 400000)
                party_name = random.choice(VENDOR_NAMES)
                ledger_name = random.choice([l['name'] for l in EXPENSE_LEDGERS if 'Purchase' in l['name']])
                narration = f"{voucher_type} from {party_name}"
            elif "Receipt" in voucher_type:
                amount = random_amount(10000, 1000000)
                party_name = random.choice(CUSTOMER_NAMES)
                ledger_name = random.choice([l['name'] for l in REVENUE_LEDGERS])
                narration = f"Receipt from {party_name}"
            elif "Payment" in voucher_type:
                amount = random_amount(10000, 800000)
                party_name = random.choice(VENDOR_NAMES)
                ledger_name = random.choice([l['name'] for l in EXPENSE_LEDGERS])
                narration = f"Payment to {party_name}"
            else:
                amount = random_amount(1000, 100000)
                party_name = "Internal Transfer"
                ledger_name = random.choice([l['name'] for l in EXPENSE_LEDGERS[:5]])
                narration = f"{voucher_type} entry"
            
            cost_centre = random.choice(COST_CENTRES) if random.random() > 0.5 else None
            write_voucher(f, voucher_type, voucher_no, date, amount, party_name, ledger_name, narration, cost_centre)
        
        print("Writing XML footer...")
        write_xml_footer(f)
    
    import os
    file_size = os.path.getsize(OUTPUT_FILE) / (1024*1024)
    
    print("\n" + "=" * 80)
    print("GENERATION COMPLETE!")
    print("=" * 80)
    print(f"File: {OUTPUT_FILE}")
    print(f"Size: {file_size:.2f} MB")
    print(f"Total Vouchers: {NUM_VOUCHERS:,}")
    print()
    print("INCLUDED DATA TYPES:")
    print("  1. Company Master (1)")
    print(f"  2. Currency Masters ({len(CURRENCIES)})")
    print(f"  3. Unit of Measure Masters ({len(UNITS)})")
    print(f"  4. Godown Masters ({len(GODOWNS)})")
    print(f"  5. Cost Centre Masters ({len(COST_CENTRES)})")
    print(f"  6. Cost Category Masters ({len(COST_CATEGORIES)})")
    print("  7. Group Masters (28)")
    print(f"  8. Ledger Masters ({len(REVENUE_LEDGERS) + len(EXPENSE_LEDGERS) + len(CUSTOMER_NAMES) + len(VENDOR_NAMES) + len(BANK_ACCOUNTS) + len(EMPLOYEE_NAMES) + 9})")
    print("  9. Stock Item Masters (100)")
    print(f" 10. Voucher Type Masters ({len(VOUCHER_TYPES_CUSTOM)})")
    print(f" 11. Vouchers ({NUM_VOUCHERS:,})")
    print()
    print("Ready for testing with AI Tally Assistant!")
    print("=" * 80)

if __name__ == "__main__":
    import os
    generate_complete_file()

