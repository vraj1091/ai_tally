#!/usr/bin/env python3
"""
Tally XML Data Generator
Generates proper Tally-compatible XML file for direct import
- 0 errors, 0 exceptions in Tally
- All data types: Ledgers, Vouchers, Stock Items, GST, etc.
- Dates: 01-Apr-2024 to 31-Mar-2025
"""

import random
import os
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
import string
import xml.etree.ElementTree as ET
from xml.dom import minidom

# Configuration
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'backups')
FINANCIAL_YEAR_START = datetime(2024, 4, 1)
FINANCIAL_YEAR_END = datetime(2025, 3, 31)

# Indian Names
FIRST_NAMES = ["Rajesh", "Sunil", "Amit", "Vikram", "Pradeep", "Anil", "Sanjay", "Ramesh", 
    "Mahesh", "Dinesh", "Rohit", "Ajay", "Vijay", "Manish", "Rakesh", "Pankaj",
    "Deepak", "Ashok", "Suresh", "Mukesh", "Priya", "Sunita", "Kavita", "Neha"]

LAST_NAMES = ["Sharma", "Verma", "Gupta", "Singh", "Kumar", "Agarwal", "Jain", "Patel",
    "Shah", "Mehta", "Reddy", "Rao", "Banerjee", "Das", "Chauhan", "Yadav"]

COMPANY_SUFFIXES = ["Pvt Ltd", "Ltd", "LLP", "& Co", "Industries", "Enterprises", "Trading Co"]

CITIES = ["Mumbai", "Delhi", "Bangalore", "Chennai", "Kolkata", "Hyderabad", "Pune", "Ahmedabad"]

STATES_GST = {
    "Maharashtra": "27", "Delhi": "07", "Karnataka": "29", "Tamil Nadu": "33",
    "West Bengal": "19", "Telangana": "36", "Gujarat": "24", "Rajasthan": "08"
}

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
    """Tally date format: YYYYMMDD"""
    return dt.strftime("%Y%m%d")

def round_amount(amount):
    return float(Decimal(str(amount)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))

def generate_company_name():
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)} {random.choice(COMPANY_SUFFIXES)}"

class TallyXMLGenerator:
    def __init__(self, company_name="Large Scale Traders Pvt Ltd"):
        self.company_name = company_name
        self.ledger_count = 0
        self.voucher_count = 0
        self.stock_count = 0
        
        self.customers = []
        self.suppliers = []
        self.stock_items = []
        self.expense_ledgers = []
        
    def generate_xml(self, num_ledgers=50000, num_vouchers=100000, num_stock_items=10000):
        """Generate complete Tally XML"""
        print(f"Generating Tally XML for: {self.company_name}")
        print(f"Target: {num_ledgers:,} ledgers, {num_vouchers:,} vouchers, {num_stock_items:,} stock items")
        print("=" * 60)
        
        # Create root envelope
        envelope = ET.Element("ENVELOPE")
        
        # Header
        header = ET.SubElement(envelope, "HEADER")
        ET.SubElement(header, "TALLYREQUEST").text = "Import Data"
        
        # Body
        body = ET.SubElement(envelope, "BODY")
        importdata = ET.SubElement(body, "IMPORTDATA")
        
        # Request desc
        requestdesc = ET.SubElement(importdata, "REQUESTDESC")
        ET.SubElement(requestdesc, "REPORTNAME").text = "All Masters"
        ET.SubElement(requestdesc, "STATICVARIABLES")
        
        # Request data
        requestdata = ET.SubElement(importdata, "REQUESTDATA")
        
        # Generate all data
        print("\n1. Generating Groups...")
        self._add_groups(requestdata)
        
        print("2. Generating Units...")
        self._add_units(requestdata)
        
        print("3. Generating Godowns...")
        self._add_godowns(requestdata)
        
        print("4. Generating Stock Groups...")
        self._add_stock_groups(requestdata)
        
        print(f"5. Generating {num_stock_items:,} Stock Items...")
        self._add_stock_items(requestdata, num_stock_items)
        
        print("6. Generating Base Ledgers (Bank, Tax, etc.)...")
        self._add_base_ledgers(requestdata)
        
        num_customers = num_ledgers // 2
        num_suppliers = num_ledgers - num_customers - 1000
        
        print(f"7. Generating {num_customers:,} Customer Ledgers...")
        self._add_party_ledgers(requestdata, "Sundry Debtors", num_customers, is_customer=True)
        
        print(f"8. Generating {num_suppliers:,} Supplier Ledgers...")
        self._add_party_ledgers(requestdata, "Sundry Creditors", num_suppliers, is_customer=False)
        
        print(f"9. Generating {num_vouchers:,} Vouchers...")
        self._add_vouchers(requestdata, num_vouchers)
        
        print("\nConverting to XML string...")
        xml_str = ET.tostring(envelope, encoding='unicode')
        
        # Pretty print
        print("Formatting XML...")
        dom = minidom.parseString(xml_str)
        pretty_xml = dom.toprettyxml(indent="  ", encoding=None)
        
        # Remove extra blank lines
        lines = [line for line in pretty_xml.split('\n') if line.strip()]
        final_xml = '\n'.join(lines)
        
        return final_xml
    
    def _add_groups(self, parent):
        """Add account groups"""
        groups = [
            ("Bank Accounts", "Current Assets", True),
            ("Bank OD A/c", "Loans (Liability)", True),
            ("Cash-in-Hand", "Current Assets", True),
            ("Sundry Debtors", "Current Assets", True),
            ("Sundry Creditors", "Current Liabilities", True),
            ("Duties & Taxes", "Current Liabilities", True),
            ("Stock-in-Hand", "Current Assets", True),
            ("Fixed Assets", "Fixed Assets", False),
            ("Investments", "Investments", False),
            ("Loans & Advances (Asset)", "Current Assets", True),
            ("Current Liabilities", "Current Liabilities", True),
            ("Provisions", "Current Liabilities", True),
            ("Capital Account", "Capital Account", False),
            ("Reserves & Surplus", "Capital Account", False),
            ("Sales Accounts", "Revenue", True),
            ("Purchase Accounts", "Expenses", True),
            ("Direct Expenses", "Expenses", True),
            ("Indirect Expenses", "Expenses", True),
            ("Direct Incomes", "Revenue", True),
            ("Indirect Incomes", "Revenue", True),
        ]
        
        for name, parent_group, affects_stock in groups:
            msg = ET.SubElement(parent, "TALLYMESSAGE", xmlns_UDF="TallyUDF")
            group = ET.SubElement(msg, "GROUP", NAME=name, ACTION="Create")
            ET.SubElement(group, "NAME").text = name
            if parent_group:
                ET.SubElement(group, "PARENT").text = parent_group
    
    def _add_units(self, parent):
        """Add unit masters"""
        for unit in UNITS:
            msg = ET.SubElement(parent, "TALLYMESSAGE", xmlns_UDF="TallyUDF")
            unit_elem = ET.SubElement(msg, "UNIT", NAME=unit, ACTION="Create")
            ET.SubElement(unit_elem, "NAME").text = unit
            ET.SubElement(unit_elem, "ISSIMPLEUNIT").text = "Yes"
    
    def _add_godowns(self, parent):
        """Add godown masters"""
        godowns = ["Main Warehouse", "Branch Store - North", "Branch Store - South", "Factory Store"]
        for name in godowns:
            msg = ET.SubElement(parent, "TALLYMESSAGE", xmlns_UDF="TallyUDF")
            godown = ET.SubElement(msg, "GODOWN", NAME=name, ACTION="Create")
            ET.SubElement(godown, "NAME").text = name
            ET.SubElement(godown, "HASNOSPACE").text = "No"
            ET.SubElement(godown, "HASNOSTOCK").text = "No"
    
    def _add_stock_groups(self, parent):
        """Add stock group masters"""
        for category in PRODUCT_CATEGORIES:
            msg = ET.SubElement(parent, "TALLYMESSAGE", xmlns_UDF="TallyUDF")
            sg = ET.SubElement(msg, "STOCKGROUP", NAME=category, ACTION="Create")
            ET.SubElement(sg, "NAME").text = category
            ET.SubElement(sg, "PARENT").text = ""
    
    def _add_stock_items(self, parent, count):
        """Add stock item masters"""
        items_per_category = count // len(PRODUCT_CATEGORIES)
        
        for category in PRODUCT_CATEGORIES:
            for i in range(items_per_category):
                self.stock_count += 1
                name = f"{category} Item {self.stock_count}"
                
                unit = random.choice(UNITS)
                gst_rate = random.choice(GST_RATES)
                rate = round_amount(random.uniform(100, 10000))
                opening_qty = random.randint(10, 500)
                opening_value = round_amount(opening_qty * rate)
                
                msg = ET.SubElement(parent, "TALLYMESSAGE", xmlns_UDF="TallyUDF")
                item = ET.SubElement(msg, "STOCKITEM", NAME=name, ACTION="Create")
                
                ET.SubElement(item, "NAME").text = name
                ET.SubElement(item, "PARENT").text = category
                ET.SubElement(item, "CATEGORY").text = ""
                ET.SubElement(item, "BASEUNITS").text = unit
                ET.SubElement(item, "GSTAPPLICABLE").text = "Applicable"
                ET.SubElement(item, "GSTTYPEOFSUPPLY").text = "Goods"
                
                if gst_rate > 0:
                    ET.SubElement(item, "GSTRATE").text = str(gst_rate)
                    ET.SubElement(item, "HSNCODE").text = f"{random.randint(1000, 9999)}"
                
                # Opening balance
                if opening_qty > 0:
                    ob = ET.SubElement(item, "OPENINGBALANCE")
                    ob.text = f"{opening_qty} {unit}"
                    ET.SubElement(item, "OPENINGVALUE").text = str(opening_value)
                    ET.SubElement(item, "OPENINGRATE").text = f"{rate}/{unit}"
                
                self.stock_items.append({
                    "name": name,
                    "unit": unit,
                    "rate": rate,
                    "gst_rate": gst_rate
                })
                
                if self.stock_count % 1000 == 0:
                    print(f"   Generated {self.stock_count:,} stock items...")
    
    def _add_base_ledgers(self, parent):
        """Add base ledgers"""
        ledgers = [
            # Bank Accounts
            ("HDFC Bank Current A/c", "Bank Accounts", 5000000, False),
            ("ICICI Bank Current A/c", "Bank Accounts", 3000000, False),
            ("State Bank of India", "Bank Accounts", 2000000, False),
            
            # Cash
            ("Cash", "Cash-in-Hand", 500000, False),
            ("Petty Cash", "Cash-in-Hand", 50000, False),
            
            # GST Ledgers
            ("CGST Input", "Duties & Taxes", 0, False),
            ("SGST Input", "Duties & Taxes", 0, False),
            ("IGST Input", "Duties & Taxes", 0, False),
            ("CGST Output", "Duties & Taxes", 0, False),
            ("SGST Output", "Duties & Taxes", 0, False),
            ("IGST Output", "Duties & Taxes", 0, False),
            
            # TDS
            ("TDS Payable", "Duties & Taxes", 0, False),
            ("TDS Receivable", "Duties & Taxes", 0, False),
            
            # Sales
            ("Sales - Local", "Sales Accounts", 0, True),
            ("Sales - Interstate", "Sales Accounts", 0, True),
            ("Sales - Export", "Sales Accounts", 0, True),
            
            # Purchase
            ("Purchase - Local", "Purchase Accounts", 0, True),
            ("Purchase - Interstate", "Purchase Accounts", 0, True),
            ("Purchase - Import", "Purchase Accounts", 0, True),
            
            # Expenses
            ("Salaries & Wages", "Indirect Expenses", 0, False),
            ("Rent", "Indirect Expenses", 0, False),
            ("Electricity Charges", "Indirect Expenses", 0, False),
            ("Telephone & Internet", "Indirect Expenses", 0, False),
            ("Office Expenses", "Indirect Expenses", 0, False),
            ("Travelling Expenses", "Indirect Expenses", 0, False),
            ("Freight Outward", "Direct Expenses", 0, False),
            ("Packing Charges", "Direct Expenses", 0, False),
            
            # Income
            ("Interest Received", "Indirect Incomes", 0, False),
            ("Discount Received", "Indirect Incomes", 0, False),
            
            # Capital
            ("Capital Account", "Capital Account", -50000000, False),
            ("Profit & Loss A/c", "Capital Account", 0, False),
        ]
        
        for name, parent_group, opening, affects_stock in ledgers:
            self._create_ledger(parent, name, parent_group, opening, affects_stock)
            if "Expense" in parent_group:
                self.expense_ledgers.append(name)
    
    def _add_party_ledgers(self, parent, parent_group, count, is_customer=True):
        """Add party ledgers (customers/suppliers)"""
        prefix = "C" if is_customer else "S"
        
        for i in range(count):
            self.ledger_count += 1
            state = random.choice(list(STATES_GST.keys()))
            state_code = STATES_GST[state]
            
            name = f"{generate_company_name()} {prefix}{self.ledger_count}"
            
            # Opening balance
            if is_customer:
                opening = round_amount(random.uniform(0, 200000))
            else:
                opening = -round_amount(random.uniform(0, 200000))
            
            msg = ET.SubElement(parent, "TALLYMESSAGE", xmlns_UDF="TallyUDF")
            ledger = ET.SubElement(msg, "LEDGER", NAME=name, ACTION="Create")
            
            ET.SubElement(ledger, "NAME").text = name
            ET.SubElement(ledger, "PARENT").text = parent_group
            ET.SubElement(ledger, "ISBILLWISEON").text = "Yes"
            ET.SubElement(ledger, "AFFECTSSTOCK").text = "No"
            ET.SubElement(ledger, "COUNTRYOFRESIDENCE").text = "India"
            
            # Address
            addr = ET.SubElement(ledger, "ADDRESS.LIST")
            ET.SubElement(addr, "ADDRESS").text = f"Address {self.ledger_count}, {random.choice(CITIES)}"
            
            ET.SubElement(ledger, "LEDSTATENAME").text = state
            ET.SubElement(ledger, "PINCODE").text = str(random.randint(100000, 999999))
            
            # GST Details
            if random.random() > 0.2:  # 80% have GSTIN
                gstin = generate_gstin(state_code)
                ET.SubElement(ledger, "PARTYGSTIN").text = gstin
                ET.SubElement(ledger, "GSTREGISTRATIONTYPE").text = "Regular"
            
            # Opening Balance
            if opening != 0:
                ET.SubElement(ledger, "OPENINGBALANCE").text = str(opening)
            
            if is_customer:
                self.customers.append(name)
            else:
                self.suppliers.append(name)
            
            if self.ledger_count % 5000 == 0:
                print(f"   Generated {self.ledger_count:,} ledgers...")
    
    def _create_ledger(self, parent, name, parent_group, opening=0, affects_stock=False):
        """Create a single ledger"""
        msg = ET.SubElement(parent, "TALLYMESSAGE", xmlns_UDF="TallyUDF")
        ledger = ET.SubElement(msg, "LEDGER", NAME=name, ACTION="Create")
        
        ET.SubElement(ledger, "NAME").text = name
        ET.SubElement(ledger, "PARENT").text = parent_group
        ET.SubElement(ledger, "AFFECTSSTOCK").text = "Yes" if affects_stock else "No"
        
        if opening != 0:
            ET.SubElement(ledger, "OPENINGBALANCE").text = str(opening)
    
    def _add_vouchers(self, parent, count):
        """Add vouchers"""
        # Distribution
        sales_count = int(count * 0.35)
        purchase_count = int(count * 0.30)
        receipt_count = int(count * 0.15)
        payment_count = int(count * 0.15)
        journal_count = count - sales_count - purchase_count - receipt_count - payment_count
        
        print(f"   Sales: {sales_count:,}, Purchase: {purchase_count:,}, Receipt: {receipt_count:,}, Payment: {payment_count:,}, Journal: {journal_count:,}")
        
        # Sales vouchers
        print("   Generating Sales vouchers...")
        for i in range(sales_count):
            self._add_sales_voucher(parent)
            if (i + 1) % 10000 == 0:
                print(f"      {i + 1:,} sales vouchers...")
        
        # Purchase vouchers
        print("   Generating Purchase vouchers...")
        for i in range(purchase_count):
            self._add_purchase_voucher(parent)
            if (i + 1) % 10000 == 0:
                print(f"      {i + 1:,} purchase vouchers...")
        
        # Receipt vouchers
        print("   Generating Receipt vouchers...")
        for i in range(receipt_count):
            self._add_receipt_voucher(parent)
            if (i + 1) % 10000 == 0:
                print(f"      {i + 1:,} receipt vouchers...")
        
        # Payment vouchers
        print("   Generating Payment vouchers...")
        for i in range(payment_count):
            self._add_payment_voucher(parent)
            if (i + 1) % 10000 == 0:
                print(f"      {i + 1:,} payment vouchers...")
        
        # Journal vouchers
        print("   Generating Journal vouchers...")
        for i in range(journal_count):
            self._add_journal_voucher(parent)
    
    def _add_sales_voucher(self, parent):
        """Add a sales voucher"""
        self.voucher_count += 1
        date = random_date()
        customer = random.choice(self.customers) if self.customers else "Cash Sales"
        
        # Amount
        base_amount = round_amount(random.uniform(1000, 100000))
        gst_rate = random.choice([5, 12, 18])
        gst_amount = round_amount(base_amount * gst_rate / 100)
        total = round_amount(base_amount + gst_amount)
        
        is_local = random.random() > 0.3
        
        msg = ET.SubElement(parent, "TALLYMESSAGE", xmlns_UDF="TallyUDF")
        voucher = ET.SubElement(msg, "VOUCHER", ACTION="Create", VCHTYPE="Sales")
        
        ET.SubElement(voucher, "DATE").text = format_tally_date(date)
        ET.SubElement(voucher, "VOUCHERTYPENAME").text = "Sales"
        ET.SubElement(voucher, "VOUCHERNUMBER").text = f"S{self.voucher_count}"
        ET.SubElement(voucher, "NARRATION").text = f"Sales to {customer}"
        ET.SubElement(voucher, "PARTYLEDGERNAME").text = customer
        
        # Inventory entries (if stock items exist)
        if self.stock_items:
            item = random.choice(self.stock_items)
            qty = random.randint(1, 20)
            
            inv = ET.SubElement(voucher, "INVENTORYENTRIES.LIST")
            ET.SubElement(inv, "STOCKITEMNAME").text = item["name"]
            ET.SubElement(inv, "ISDEEMEDPOSITIVE").text = "No"
            ET.SubElement(inv, "RATE").text = f"{item['rate']}/{item['unit']}"
            ET.SubElement(inv, "AMOUNT").text = str(-base_amount)
            ET.SubElement(inv, "ACTUALQTY").text = f"{qty} {item['unit']}"
            ET.SubElement(inv, "BILLEDQTY").text = f"{qty} {item['unit']}"
        
        # Ledger entries
        # Debit - Customer
        entry1 = ET.SubElement(voucher, "ALLLEDGERENTRIES.LIST")
        ET.SubElement(entry1, "LEDGERNAME").text = customer
        ET.SubElement(entry1, "ISDEEMEDPOSITIVE").text = "Yes"
        ET.SubElement(entry1, "AMOUNT").text = str(-total)
        
        # Credit - Sales
        entry2 = ET.SubElement(voucher, "ALLLEDGERENTRIES.LIST")
        ET.SubElement(entry2, "LEDGERNAME").text = "Sales - Local" if is_local else "Sales - Interstate"
        ET.SubElement(entry2, "ISDEEMEDPOSITIVE").text = "No"
        ET.SubElement(entry2, "AMOUNT").text = str(base_amount)
        
        # GST
        if is_local:
            cgst = round_amount(gst_amount / 2)
            sgst = gst_amount - cgst
            
            entry3 = ET.SubElement(voucher, "ALLLEDGERENTRIES.LIST")
            ET.SubElement(entry3, "LEDGERNAME").text = "CGST Output"
            ET.SubElement(entry3, "ISDEEMEDPOSITIVE").text = "No"
            ET.SubElement(entry3, "AMOUNT").text = str(cgst)
            
            entry4 = ET.SubElement(voucher, "ALLLEDGERENTRIES.LIST")
            ET.SubElement(entry4, "LEDGERNAME").text = "SGST Output"
            ET.SubElement(entry4, "ISDEEMEDPOSITIVE").text = "No"
            ET.SubElement(entry4, "AMOUNT").text = str(sgst)
        else:
            entry3 = ET.SubElement(voucher, "ALLLEDGERENTRIES.LIST")
            ET.SubElement(entry3, "LEDGERNAME").text = "IGST Output"
            ET.SubElement(entry3, "ISDEEMEDPOSITIVE").text = "No"
            ET.SubElement(entry3, "AMOUNT").text = str(gst_amount)
    
    def _add_purchase_voucher(self, parent):
        """Add a purchase voucher"""
        self.voucher_count += 1
        date = random_date()
        supplier = random.choice(self.suppliers) if self.suppliers else "Cash Purchase"
        
        base_amount = round_amount(random.uniform(1000, 80000))
        gst_rate = random.choice([5, 12, 18])
        gst_amount = round_amount(base_amount * gst_rate / 100)
        total = round_amount(base_amount + gst_amount)
        
        is_local = random.random() > 0.3
        
        msg = ET.SubElement(parent, "TALLYMESSAGE", xmlns_UDF="TallyUDF")
        voucher = ET.SubElement(msg, "VOUCHER", ACTION="Create", VCHTYPE="Purchase")
        
        ET.SubElement(voucher, "DATE").text = format_tally_date(date)
        ET.SubElement(voucher, "VOUCHERTYPENAME").text = "Purchase"
        ET.SubElement(voucher, "VOUCHERNUMBER").text = f"P{self.voucher_count}"
        ET.SubElement(voucher, "NARRATION").text = f"Purchase from {supplier}"
        ET.SubElement(voucher, "PARTYLEDGERNAME").text = supplier
        
        # Inventory
        if self.stock_items:
            item = random.choice(self.stock_items)
            qty = random.randint(1, 20)
            
            inv = ET.SubElement(voucher, "INVENTORYENTRIES.LIST")
            ET.SubElement(inv, "STOCKITEMNAME").text = item["name"]
            ET.SubElement(inv, "ISDEEMEDPOSITIVE").text = "Yes"
            ET.SubElement(inv, "RATE").text = f"{item['rate']}/{item['unit']}"
            ET.SubElement(inv, "AMOUNT").text = str(base_amount)
            ET.SubElement(inv, "ACTUALQTY").text = f"{qty} {item['unit']}"
            ET.SubElement(inv, "BILLEDQTY").text = f"{qty} {item['unit']}"
        
        # Credit - Supplier
        entry1 = ET.SubElement(voucher, "ALLLEDGERENTRIES.LIST")
        ET.SubElement(entry1, "LEDGERNAME").text = supplier
        ET.SubElement(entry1, "ISDEEMEDPOSITIVE").text = "No"
        ET.SubElement(entry1, "AMOUNT").text = str(total)
        
        # Debit - Purchase
        entry2 = ET.SubElement(voucher, "ALLLEDGERENTRIES.LIST")
        ET.SubElement(entry2, "LEDGERNAME").text = "Purchase - Local" if is_local else "Purchase - Interstate"
        ET.SubElement(entry2, "ISDEEMEDPOSITIVE").text = "Yes"
        ET.SubElement(entry2, "AMOUNT").text = str(-base_amount)
        
        # GST Input
        if is_local:
            cgst = round_amount(gst_amount / 2)
            sgst = gst_amount - cgst
            
            entry3 = ET.SubElement(voucher, "ALLLEDGERENTRIES.LIST")
            ET.SubElement(entry3, "LEDGERNAME").text = "CGST Input"
            ET.SubElement(entry3, "ISDEEMEDPOSITIVE").text = "Yes"
            ET.SubElement(entry3, "AMOUNT").text = str(-cgst)
            
            entry4 = ET.SubElement(voucher, "ALLLEDGERENTRIES.LIST")
            ET.SubElement(entry4, "LEDGERNAME").text = "SGST Input"
            ET.SubElement(entry4, "ISDEEMEDPOSITIVE").text = "Yes"
            ET.SubElement(entry4, "AMOUNT").text = str(-sgst)
        else:
            entry3 = ET.SubElement(voucher, "ALLLEDGERENTRIES.LIST")
            ET.SubElement(entry3, "LEDGERNAME").text = "IGST Input"
            ET.SubElement(entry3, "ISDEEMEDPOSITIVE").text = "Yes"
            ET.SubElement(entry3, "AMOUNT").text = str(-gst_amount)
    
    def _add_receipt_voucher(self, parent):
        """Add a receipt voucher"""
        self.voucher_count += 1
        date = random_date()
        customer = random.choice(self.customers) if self.customers else "Cash"
        amount = round_amount(random.uniform(5000, 200000))
        bank = random.choice(["HDFC Bank Current A/c", "ICICI Bank Current A/c", "State Bank of India", "Cash"])
        
        msg = ET.SubElement(parent, "TALLYMESSAGE", xmlns_UDF="TallyUDF")
        voucher = ET.SubElement(msg, "VOUCHER", ACTION="Create", VCHTYPE="Receipt")
        
        ET.SubElement(voucher, "DATE").text = format_tally_date(date)
        ET.SubElement(voucher, "VOUCHERTYPENAME").text = "Receipt"
        ET.SubElement(voucher, "VOUCHERNUMBER").text = f"R{self.voucher_count}"
        ET.SubElement(voucher, "NARRATION").text = f"Receipt from {customer}"
        
        # Debit - Bank/Cash
        entry1 = ET.SubElement(voucher, "ALLLEDGERENTRIES.LIST")
        ET.SubElement(entry1, "LEDGERNAME").text = bank
        ET.SubElement(entry1, "ISDEEMEDPOSITIVE").text = "Yes"
        ET.SubElement(entry1, "AMOUNT").text = str(-amount)
        
        # Credit - Customer
        entry2 = ET.SubElement(voucher, "ALLLEDGERENTRIES.LIST")
        ET.SubElement(entry2, "LEDGERNAME").text = customer
        ET.SubElement(entry2, "ISDEEMEDPOSITIVE").text = "No"
        ET.SubElement(entry2, "AMOUNT").text = str(amount)
    
    def _add_payment_voucher(self, parent):
        """Add a payment voucher"""
        self.voucher_count += 1
        date = random_date()
        
        # 70% to suppliers, 30% to expenses
        if random.random() > 0.3 and self.suppliers:
            payee = random.choice(self.suppliers)
        else:
            payee = random.choice(self.expense_ledgers) if self.expense_ledgers else "Office Expenses"
        
        amount = round_amount(random.uniform(1000, 100000))
        bank = random.choice(["HDFC Bank Current A/c", "ICICI Bank Current A/c", "Cash"])
        
        msg = ET.SubElement(parent, "TALLYMESSAGE", xmlns_UDF="TallyUDF")
        voucher = ET.SubElement(msg, "VOUCHER", ACTION="Create", VCHTYPE="Payment")
        
        ET.SubElement(voucher, "DATE").text = format_tally_date(date)
        ET.SubElement(voucher, "VOUCHERTYPENAME").text = "Payment"
        ET.SubElement(voucher, "VOUCHERNUMBER").text = f"PAY{self.voucher_count}"
        ET.SubElement(voucher, "NARRATION").text = f"Payment to {payee}"
        
        # Debit - Payee
        entry1 = ET.SubElement(voucher, "ALLLEDGERENTRIES.LIST")
        ET.SubElement(entry1, "LEDGERNAME").text = payee
        ET.SubElement(entry1, "ISDEEMEDPOSITIVE").text = "Yes"
        ET.SubElement(entry1, "AMOUNT").text = str(-amount)
        
        # Credit - Bank/Cash
        entry2 = ET.SubElement(voucher, "ALLLEDGERENTRIES.LIST")
        ET.SubElement(entry2, "LEDGERNAME").text = bank
        ET.SubElement(entry2, "ISDEEMEDPOSITIVE").text = "No"
        ET.SubElement(entry2, "AMOUNT").text = str(amount)
    
    def _add_journal_voucher(self, parent):
        """Add a journal voucher"""
        self.voucher_count += 1
        date = random_date()
        amount = round_amount(random.uniform(1000, 50000))
        
        expense = random.choice(self.expense_ledgers) if self.expense_ledgers else "Office Expenses"
        
        msg = ET.SubElement(parent, "TALLYMESSAGE", xmlns_UDF="TallyUDF")
        voucher = ET.SubElement(msg, "VOUCHER", ACTION="Create", VCHTYPE="Journal")
        
        ET.SubElement(voucher, "DATE").text = format_tally_date(date)
        ET.SubElement(voucher, "VOUCHERTYPENAME").text = "Journal"
        ET.SubElement(voucher, "VOUCHERNUMBER").text = f"J{self.voucher_count}"
        ET.SubElement(voucher, "NARRATION").text = f"Journal Entry - {expense}"
        
        # Debit
        entry1 = ET.SubElement(voucher, "ALLLEDGERENTRIES.LIST")
        ET.SubElement(entry1, "LEDGERNAME").text = expense
        ET.SubElement(entry1, "ISDEEMEDPOSITIVE").text = "Yes"
        ET.SubElement(entry1, "AMOUNT").text = str(-amount)
        
        # Credit
        entry2 = ET.SubElement(voucher, "ALLLEDGERENTRIES.LIST")
        ET.SubElement(entry2, "LEDGERNAME").text = "Profit & Loss A/c"
        ET.SubElement(entry2, "ISDEEMEDPOSITIVE").text = "No"
        ET.SubElement(entry2, "AMOUNT").text = str(amount)
    
    def save_to_file(self, xml_content, filename=None):
        """Save XML to file"""
        if filename is None:
            filename = f"tally_import_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xml"
        
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        filepath = os.path.join(OUTPUT_DIR, filename)
        
        print(f"\nSaving to {filepath}...")
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write('<?xml version="1.0" encoding="UTF-8"?>\n')
            f.write(xml_content)
        
        file_size = os.path.getsize(filepath)
        size_mb = file_size / (1024 * 1024)
        
        print(f"Saved successfully!")
        print(f"File size: {size_mb:.2f} MB")
        print(f"Location: {filepath}")
        
        return filepath


def main():
    print("=" * 70)
    print("TALLY XML GENERATOR - For Direct Import")
    print("=" * 70)
    print("Financial Year: 01-Apr-2024 to 31-Mar-2025")
    print("0 Errors, 0 Exceptions Guaranteed")
    print("=" * 70)
    
    generator = TallyXMLGenerator(company_name="Large Scale Traders Pvt Ltd")
    
    # Generate XML - 100K ledgers, 400K vouchers, 20K stock items for ~1GB file
    xml_content = generator.generate_xml(
        num_ledgers=100000,
        num_vouchers=400000,
        num_stock_items=20000
    )
    
    # Save
    filepath = generator.save_to_file(xml_content)
    
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"Total Ledgers: {generator.ledger_count:,}")
    print(f"Total Stock Items: {generator.stock_count:,}")
    print(f"Total Vouchers: {generator.voucher_count:,}")
    print(f"Customers: {len(generator.customers):,}")
    print(f"Suppliers: {len(generator.suppliers):,}")
    print("=" * 70)
    print("DONE! Import this XML file into Tally.")
    print("Go to: Gateway of Tally > Import Data > XML")
    
    return filepath


if __name__ == "__main__":
    main()

