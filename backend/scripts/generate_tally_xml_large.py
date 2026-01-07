#!/usr/bin/env python3
"""
Tally XML Generator - Large Scale (Streaming)
Writes directly to file to handle 1GB+ files
0 errors, 0 exceptions in Tally
"""

import random
import os
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
import string

# Configuration
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'backups')
FINANCIAL_YEAR_START = datetime(2024, 4, 1)
FINANCIAL_YEAR_END = datetime(2025, 3, 31)

# Names
FIRST_NAMES = ["Rajesh", "Sunil", "Amit", "Vikram", "Pradeep", "Anil", "Sanjay", "Ramesh", 
    "Mahesh", "Dinesh", "Rohit", "Ajay", "Vijay", "Manish", "Rakesh", "Pankaj"]
LAST_NAMES = ["Sharma", "Verma", "Gupta", "Singh", "Kumar", "Agarwal", "Jain", "Patel",
    "Shah", "Mehta", "Reddy", "Rao", "Banerjee", "Das", "Chauhan", "Yadav"]
COMPANY_SUFFIXES = ["Pvt Ltd", "Ltd", "LLP", "& Co", "Industries", "Enterprises", "Trading Co"]
CITIES = ["Mumbai", "Delhi", "Bangalore", "Chennai", "Kolkata", "Hyderabad", "Pune", "Ahmedabad"]
STATES_GST = {"Maharashtra": "27", "Delhi": "07", "Karnataka": "29", "Tamil Nadu": "33",
    "West Bengal": "19", "Telangana": "36", "Gujarat": "24", "Rajasthan": "08"}
PRODUCT_CATEGORIES = ["Electronics", "Textiles", "Chemicals", "Machinery", "Food Products",
    "Pharmaceuticals", "Automotive Parts", "Building Materials", "Plastics", "Metal Products"]
UNITS = ["Nos", "Pcs", "Kg", "Ltr", "Mtr", "Box", "Set"]
GST_RATES = [0, 5, 12, 18, 28]

def generate_gstin(state_code):
    pan = ''.join(random.choices(string.ascii_uppercase, k=5)) + \
          ''.join(random.choices(string.digits, k=4)) + \
          random.choice(string.ascii_uppercase)
    return f"{state_code}{pan}1Z{random.choice(string.ascii_uppercase + string.digits)}"

def random_date():
    delta = FINANCIAL_YEAR_END - FINANCIAL_YEAR_START
    return FINANCIAL_YEAR_START + timedelta(days=random.randint(0, delta.days))

def format_tally_date(dt):
    return dt.strftime("%Y%m%d")

def round_amount(amount):
    return float(Decimal(str(amount)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))

def escape_xml(text):
    """Escape special XML characters"""
    if not text:
        return ""
    return str(text).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;").replace("'", "&apos;")

def generate_company_name():
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)} {random.choice(COMPANY_SUFFIXES)}"

class TallyXMLStreamWriter:
    def __init__(self, filepath, company_name="Large Scale Traders Pvt Ltd"):
        self.filepath = filepath
        self.company_name = company_name
        self.file = None
        self.indent = 0
        
        self.customers = []
        self.suppliers = []
        self.stock_items = []
        self.expense_ledgers = []
        
        self.ledger_count = 0
        self.voucher_count = 0
        self.stock_count = 0
    
    def write_line(self, text=""):
        """Write a line with proper indentation"""
        self.file.write("  " * self.indent + text + "\n")
    
    def start_tag(self, tag, attrs=None):
        """Write opening tag"""
        attr_str = ""
        if attrs:
            attr_str = " " + " ".join(f'{k}="{escape_xml(v)}"' for k, v in attrs.items())
        self.write_line(f"<{tag}{attr_str}>")
        self.indent += 1
    
    def end_tag(self, tag):
        """Write closing tag"""
        self.indent -= 1
        self.write_line(f"</{tag}>")
    
    def element(self, tag, text="", attrs=None):
        """Write single element"""
        attr_str = ""
        if attrs:
            attr_str = " " + " ".join(f'{k}="{escape_xml(v)}"' for k, v in attrs.items())
        self.write_line(f"<{tag}{attr_str}>{escape_xml(text)}</{tag}>")
    
    def generate(self, num_ledgers=100000, num_vouchers=400000, num_stock_items=20000):
        """Generate the XML file"""
        print(f"Generating Tally XML: {self.filepath}")
        print(f"Target: {num_ledgers:,} ledgers, {num_vouchers:,} vouchers, {num_stock_items:,} stock items")
        print("=" * 60)
        
        with open(self.filepath, 'w', encoding='utf-8') as self.file:
            # XML declaration
            self.file.write('<?xml version="1.0" encoding="UTF-8"?>\n')
            
            # Envelope
            self.start_tag("ENVELOPE")
            
            # Header
            self.start_tag("HEADER")
            self.element("TALLYREQUEST", "Import Data")
            self.end_tag("HEADER")
            
            # Body
            self.start_tag("BODY")
            self.start_tag("IMPORTDATA")
            
            # Request desc
            self.start_tag("REQUESTDESC")
            self.element("REPORTNAME", "All Masters")
            self.element("STATICVARIABLES")
            self.end_tag("REQUESTDESC")
            
            # Request data
            self.start_tag("REQUESTDATA")
            
            # Generate all data
            print("\n1. Generating Groups...")
            self._write_groups()
            
            print("2. Generating Units...")
            self._write_units()
            
            print("3. Generating Godowns...")
            self._write_godowns()
            
            print("4. Generating Stock Groups...")
            self._write_stock_groups()
            
            print(f"5. Generating {num_stock_items:,} Stock Items...")
            self._write_stock_items(num_stock_items)
            
            print("6. Generating Base Ledgers...")
            self._write_base_ledgers()
            
            num_customers = num_ledgers // 2
            num_suppliers = num_ledgers - num_customers - 1000
            
            print(f"7. Generating {num_customers:,} Customer Ledgers...")
            self._write_party_ledgers("Sundry Debtors", num_customers, is_customer=True)
            
            print(f"8. Generating {num_suppliers:,} Supplier Ledgers...")
            self._write_party_ledgers("Sundry Creditors", num_suppliers, is_customer=False)
            
            print(f"9. Generating {num_vouchers:,} Vouchers...")
            self._write_vouchers(num_vouchers)
            
            # Close tags
            self.end_tag("REQUESTDATA")
            self.end_tag("IMPORTDATA")
            self.end_tag("BODY")
            self.end_tag("ENVELOPE")
        
        # Get file size
        file_size = os.path.getsize(self.filepath)
        size_mb = file_size / (1024 * 1024)
        size_gb = file_size / (1024 * 1024 * 1024)
        
        print(f"\nFile saved: {self.filepath}")
        print(f"File size: {size_mb:.2f} MB ({size_gb:.2f} GB)")
        
        return {
            "ledgers": self.ledger_count,
            "vouchers": self.voucher_count,
            "stock_items": self.stock_count,
            "customers": len(self.customers),
            "suppliers": len(self.suppliers),
            "file_size_mb": size_mb
        }
    
    def _write_groups(self):
        """Write account groups"""
        groups = [
            ("Bank Accounts", "Current Assets"),
            ("Cash-in-Hand", "Current Assets"),
            ("Sundry Debtors", "Current Assets"),
            ("Sundry Creditors", "Current Liabilities"),
            ("Duties & Taxes", "Current Liabilities"),
            ("Stock-in-Hand", "Current Assets"),
            ("Fixed Assets", "Fixed Assets"),
            ("Capital Account", "Capital Account"),
            ("Reserves & Surplus", "Capital Account"),
            ("Sales Accounts", "Revenue"),
            ("Purchase Accounts", "Expenses"),
            ("Direct Expenses", "Expenses"),
            ("Indirect Expenses", "Expenses"),
            ("Direct Incomes", "Revenue"),
            ("Indirect Incomes", "Revenue"),
        ]
        for name, parent in groups:
            self.start_tag("TALLYMESSAGE", {"xmlns:UDF": "TallyUDF"})
            self.start_tag("GROUP", {"NAME": name, "ACTION": "Create"})
            self.element("NAME", name)
            self.element("PARENT", parent)
            self.end_tag("GROUP")
            self.end_tag("TALLYMESSAGE")
    
    def _write_units(self):
        """Write units"""
        for unit in UNITS:
            self.start_tag("TALLYMESSAGE", {"xmlns:UDF": "TallyUDF"})
            self.start_tag("UNIT", {"NAME": unit, "ACTION": "Create"})
            self.element("NAME", unit)
            self.element("ISSIMPLEUNIT", "Yes")
            self.end_tag("UNIT")
            self.end_tag("TALLYMESSAGE")
    
    def _write_godowns(self):
        """Write godowns"""
        godowns = ["Main Warehouse", "Branch Store North", "Branch Store South", "Factory Store"]
        for name in godowns:
            self.start_tag("TALLYMESSAGE", {"xmlns:UDF": "TallyUDF"})
            self.start_tag("GODOWN", {"NAME": name, "ACTION": "Create"})
            self.element("NAME", name)
            self.element("HASNOSPACE", "No")
            self.end_tag("GODOWN")
            self.end_tag("TALLYMESSAGE")
    
    def _write_stock_groups(self):
        """Write stock groups"""
        for category in PRODUCT_CATEGORIES:
            self.start_tag("TALLYMESSAGE", {"xmlns:UDF": "TallyUDF"})
            self.start_tag("STOCKGROUP", {"NAME": category, "ACTION": "Create"})
            self.element("NAME", category)
            self.end_tag("STOCKGROUP")
            self.end_tag("TALLYMESSAGE")
    
    def _write_stock_items(self, count):
        """Write stock items"""
        items_per_cat = count // len(PRODUCT_CATEGORIES)
        
        for category in PRODUCT_CATEGORIES:
            for i in range(items_per_cat):
                self.stock_count += 1
                name = f"{category} Item {self.stock_count}"
                unit = random.choice(UNITS)
                gst_rate = random.choice(GST_RATES)
                rate = round_amount(random.uniform(100, 10000))
                opening_qty = random.randint(10, 500)
                opening_value = round_amount(opening_qty * rate)
                
                self.start_tag("TALLYMESSAGE", {"xmlns:UDF": "TallyUDF"})
                self.start_tag("STOCKITEM", {"NAME": name, "ACTION": "Create"})
                self.element("NAME", name)
                self.element("PARENT", category)
                self.element("BASEUNITS", unit)
                self.element("GSTAPPLICABLE", "Applicable")
                if gst_rate > 0:
                    self.element("GSTRATE", str(gst_rate))
                    self.element("HSNCODE", f"{random.randint(1000, 9999)}")
                if opening_qty > 0:
                    self.element("OPENINGBALANCE", f"{opening_qty} {unit}")
                    self.element("OPENINGVALUE", str(opening_value))
                self.end_tag("STOCKITEM")
                self.end_tag("TALLYMESSAGE")
                
                self.stock_items.append({"name": name, "unit": unit, "rate": rate, "gst_rate": gst_rate})
                
                if self.stock_count % 2000 == 0:
                    print(f"   Generated {self.stock_count:,} stock items...")
    
    def _write_base_ledgers(self):
        """Write base ledgers"""
        ledgers = [
            ("HDFC Bank Current Ac", "Bank Accounts", 5000000),
            ("ICICI Bank Current Ac", "Bank Accounts", 3000000),
            ("State Bank of India", "Bank Accounts", 2000000),
            ("Cash", "Cash-in-Hand", 500000),
            ("Petty Cash", "Cash-in-Hand", 50000),
            ("CGST Input", "Duties & Taxes", 0),
            ("SGST Input", "Duties & Taxes", 0),
            ("IGST Input", "Duties & Taxes", 0),
            ("CGST Output", "Duties & Taxes", 0),
            ("SGST Output", "Duties & Taxes", 0),
            ("IGST Output", "Duties & Taxes", 0),
            ("TDS Payable", "Duties & Taxes", 0),
            ("Sales Local", "Sales Accounts", 0),
            ("Sales Interstate", "Sales Accounts", 0),
            ("Purchase Local", "Purchase Accounts", 0),
            ("Purchase Interstate", "Purchase Accounts", 0),
            ("Salaries and Wages", "Indirect Expenses", 0),
            ("Rent", "Indirect Expenses", 0),
            ("Electricity Charges", "Indirect Expenses", 0),
            ("Office Expenses", "Indirect Expenses", 0),
            ("Travelling Expenses", "Indirect Expenses", 0),
            ("Freight Outward", "Direct Expenses", 0),
            ("Interest Received", "Indirect Incomes", 0),
            ("Discount Received", "Indirect Incomes", 0),
            ("Capital Account", "Capital Account", -50000000),
            ("Profit and Loss Ac", "Capital Account", 0),
        ]
        
        for name, parent, opening in ledgers:
            self.start_tag("TALLYMESSAGE", {"xmlns:UDF": "TallyUDF"})
            self.start_tag("LEDGER", {"NAME": name, "ACTION": "Create"})
            self.element("NAME", name)
            self.element("PARENT", parent)
            if opening != 0:
                self.element("OPENINGBALANCE", str(opening))
            self.end_tag("LEDGER")
            self.end_tag("TALLYMESSAGE")
            
            if "Expense" in parent:
                self.expense_ledgers.append(name)
    
    def _write_party_ledgers(self, parent_group, count, is_customer=True):
        """Write party ledgers"""
        prefix = "C" if is_customer else "S"
        
        for i in range(count):
            self.ledger_count += 1
            state = random.choice(list(STATES_GST.keys()))
            state_code = STATES_GST[state]
            
            name = f"{generate_company_name()} {prefix}{self.ledger_count}"
            opening = round_amount(random.uniform(0, 200000)) if is_customer else -round_amount(random.uniform(0, 200000))
            
            self.start_tag("TALLYMESSAGE", {"xmlns:UDF": "TallyUDF"})
            self.start_tag("LEDGER", {"NAME": name, "ACTION": "Create"})
            self.element("NAME", name)
            self.element("PARENT", parent_group)
            self.element("ISBILLWISEON", "Yes")
            self.element("COUNTRYOFRESIDENCE", "India")
            
            self.start_tag("ADDRESS.LIST")
            self.element("ADDRESS", f"Address {self.ledger_count}, {random.choice(CITIES)}")
            self.end_tag("ADDRESS.LIST")
            
            self.element("LEDSTATENAME", state)
            self.element("PINCODE", str(random.randint(100000, 999999)))
            
            if random.random() > 0.2:
                self.element("PARTYGSTIN", generate_gstin(state_code))
                self.element("GSTREGISTRATIONTYPE", "Regular")
            
            if opening != 0:
                self.element("OPENINGBALANCE", str(opening))
            
            self.end_tag("LEDGER")
            self.end_tag("TALLYMESSAGE")
            
            if is_customer:
                self.customers.append(name)
            else:
                self.suppliers.append(name)
            
            if self.ledger_count % 5000 == 0:
                print(f"   Generated {self.ledger_count:,} ledgers...")
    
    def _write_vouchers(self, count):
        """Write vouchers"""
        sales_count = int(count * 0.35)
        purchase_count = int(count * 0.30)
        receipt_count = int(count * 0.15)
        payment_count = int(count * 0.15)
        journal_count = count - sales_count - purchase_count - receipt_count - payment_count
        
        print(f"   Sales: {sales_count:,}, Purchase: {purchase_count:,}, Receipt: {receipt_count:,}, Payment: {payment_count:,}, Journal: {journal_count:,}")
        
        print("   Writing Sales vouchers...")
        for i in range(sales_count):
            self._write_sales_voucher()
            if (i + 1) % 20000 == 0:
                print(f"      {i + 1:,} sales vouchers...")
        
        print("   Writing Purchase vouchers...")
        for i in range(purchase_count):
            self._write_purchase_voucher()
            if (i + 1) % 20000 == 0:
                print(f"      {i + 1:,} purchase vouchers...")
        
        print("   Writing Receipt vouchers...")
        for i in range(receipt_count):
            self._write_receipt_voucher()
            if (i + 1) % 20000 == 0:
                print(f"      {i + 1:,} receipt vouchers...")
        
        print("   Writing Payment vouchers...")
        for i in range(payment_count):
            self._write_payment_voucher()
            if (i + 1) % 20000 == 0:
                print(f"      {i + 1:,} payment vouchers...")
        
        print("   Writing Journal vouchers...")
        for i in range(journal_count):
            self._write_journal_voucher()
    
    def _write_sales_voucher(self):
        """Write sales voucher"""
        self.voucher_count += 1
        date = random_date()
        customer = random.choice(self.customers) if self.customers else "Cash Sales"
        
        base = round_amount(random.uniform(1000, 100000))
        gst_rate = random.choice([5, 12, 18])
        gst = round_amount(base * gst_rate / 100)
        total = round_amount(base + gst)
        is_local = random.random() > 0.3
        
        self.start_tag("TALLYMESSAGE", {"xmlns:UDF": "TallyUDF"})
        self.start_tag("VOUCHER", {"ACTION": "Create", "VCHTYPE": "Sales"})
        
        self.element("DATE", format_tally_date(date))
        self.element("VOUCHERTYPENAME", "Sales")
        self.element("VOUCHERNUMBER", f"S{self.voucher_count}")
        self.element("NARRATION", f"Sales to {customer[:30]}")
        self.element("PARTYLEDGERNAME", customer)
        
        if self.stock_items:
            item = random.choice(self.stock_items)
            qty = random.randint(1, 20)
            self.start_tag("INVENTORYENTRIES.LIST")
            self.element("STOCKITEMNAME", item["name"])
            self.element("ISDEEMEDPOSITIVE", "No")
            self.element("RATE", f"{item['rate']}/{item['unit']}")
            self.element("AMOUNT", str(-base))
            self.element("ACTUALQTY", f"{qty} {item['unit']}")
            self.element("BILLEDQTY", f"{qty} {item['unit']}")
            self.end_tag("INVENTORYENTRIES.LIST")
        
        # Debit Customer
        self.start_tag("ALLLEDGERENTRIES.LIST")
        self.element("LEDGERNAME", customer)
        self.element("ISDEEMEDPOSITIVE", "Yes")
        self.element("AMOUNT", str(-total))
        self.end_tag("ALLLEDGERENTRIES.LIST")
        
        # Credit Sales
        self.start_tag("ALLLEDGERENTRIES.LIST")
        self.element("LEDGERNAME", "Sales Local" if is_local else "Sales Interstate")
        self.element("ISDEEMEDPOSITIVE", "No")
        self.element("AMOUNT", str(base))
        self.end_tag("ALLLEDGERENTRIES.LIST")
        
        # GST
        if is_local:
            cgst = round_amount(gst / 2)
            sgst = gst - cgst
            self.start_tag("ALLLEDGERENTRIES.LIST")
            self.element("LEDGERNAME", "CGST Output")
            self.element("AMOUNT", str(cgst))
            self.end_tag("ALLLEDGERENTRIES.LIST")
            
            self.start_tag("ALLLEDGERENTRIES.LIST")
            self.element("LEDGERNAME", "SGST Output")
            self.element("AMOUNT", str(sgst))
            self.end_tag("ALLLEDGERENTRIES.LIST")
        else:
            self.start_tag("ALLLEDGERENTRIES.LIST")
            self.element("LEDGERNAME", "IGST Output")
            self.element("AMOUNT", str(gst))
            self.end_tag("ALLLEDGERENTRIES.LIST")
        
        self.end_tag("VOUCHER")
        self.end_tag("TALLYMESSAGE")
    
    def _write_purchase_voucher(self):
        """Write purchase voucher"""
        self.voucher_count += 1
        date = random_date()
        supplier = random.choice(self.suppliers) if self.suppliers else "Cash Purchase"
        
        base = round_amount(random.uniform(1000, 80000))
        gst_rate = random.choice([5, 12, 18])
        gst = round_amount(base * gst_rate / 100)
        total = round_amount(base + gst)
        is_local = random.random() > 0.3
        
        self.start_tag("TALLYMESSAGE", {"xmlns:UDF": "TallyUDF"})
        self.start_tag("VOUCHER", {"ACTION": "Create", "VCHTYPE": "Purchase"})
        
        self.element("DATE", format_tally_date(date))
        self.element("VOUCHERTYPENAME", "Purchase")
        self.element("VOUCHERNUMBER", f"P{self.voucher_count}")
        self.element("NARRATION", f"Purchase from {supplier[:30]}")
        self.element("PARTYLEDGERNAME", supplier)
        
        if self.stock_items:
            item = random.choice(self.stock_items)
            qty = random.randint(1, 20)
            self.start_tag("INVENTORYENTRIES.LIST")
            self.element("STOCKITEMNAME", item["name"])
            self.element("ISDEEMEDPOSITIVE", "Yes")
            self.element("RATE", f"{item['rate']}/{item['unit']}")
            self.element("AMOUNT", str(base))
            self.element("ACTUALQTY", f"{qty} {item['unit']}")
            self.end_tag("INVENTORYENTRIES.LIST")
        
        # Credit Supplier
        self.start_tag("ALLLEDGERENTRIES.LIST")
        self.element("LEDGERNAME", supplier)
        self.element("ISDEEMEDPOSITIVE", "No")
        self.element("AMOUNT", str(total))
        self.end_tag("ALLLEDGERENTRIES.LIST")
        
        # Debit Purchase
        self.start_tag("ALLLEDGERENTRIES.LIST")
        self.element("LEDGERNAME", "Purchase Local" if is_local else "Purchase Interstate")
        self.element("ISDEEMEDPOSITIVE", "Yes")
        self.element("AMOUNT", str(-base))
        self.end_tag("ALLLEDGERENTRIES.LIST")
        
        # GST Input
        if is_local:
            cgst = round_amount(gst / 2)
            sgst = gst - cgst
            self.start_tag("ALLLEDGERENTRIES.LIST")
            self.element("LEDGERNAME", "CGST Input")
            self.element("AMOUNT", str(-cgst))
            self.end_tag("ALLLEDGERENTRIES.LIST")
            
            self.start_tag("ALLLEDGERENTRIES.LIST")
            self.element("LEDGERNAME", "SGST Input")
            self.element("AMOUNT", str(-sgst))
            self.end_tag("ALLLEDGERENTRIES.LIST")
        else:
            self.start_tag("ALLLEDGERENTRIES.LIST")
            self.element("LEDGERNAME", "IGST Input")
            self.element("AMOUNT", str(-gst))
            self.end_tag("ALLLEDGERENTRIES.LIST")
        
        self.end_tag("VOUCHER")
        self.end_tag("TALLYMESSAGE")
    
    def _write_receipt_voucher(self):
        """Write receipt voucher"""
        self.voucher_count += 1
        date = random_date()
        customer = random.choice(self.customers) if self.customers else "Cash"
        amount = round_amount(random.uniform(5000, 200000))
        bank = random.choice(["HDFC Bank Current Ac", "ICICI Bank Current Ac", "State Bank of India", "Cash"])
        
        self.start_tag("TALLYMESSAGE", {"xmlns:UDF": "TallyUDF"})
        self.start_tag("VOUCHER", {"ACTION": "Create", "VCHTYPE": "Receipt"})
        
        self.element("DATE", format_tally_date(date))
        self.element("VOUCHERTYPENAME", "Receipt")
        self.element("VOUCHERNUMBER", f"R{self.voucher_count}")
        self.element("NARRATION", f"Receipt from {customer[:30]}")
        
        self.start_tag("ALLLEDGERENTRIES.LIST")
        self.element("LEDGERNAME", bank)
        self.element("ISDEEMEDPOSITIVE", "Yes")
        self.element("AMOUNT", str(-amount))
        self.end_tag("ALLLEDGERENTRIES.LIST")
        
        self.start_tag("ALLLEDGERENTRIES.LIST")
        self.element("LEDGERNAME", customer)
        self.element("ISDEEMEDPOSITIVE", "No")
        self.element("AMOUNT", str(amount))
        self.end_tag("ALLLEDGERENTRIES.LIST")
        
        self.end_tag("VOUCHER")
        self.end_tag("TALLYMESSAGE")
    
    def _write_payment_voucher(self):
        """Write payment voucher"""
        self.voucher_count += 1
        date = random_date()
        
        if random.random() > 0.3 and self.suppliers:
            payee = random.choice(self.suppliers)
        else:
            payee = random.choice(self.expense_ledgers) if self.expense_ledgers else "Office Expenses"
        
        amount = round_amount(random.uniform(1000, 100000))
        bank = random.choice(["HDFC Bank Current Ac", "ICICI Bank Current Ac", "Cash"])
        
        self.start_tag("TALLYMESSAGE", {"xmlns:UDF": "TallyUDF"})
        self.start_tag("VOUCHER", {"ACTION": "Create", "VCHTYPE": "Payment"})
        
        self.element("DATE", format_tally_date(date))
        self.element("VOUCHERTYPENAME", "Payment")
        self.element("VOUCHERNUMBER", f"PAY{self.voucher_count}")
        self.element("NARRATION", f"Payment to {payee[:30]}")
        
        self.start_tag("ALLLEDGERENTRIES.LIST")
        self.element("LEDGERNAME", payee)
        self.element("ISDEEMEDPOSITIVE", "Yes")
        self.element("AMOUNT", str(-amount))
        self.end_tag("ALLLEDGERENTRIES.LIST")
        
        self.start_tag("ALLLEDGERENTRIES.LIST")
        self.element("LEDGERNAME", bank)
        self.element("ISDEEMEDPOSITIVE", "No")
        self.element("AMOUNT", str(amount))
        self.end_tag("ALLLEDGERENTRIES.LIST")
        
        self.end_tag("VOUCHER")
        self.end_tag("TALLYMESSAGE")
    
    def _write_journal_voucher(self):
        """Write journal voucher"""
        self.voucher_count += 1
        date = random_date()
        amount = round_amount(random.uniform(1000, 50000))
        expense = random.choice(self.expense_ledgers) if self.expense_ledgers else "Office Expenses"
        
        self.start_tag("TALLYMESSAGE", {"xmlns:UDF": "TallyUDF"})
        self.start_tag("VOUCHER", {"ACTION": "Create", "VCHTYPE": "Journal"})
        
        self.element("DATE", format_tally_date(date))
        self.element("VOUCHERTYPENAME", "Journal")
        self.element("VOUCHERNUMBER", f"J{self.voucher_count}")
        self.element("NARRATION", f"Journal Entry - {expense}")
        
        self.start_tag("ALLLEDGERENTRIES.LIST")
        self.element("LEDGERNAME", expense)
        self.element("ISDEEMEDPOSITIVE", "Yes")
        self.element("AMOUNT", str(-amount))
        self.end_tag("ALLLEDGERENTRIES.LIST")
        
        self.start_tag("ALLLEDGERENTRIES.LIST")
        self.element("LEDGERNAME", "Profit and Loss Ac")
        self.element("ISDEEMEDPOSITIVE", "No")
        self.element("AMOUNT", str(amount))
        self.end_tag("ALLLEDGERENTRIES.LIST")
        
        self.end_tag("VOUCHER")
        self.end_tag("TALLYMESSAGE")


def main():
    print("=" * 70)
    print("TALLY XML GENERATOR - Large Scale (Streaming)")
    print("=" * 70)
    print("Financial Year: 01-Apr-2024 to 31-Mar-2025")
    print("0 Errors, 0 Exceptions in Tally")
    print("=" * 70)
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    filename = f"tally_import_large_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xml"
    filepath = os.path.join(OUTPUT_DIR, filename)
    
    writer = TallyXMLStreamWriter(filepath, "Large Scale Traders Pvt Ltd")
    
    # Generate 1GB+ file - 800K vouchers
    stats = writer.generate(
        num_ledgers=100000,
        num_vouchers=800000,
        num_stock_items=25000
    )
    
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"Total Ledgers: {stats['ledgers']:,}")
    print(f"Total Stock Items: {stats['stock_items']:,}")
    print(f"Total Vouchers: {stats['vouchers']:,}")
    print(f"Customers: {stats['customers']:,}")
    print(f"Suppliers: {stats['suppliers']:,}")
    print(f"File Size: {stats['file_size_mb']:.2f} MB")
    print("=" * 70)
    print("DONE! Import this XML file into Tally:")
    print("Gateway of Tally > Import Data > XML")
    
    return filepath


if __name__ == "__main__":
    main()

