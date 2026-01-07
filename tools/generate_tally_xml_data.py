#!/usr/bin/env python3
"""
Tally XML Test Data Generator - COMPREHENSIVE VERSION
Generates 1GB+ Tally XML with ALL data types:
- Ledgers (varied amounts)
- Vouchers with GST
- Stock Items with Inventory
- Cost Centers
- Budgets
- Bill-wise details

Usage:
    python generate_tally_xml_data.py

Output:
    - tally_backup_1gb.xml
"""

import random
import string
from datetime import datetime, timedelta
import os
import math

# Configuration
TARGET_SIZE_MB = 1024
COMPANY_NAME = "Test Enterprise Pvt Ltd"

# Indian data
FIRST_NAMES = [
    "Rajesh", "Suresh", "Mahesh", "Ramesh", "Anil", "Vijay", "Sanjay", "Ajay",
    "Priya", "Neha", "Pooja", "Anjali", "Sunita", "Kavita", "Rekha", "Meena",
    "Amit", "Sumit", "Rohit", "Mohit", "Nitin", "Sachin", "Ravi", "Arun",
    "Deepak", "Rakesh", "Mukesh", "Sunil", "Vinod", "Ashok", "Manish", "Pankaj",
    "Kiran", "Anand", "Prakash", "Sudhir", "Vivek", "Gaurav", "Rahul", "Vikram"
]

LAST_NAMES = [
    "Sharma", "Verma", "Gupta", "Singh", "Kumar", "Agarwal", "Jain", "Patel",
    "Shah", "Mehta", "Reddy", "Rao", "Iyer", "Nair", "Menon", "Pillai",
    "Choudhary", "Yadav", "Thakur", "Chauhan", "Rajput", "Malhotra", "Kapoor", "Khanna",
    "Bansal", "Mittal", "Goel", "Arora", "Bhatia", "Chopra", "Dhawan", "Tandon"
]

COMPANY_SUFFIXES = ["Pvt Ltd", "Ltd", "LLP", "& Co", "Industries", "Enterprises", "Trading Co", "Solutions", "Corporation", "Associates"]

CITIES = [
    ("Mumbai", "Maharashtra", "27"), ("Delhi", "Delhi", "07"), ("Bangalore", "Karnataka", "29"),
    ("Chennai", "Tamil Nadu", "33"), ("Kolkata", "West Bengal", "19"), ("Hyderabad", "Telangana", "36"),
    ("Pune", "Maharashtra", "27"), ("Ahmedabad", "Gujarat", "24"), ("Jaipur", "Rajasthan", "08"),
    ("Lucknow", "Uttar Pradesh", "09"), ("Kanpur", "Uttar Pradesh", "09"), ("Nagpur", "Maharashtra", "27"),
    ("Indore", "Madhya Pradesh", "23"), ("Bhopal", "Madhya Pradesh", "23"), ("Surat", "Gujarat", "24"),
    ("Vadodara", "Gujarat", "24"), ("Coimbatore", "Tamil Nadu", "33"), ("Kochi", "Kerala", "32")
]

PRODUCTS = {
    "Steel": {"hsn": "7206", "gst": 18, "unit": "MT"},
    "Iron": {"hsn": "7201", "gst": 18, "unit": "MT"},
    "Copper": {"hsn": "7403", "gst": 18, "unit": "Kg"},
    "Aluminum": {"hsn": "7601", "gst": 18, "unit": "Kg"},
    "Cement": {"hsn": "2523", "gst": 28, "unit": "Bags"},
    "Sand": {"hsn": "2505", "gst": 5, "unit": "CFT"},
    "Bricks": {"hsn": "6901", "gst": 5, "unit": "Nos"},
    "Cotton": {"hsn": "5201", "gst": 5, "unit": "Kg"},
    "Silk": {"hsn": "5002", "gst": 5, "unit": "Mtrs"},
    "Rice": {"hsn": "1006", "gst": 0, "unit": "Kg"},
    "Wheat": {"hsn": "1001", "gst": 0, "unit": "Kg"},
    "Sugar": {"hsn": "1701", "gst": 5, "unit": "Kg"},
    "Edible Oil": {"hsn": "1507", "gst": 5, "unit": "Ltrs"},
    "Chemicals": {"hsn": "2801", "gst": 18, "unit": "Kg"},
    "Fertilizers": {"hsn": "3102", "gst": 5, "unit": "Kg"},
    "Paints": {"hsn": "3208", "gst": 28, "unit": "Ltrs"},
    "Electronics": {"hsn": "8471", "gst": 18, "unit": "Nos"},
    "Machinery": {"hsn": "8428", "gst": 18, "unit": "Nos"},
    "Furniture": {"hsn": "9403", "gst": 18, "unit": "Nos"},
    "Medicines": {"hsn": "3004", "gst": 12, "unit": "Nos"},
    "Textiles": {"hsn": "5208", "gst": 5, "unit": "Mtrs"},
    "Plastics": {"hsn": "3901", "gst": 18, "unit": "Kg"},
    "Paper": {"hsn": "4802", "gst": 12, "unit": "Reams"},
    "Rubber": {"hsn": "4001", "gst": 18, "unit": "Kg"},
    "Glass": {"hsn": "7001", "gst": 18, "unit": "Sq.ft"},
    "Leather": {"hsn": "4101", "gst": 5, "unit": "Sq.ft"},
    "Tyres": {"hsn": "4011", "gst": 28, "unit": "Nos"},
    "Batteries": {"hsn": "8507", "gst": 28, "unit": "Nos"},
    "Cables": {"hsn": "8544", "gst": 18, "unit": "Mtrs"},
    "Pipes": {"hsn": "7304", "gst": 18, "unit": "Mtrs"}
}

EXPENSE_TYPES = [
    ("Salary & Wages", "Direct Expenses", 28),
    ("Rent", "Indirect Expenses", 18),
    ("Electricity Charges", "Indirect Expenses", 18),
    ("Telephone Expenses", "Indirect Expenses", 18),
    ("Internet Charges", "Indirect Expenses", 18),
    ("Traveling Expenses", "Indirect Expenses", 5),
    ("Conveyance", "Indirect Expenses", 0),
    ("Printing & Stationery", "Indirect Expenses", 18),
    ("Postage & Courier", "Indirect Expenses", 18),
    ("Advertisement", "Indirect Expenses", 18),
    ("Commission Paid", "Indirect Expenses", 18),
    ("Insurance Premium", "Indirect Expenses", 18),
    ("Repairs & Maintenance", "Indirect Expenses", 18),
    ("Legal & Professional Fees", "Indirect Expenses", 18),
    ("Audit Fees", "Indirect Expenses", 18),
    ("Bank Charges", "Indirect Expenses", 18),
    ("Interest Paid", "Indirect Expenses", 0),
    ("Depreciation", "Indirect Expenses", 0),
    ("Office Expenses", "Indirect Expenses", 18),
    ("Transportation Charges", "Direct Expenses", 18),
    ("Freight Inward", "Direct Expenses", 18),
    ("Loading & Unloading", "Direct Expenses", 18),
    ("Factory Expenses", "Direct Expenses", 18),
    ("Packing Charges", "Direct Expenses", 18)
]

BANKS = ["State Bank of India", "HDFC Bank", "ICICI Bank", "Axis Bank", "Punjab National Bank", 
         "Bank of Baroda", "Kotak Mahindra Bank", "Yes Bank", "IndusInd Bank", "IDBI Bank"]


def random_amount(category="normal"):
    """Generate highly varied amounts based on category"""
    if category == "debtor":
        # Debtors - very varied, from small retail to large corporate
        ranges = [
            (500, 10000, 0.20),              # 20% very small (retail)
            (10000, 50000, 0.25),            # 25% small
            (50000, 200000, 0.20),           # 20% medium
            (200000, 1000000, 0.15),         # 15% medium-large
            (1000000, 5000000, 0.10),        # 10% large
            (5000000, 25000000, 0.06),       # 6% very large
            (25000000, 100000000, 0.03),     # 3% corporate
            (100000000, 500000000, 0.01),    # 1% mega (crores)
        ]
    elif category == "creditor":
        # Creditors - suppliers, typically larger amounts
        ranges = [
            (1000, 25000, 0.15),
            (25000, 100000, 0.25),
            (100000, 500000, 0.25),
            (500000, 2000000, 0.15),
            (2000000, 10000000, 0.10),
            (10000000, 50000000, 0.06),
            (50000000, 200000000, 0.03),
            (200000000, 1000000000, 0.01),   # Huge suppliers
        ]
    elif category == "sales":
        ranges = [
            (10000, 100000, 0.20),
            (100000, 500000, 0.30),
            (500000, 2000000, 0.25),
            (2000000, 10000000, 0.15),
            (10000000, 100000000, 0.08),
            (100000000, 500000000, 0.02),
        ]
    elif category == "purchase":
        ranges = [
            (5000, 50000, 0.20),
            (50000, 200000, 0.30),
            (200000, 1000000, 0.25),
            (1000000, 5000000, 0.15),
            (5000000, 50000000, 0.08),
            (50000000, 200000000, 0.02),
        ]
    elif category == "expense":
        ranges = [
            (100, 5000, 0.25),
            (5000, 25000, 0.30),
            (25000, 100000, 0.25),
            (100000, 500000, 0.12),
            (500000, 2000000, 0.06),
            (2000000, 10000000, 0.02),
        ]
    elif category == "bank":
        ranges = [
            (50000, 500000, 0.20),
            (500000, 2000000, 0.25),
            (2000000, 10000000, 0.25),
            (10000000, 50000000, 0.15),
            (50000000, 200000000, 0.10),
            (200000000, 1000000000, 0.05),
        ]
    elif category == "voucher":
        ranges = [
            (100, 5000, 0.25),
            (5000, 25000, 0.30),
            (25000, 100000, 0.20),
            (100000, 500000, 0.12),
            (500000, 2000000, 0.08),
            (2000000, 10000000, 0.04),
            (10000000, 50000000, 0.01),
        ]
    else:
        return round(random.uniform(1000, 1000000), 2)
    
    r = random.random()
    cumulative = 0
    for low, high, prob in ranges:
        cumulative += prob
        if r <= cumulative:
            return round(random.uniform(low, high), 2)
    return round(random.uniform(1000, 100000), 2)


def random_date(start_year=2023, end_year=2024):
    """Generate random date in financial year format (April to March)"""
    # If same year passed, use that full year
    if start_year == end_year:
        start = datetime(start_year, 1, 1)
        end = datetime(start_year, 12, 31)
    else:
        start = datetime(start_year, 4, 1)
        end = datetime(end_year, 3, 31)
    
    delta = end - start
    if delta.days <= 0:
        return datetime(start_year, 6, 15).strftime("%Y%m%d")  # Fallback to mid-year
    
    random_days = random.randint(0, delta.days)
    return (start + timedelta(days=random_days)).strftime("%Y%m%d")


def escape_xml(text):
    if text is None:
        return ""
    text = str(text)
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("'", "&apos;").replace('"', "&quot;")


def random_company_name():
    return f"{random.choice(['Shree', 'Sri', 'New', 'National', 'Indian', 'Global', 'Modern', 'Royal', 'Prime', 'Super'])} {random.choice(LAST_NAMES)} {random.choice(COMPANY_SUFFIXES)}"


def generate_gst_number(state_code):
    chars = string.ascii_uppercase
    return f"{state_code}{random.choice(chars)}{random.choice(chars)}{random.choice(chars)}{random.choice(chars)}{random.randint(1000, 9999)}{random.choice(chars)}{random.randint(1, 9)}Z{random.choice(chars)}"


def generate_ledger_xml(index, ledger_type):
    """Generate ledger with varied realistic data"""
    city, state, state_code = random.choice(CITIES)
    gst = generate_gst_number(state_code)
    
    if ledger_type == "debtor":
        # Mix of individuals and companies
        if random.random() < 0.6:
            name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)} D{index}"
        else:
            name = f"{random_company_name()} D{index}"
        parent = "Sundry Debtors"
        balance = random_amount("debtor")
        is_revenue = "No"
        credit_days = random.choice([0, 7, 15, 30, 45, 60, 90, 120])
        
    elif ledger_type == "creditor":
        # Mostly companies/suppliers
        if random.random() < 0.3:
            name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)} C{index}"
        else:
            name = f"{random_company_name()} C{index}"
        parent = "Sundry Creditors"
        balance = -random_amount("creditor")
        is_revenue = "No"
        credit_days = random.choice([0, 15, 30, 45, 60, 90])
        
    elif ledger_type == "sales":
        product = random.choice(list(PRODUCTS.keys()))
        name = f"Sales - {product} S{index}"
        parent = "Sales Accounts"
        balance = -random_amount("sales")
        is_revenue = "Yes"
        credit_days = 0
        
    elif ledger_type == "purchase":
        product = random.choice(list(PRODUCTS.keys()))
        name = f"Purchase - {product} P{index}"
        parent = "Purchase Accounts"
        balance = random_amount("purchase")
        is_revenue = "No"
        credit_days = 0
        
    elif ledger_type == "expense":
        expense_name, expense_parent, gst_rate = random.choice(EXPENSE_TYPES)
        name = f"{expense_name} E{index}"
        parent = expense_parent
        balance = random_amount("expense")
        is_revenue = "No"
        credit_days = 0
        
    elif ledger_type == "bank":
        bank = random.choice(BANKS)
        acc_type = random.choice(["Current A/c", "Savings A/c", "OD A/c", "CC A/c"])
        name = f"{bank} - {acc_type} B{index}"
        parent = "Bank Accounts" if "OD" not in acc_type else "Bank OD A/c"
        balance = random_amount("bank") if "OD" not in acc_type else -random_amount("bank")
        is_revenue = "No"
        credit_days = 0
        
    elif ledger_type == "cash":
        name = f"Cash - {city} C{index}"
        parent = "Cash-in-Hand"
        balance = random.uniform(10000, 500000)
        is_revenue = "No"
        credit_days = 0
        
    elif ledger_type == "asset":
        assets = ["Land & Building", "Plant & Machinery", "Furniture & Fixtures", 
                  "Computer & IT Equipment", "Vehicles", "Office Equipment", "Electrical Installations"]
        name = f"{random.choice(assets)} A{index}"
        parent = "Fixed Assets"
        balance = random.uniform(100000, 100000000)
        is_revenue = "No"
        credit_days = 0
        
    elif ledger_type == "tax":
        taxes = [
            ("CGST Input", "Duties & Taxes"),
            ("SGST Input", "Duties & Taxes"),
            ("IGST Input", "Duties & Taxes"),
            ("CGST Output", "Duties & Taxes"),
            ("SGST Output", "Duties & Taxes"),
            ("IGST Output", "Duties & Taxes"),
            ("TDS Receivable", "Duties & Taxes"),
            ("TDS Payable - 194C", "Duties & Taxes"),
            ("TDS Payable - 194J", "Duties & Taxes"),
            ("TCS Receivable", "Duties & Taxes"),
            ("GST RCM Payable", "Duties & Taxes"),
            ("Professional Tax", "Duties & Taxes"),
            ("Provident Fund", "Duties & Taxes"),
            ("ESI Payable", "Duties & Taxes"),
        ]
        tax_name, tax_parent = random.choice(taxes)
        name = f"{tax_name} T{index}"
        parent = tax_parent
        balance = random.uniform(10000, 5000000) * random.choice([1, -1])
        is_revenue = "No"
        credit_days = 0
        
    else:
        name = f"Ledger {index}"
        parent = "Sundry Debtors"
        balance = random_amount()
        is_revenue = "No"
        credit_days = 0
    
    opening = balance * random.uniform(0.5, 0.95)
    
    xml = f'''  <LEDGER NAME="{escape_xml(name)}" RESERVEDNAME="">
   <NAME>{escape_xml(name)}</NAME>
   <PARENT>{escape_xml(parent)}</PARENT>
   <ISBILLWISEON>Yes</ISBILLWISEON>
   <ISCOSTCENTRESON>Yes</ISCOSTCENTRESON>
   <ISREVENUE>{is_revenue}</ISREVENUE>
   <AFFECTSSTOCK>No</AFFECTSSTOCK>
   <OPENINGBALANCE>{opening:.2f}</OPENINGBALANCE>
   <CLOSINGBALANCE>{balance:.2f}</CLOSINGBALANCE>
   <ADDRESS.LIST>
    <ADDRESS>{random.randint(1, 999)}, {random.choice(['MG Road', 'Station Road', 'Industrial Area', 'MIDC', 'Main Market', 'Commercial Complex'])}</ADDRESS>
    <ADDRESS>{city}, {state}</ADDRESS>
   </ADDRESS.LIST>
   <LEDGERPHONE>+91-{random.randint(20, 99)}-{random.randint(10000000, 99999999)}</LEDGERPHONE>
   <LEDGERMOBILE>+91-{random.randint(7000000000, 9999999999)}</LEDGERMOBILE>
   <EMAIL>{name.lower().replace(' ', '.').replace('-', '').replace('&', '')[:20]}@{random.choice(['gmail.com', 'yahoo.com', 'outlook.com', 'company.com'])}</EMAIL>
   <COUNTRYNAME>India</COUNTRYNAME>
   <LEDSTATENAME>{state}</LEDSTATENAME>
   <PINCODE>{random.randint(100000, 999999)}</PINCODE>
   <GSTREGISTRATIONTYPE>{random.choice(['Regular', 'Regular', 'Regular', 'Composition', 'Unregistered'])}</GSTREGISTRATIONTYPE>
   <PARTYGSTIN>{gst}</PARTYGSTIN>
   <PANNO>{random.choice(string.ascii_uppercase)}{random.choice(string.ascii_uppercase)}{random.choice(string.ascii_uppercase)}{random.choice('PFCHAT')}{random.choice(string.ascii_uppercase)}{random.randint(1000, 9999)}{random.choice(string.ascii_uppercase)}</PANNO>
   <CREDITDAYS>{credit_days}</CREDITDAYS>
   <CREDITLIMIT>{random_amount('debtor') if ledger_type == 'debtor' else 0:.2f}</CREDITLIMIT>
   <BANKDETAILS>
    <BENEFICIARYNAME>{escape_xml(name)}</BENEFICIARYNAME>
    <BANKNAME>{random.choice(BANKS)}</BANKNAME>
    <ACCOUNTNUMBER>{random.randint(10000000000, 99999999999)}</ACCOUNTNUMBER>
    <IFSCCODE>{random.choice(['SBIN', 'HDFC', 'ICIC', 'UTIB', 'PUNB'])}{random.randint(1000000, 9999999)}</IFSCCODE>
   </BANKDETAILS>
  </LEDGER>
'''
    return xml, balance


def generate_voucher_xml(index, date):
    """Generate voucher with full GST details"""
    voucher_type = random.choice(["Sales", "Sales", "Purchase", "Purchase", "Receipt", "Payment", "Journal", "Contra"])
    base_amount = random_amount("voucher")
    party = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)} {random.choice(['D', 'C'])}{random.randint(1, 15000)}"
    
    gst_rate = random.choice([0, 5, 12, 18, 28])
    is_interstate = random.random() < 0.3
    
    if is_interstate:
        igst = round(base_amount * gst_rate / 100, 2)
        cgst = sgst = 0
    else:
        cgst = sgst = round(base_amount * gst_rate / 200, 2)
        igst = 0
    
    total_amount = base_amount + cgst + sgst + igst
    
    product = random.choice(list(PRODUCTS.keys()))
    product_info = PRODUCTS[product]
    
    if voucher_type == "Sales":
        dr_ledger = party
        cr_ledger = f"Sales - {product} S{random.randint(1, 5000)}"
        narration = f"Being goods sold vide Invoice"
    elif voucher_type == "Purchase":
        dr_ledger = f"Purchase - {product} P{random.randint(1, 5000)}"
        cr_ledger = party
        narration = f"Being goods purchased vide Bill"
    elif voucher_type == "Receipt":
        dr_ledger = f"{random.choice(BANKS)} - Current A/c B{random.randint(1, 100)}"
        cr_ledger = party
        narration = f"Being amount received"
    elif voucher_type == "Payment":
        dr_ledger = party
        cr_ledger = f"{random.choice(BANKS)} - Current A/c B{random.randint(1, 100)}"
        narration = f"Being amount paid"
    elif voucher_type == "Contra":
        dr_ledger = f"{random.choice(BANKS)} - Current A/c B{random.randint(1, 50)}"
        cr_ledger = f"Cash - {random.choice([c[0] for c in CITIES])} C{random.randint(1, 50)}"
        narration = "Cash deposited/withdrawn"
    else:
        dr_ledger = f"Ledger {random.randint(1, 1000)}"
        cr_ledger = f"Ledger {random.randint(1, 1000)}"
        narration = "Journal adjustment entry"
    
    voucher_num = f"{voucher_type[:3].upper()}/{date[:6]}/{index:06d}"
    bill_num = f"INV/{date[:6]}/{random.randint(1000, 9999)}"
    
    xml = f'''  <VOUCHER DATE="{date}" VOUCHERTYPENAME="{voucher_type}" VOUCHERNUMBER="{voucher_num}">
   <DATE>{date}</DATE>
   <VOUCHERTYPENAME>{voucher_type}</VOUCHERTYPENAME>
   <VOUCHERNUMBER>{voucher_num}</VOUCHERNUMBER>
   <REFERENCE>{bill_num}</REFERENCE>
   <PARTYLEDGERNAME>{escape_xml(party)}</PARTYLEDGERNAME>
   <BASICBASEPARTYNAME>{escape_xml(party)}</BASICBASEPARTYNAME>
   <AMOUNT>{total_amount:.2f}</AMOUNT>
   <NARRATION>{escape_xml(narration)} - {bill_num}</NARRATION>
   <EFFECTIVEDATE>{date}</EFFECTIVEDATE>
   <ISINVOICE>{"Yes" if voucher_type in ["Sales", "Purchase"] else "No"}</ISINVOICE>
   <ISCANCELLED>{"Yes" if random.random() < 0.01 else "No"}</ISCANCELLED>
   <PERSISTEDVIEW>Invoice Voucher View</PERSISTEDVIEW>
   <PLACEOFSUPPLY>{random.choice([c[1] for c in CITIES])}</PLACEOFSUPPLY>
   <BASICBUYERNAME>{escape_xml(party)}</BASICBUYERNAME>
   <CONSIGNEENAME>{escape_xml(party)}</CONSIGNEENAME>
   <ALLLEDGERENTRIES.LIST>
    <LEDGERNAME>{escape_xml(dr_ledger)}</LEDGERNAME>
    <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
    <AMOUNT>-{total_amount:.2f}</AMOUNT>
   </ALLLEDGERENTRIES.LIST>
   <ALLLEDGERENTRIES.LIST>
    <LEDGERNAME>{escape_xml(cr_ledger)}</LEDGERNAME>
    <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
    <AMOUNT>{base_amount:.2f}</AMOUNT>
   </ALLLEDGERENTRIES.LIST>'''
    
    # Add GST entries
    if cgst > 0:
        xml += f'''
   <ALLLEDGERENTRIES.LIST>
    <LEDGERNAME>CGST {"Output" if voucher_type == "Sales" else "Input"}</LEDGERNAME>
    <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
    <AMOUNT>{cgst:.2f}</AMOUNT>
   </ALLLEDGERENTRIES.LIST>
   <ALLLEDGERENTRIES.LIST>
    <LEDGERNAME>SGST {"Output" if voucher_type == "Sales" else "Input"}</LEDGERNAME>
    <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
    <AMOUNT>{sgst:.2f}</AMOUNT>
   </ALLLEDGERENTRIES.LIST>'''
    
    if igst > 0:
        xml += f'''
   <ALLLEDGERENTRIES.LIST>
    <LEDGERNAME>IGST {"Output" if voucher_type == "Sales" else "Input"}</LEDGERNAME>
    <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
    <AMOUNT>{igst:.2f}</AMOUNT>
   </ALLLEDGERENTRIES.LIST>'''
    
    # Add inventory entries for sales/purchase
    if voucher_type in ["Sales", "Purchase"]:
        qty = random.randint(1, 1000)
        rate = base_amount / qty
        xml += f'''
   <INVENTORYENTRIES.LIST>
    <STOCKITEMNAME>{product} Grade-{random.choice(['A', 'B', 'Premium'])} {random.randint(1, 1000)}</STOCKITEMNAME>
    <ISDEEMEDPOSITIVE>{"No" if voucher_type == "Sales" else "Yes"}</ISDEEMEDPOSITIVE>
    <RATE>{rate:.2f}/{product_info["unit"]}</RATE>
    <AMOUNT>{"-" if voucher_type == "Sales" else ""}{base_amount:.2f}</AMOUNT>
    <ACTUALQTY>{qty} {product_info["unit"]}</ACTUALQTY>
    <BILLEDQTY>{qty} {product_info["unit"]}</BILLEDQTY>
    <BATCHALLOCATIONS.LIST>
     <GODOWNNAME>Main Godown</GODOWNNAME>
     <BATCHNAME>Batch-{date[:6]}-{random.randint(100, 999)}</BATCHNAME>
     <AMOUNT>{base_amount:.2f}</AMOUNT>
     <ACTUALQTY>{qty} {product_info["unit"]}</ACTUALQTY>
    </BATCHALLOCATIONS.LIST>
   </INVENTORYENTRIES.LIST>'''
    
    xml += f'''
   <GSTDETAILS>
    <TAXABLEVALUE>{base_amount:.2f}</TAXABLEVALUE>
    <CGSTRATE>{gst_rate/2 if not is_interstate else 0}</CGSTRATE>
    <SGSTRATE>{gst_rate/2 if not is_interstate else 0}</SGSTRATE>
    <IGSTRATE>{gst_rate if is_interstate else 0}</IGSTRATE>
    <CGSTAMOUNT>{cgst:.2f}</CGSTAMOUNT>
    <SGSTAMOUNT>{sgst:.2f}</SGSTAMOUNT>
    <IGSTAMOUNT>{igst:.2f}</IGSTAMOUNT>
    <HSNCODE>{product_info["hsn"]}</HSNCODE>
   </GSTDETAILS>
  </VOUCHER>
'''
    return xml


def generate_stock_item_xml(index):
    """Generate stock item with full inventory details"""
    product = random.choice(list(PRODUCTS.keys()))
    info = PRODUCTS[product]
    
    grade = random.choice(['A', 'B', 'C', 'Premium', 'Standard', 'Economy'])
    name = f"{product} - {grade} Grade {index}"
    
    opening_qty = random.randint(0, 10000)
    inward_qty = random.randint(100, 5000)
    outward_qty = random.randint(50, min(opening_qty + inward_qty, 4000))
    closing_qty = opening_qty + inward_qty - outward_qty
    
    rate = random.uniform(10, 10000)
    mrp = rate * random.uniform(1.1, 1.5)
    
    xml = f'''  <STOCKITEM NAME="{escape_xml(name)}">
   <NAME>{escape_xml(name)}</NAME>
   <PARENT>{product} Group</PARENT>
   <CATEGORY>{product}</CATEGORY>
   <BASEUNITS>{info["unit"]}</BASEUNITS>
   <ADDITIONALUNITS></ADDITIONALUNITS>
   <OPENINGBALANCE>{opening_qty:.2f} {info["unit"]}</OPENINGBALANCE>
   <OPENINGRATE>{rate * 0.95:.2f}</OPENINGRATE>
   <OPENINGVALUE>{opening_qty * rate * 0.95:.2f}</OPENINGVALUE>
   <CLOSINGBALANCE>{closing_qty:.2f} {info["unit"]}</CLOSINGBALANCE>
   <CLOSINGRATE>{rate:.2f}</CLOSINGRATE>
   <CLOSINGVALUE>{closing_qty * rate:.2f}</CLOSINGVALUE>
   <TOTALINWARDQTY>{inward_qty:.2f} {info["unit"]}</TOTALINWARDQTY>
   <TOTALOUTWARDQTY>{outward_qty:.2f} {info["unit"]}</TOTALOUTWARDQTY>
   <GSTAPPLICABLE>Applicable</GSTAPPLICABLE>
   <GSTTYPEOFSUPPLY>Goods</GSTTYPEOFSUPPLY>
   <GSTRATE>{info["gst"]}</GSTRATE>
   <HSNCODE>{info["hsn"]}</HSNCODE>
   <TAXABILITY>Taxable</TAXABILITY>
   <REORDERLEVEL>{random.randint(10, 100)}</REORDERLEVEL>
   <MINIMUMORDERQTY>{random.randint(1, 10)}</MINIMUMORDERQTY>
   <STANDARDCOST>{rate:.2f}</STANDARDCOST>
   <STANDARDPRICE>{mrp:.2f}</STANDARDPRICE>
   <HASMFGDATE>Yes</HASMFGDATE>
   <HASEXPIRYDATE>{"Yes" if product in ["Medicines", "Rice", "Wheat"] else "No"}</HASEXPIRYDATE>
   <BATCHESWITHMFG>Yes</BATCHESWITHMFG>
   <GODOWNNAME>Main Godown</GODOWNNAME>
   <BATCHALLOCATIONS.LIST>
    <BATCHNAME>Batch-{random_date()[:6]}-{random.randint(100, 999)}</BATCHNAME>
    <GODOWNNAME>Main Godown</GODOWNNAME>
    <OPENINGBALANCE>{opening_qty:.2f} {info["unit"]}</OPENINGBALANCE>
    <OPENINGRATE>{rate * 0.95:.2f}</OPENINGRATE>
    <OPENINGVALUE>{opening_qty * rate * 0.95:.2f}</OPENINGVALUE>
    <MFDON>{random_date(2023, 2023)}</MFDON>
    <EXPIRYPERIOD>365 Days</EXPIRYPERIOD>
   </BATCHALLOCATIONS.LIST>
  </STOCKITEM>
'''
    return xml


def generate_godown_xml():
    """Generate godown/warehouse master"""
    godowns = [
        ("Main Godown", "", "Mumbai"),
        ("Branch Godown", "Main Godown", "Delhi"),
        ("Factory Store", "Main Godown", "Pune"),
        ("Finished Goods", "Main Godown", "Mumbai"),
        ("Raw Materials", "Main Godown", "Mumbai"),
        ("Work in Progress", "Factory Store", "Pune"),
    ]
    
    xml = ""
    for name, parent, city in godowns:
        xml += f'''  <GODOWN NAME="{name}">
   <NAME>{name}</NAME>
   <PARENT>{parent}</PARENT>
   <ADDRESS>{city}</ADDRESS>
   <ISEXTERNAL>No</ISEXTERNAL>
  </GODOWN>
'''
    return xml


def generate_cost_centre_xml():
    """Generate cost centres"""
    centres = [
        ("Head Office", ""),
        ("Mumbai Office", "Head Office"),
        ("Delhi Office", "Head Office"),
        ("Production Dept", ""),
        ("Sales Dept", ""),
        ("Marketing Dept", ""),
        ("HR Dept", ""),
        ("Finance Dept", ""),
        ("IT Dept", ""),
        ("Admin Dept", ""),
    ]
    
    xml = ""
    for name, parent in centres:
        xml += f'''  <COSTCENTRE NAME="{name}">
   <NAME>{name}</NAME>
   <PARENT>{parent}</PARENT>
   <CATEGORY>Not Applicable</CATEGORY>
  </COSTCENTRE>
'''
    return xml


def generate_group_xml():
    """Generate all Tally standard groups"""
    groups = [
        ("Capital Account", "", "Liabilities", "No"),
        ("Current Assets", "", "Assets", "No"),
        ("Current Liabilities", "", "Liabilities", "No"),
        ("Direct Expenses", "", "Expenses", "No"),
        ("Direct Incomes", "", "Income", "Yes"),
        ("Fixed Assets", "", "Assets", "No"),
        ("Indirect Expenses", "", "Expenses", "No"),
        ("Indirect Incomes", "", "Income", "Yes"),
        ("Investments", "", "Assets", "No"),
        ("Loans (Liability)", "", "Liabilities", "No"),
        ("Misc. Expenses (ASSET)", "", "Assets", "No"),
        ("Purchase Accounts", "", "Expenses", "No"),
        ("Sales Accounts", "", "Income", "Yes"),
        ("Suspense A/c", "", "Assets", "No"),
        ("Bank Accounts", "Current Assets", "Assets", "No"),
        ("Bank OD A/c", "Loans (Liability)", "Liabilities", "No"),
        ("Cash-in-Hand", "Current Assets", "Assets", "No"),
        ("Deposits (Asset)", "Current Assets", "Assets", "No"),
        ("Duties & Taxes", "Current Liabilities", "Liabilities", "No"),
        ("Loans & Advances (Asset)", "Current Assets", "Assets", "No"),
        ("Provisions", "Current Liabilities", "Liabilities", "No"),
        ("Reserves & Surplus", "Capital Account", "Liabilities", "No"),
        ("Secured Loans", "Loans (Liability)", "Liabilities", "No"),
        ("Stock-in-Hand", "Current Assets", "Assets", "No"),
        ("Sundry Creditors", "Current Liabilities", "Liabilities", "No"),
        ("Sundry Debtors", "Current Assets", "Assets", "No"),
        ("Unsecured Loans", "Loans (Liability)", "Liabilities", "No"),
    ]
    
    xml = ""
    for name, parent, nature, is_revenue in groups:
        xml += f'''  <GROUP NAME="{name}">
   <NAME>{name}</NAME>
   <PARENT>{parent}</PARENT>
   <NATUREOFGROUP>{nature}</NATUREOFGROUP>
   <ISREVENUE>{is_revenue}</ISREVENUE>
   <AFFECTSGROSSPROFIT>{"Yes" if nature == "Income" or "Direct" in name else "No"}</AFFECTSGROSSPROFIT>
  </GROUP>
'''
    
    # Add product groups
    for product in PRODUCTS:
        xml += f'''  <GROUP NAME="{product} Group">
   <NAME>{product} Group</NAME>
   <PARENT>Stock-in-Hand</PARENT>
   <NATUREOFGROUP>Assets</NATUREOFGROUP>
   <ISREVENUE>No</ISREVENUE>
  </GROUP>
'''
    return xml


def main():
    print("=" * 70)
    print("COMPREHENSIVE TALLY XML DATA GENERATOR")
    print(f"Target Size: {TARGET_SIZE_MB} MB (1 GB)")
    print("=" * 70)
    
    output_file = "tally_backup_1gb.xml"
    
    with open(output_file, 'w', encoding='utf-8') as f:
        # XML Header
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
        f.write('    <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>\n')
        f.write('   </STATICVARIABLES>\n')
        f.write('  </DESC>\n')
        f.write('  <DATA>\n')
        f.write('   <TALLYMESSAGE>\n')
        
        # Company
        f.write(f'''    <COMPANY NAME="{COMPANY_NAME}">
     <NAME>{COMPANY_NAME}</NAME>
     <BASICCOMPANYFORMALNME>{COMPANY_NAME}</BASICCOMPANYFORMALNME>
     <ADDRESS>Tower A, 15th Floor, Bandra Kurla Complex</ADDRESS>
     <ADDRESS>Mumbai, Maharashtra - 400051</ADDRESS>
     <STATENAME>Maharashtra</STATENAME>
     <COUNTRYNAME>India</COUNTRYNAME>
     <PINCODE>400051</PINCODE>
     <PHONENUMBER>+91-22-12345678</PHONENUMBER>
     <MOBILENUMBER>+91-9876543210</MOBILENUMBER>
     <FAXNUMBER>+91-22-12345679</FAXNUMBER>
     <EMAIL>info@testenterprise.com</EMAIL>
     <WEBSITE>www.testenterprise.com</WEBSITE>
     <GSTIN>27AABCT1234A1ZY</GSTIN>
     <PANNO>AABCT1234A</PANNO>
     <TANNO>MUMT12345A</TANNO>
     <CINNO>U12345MH2020PTC123456</CINNO>
     <GSTREGISTRATIONTYPE>Regular</GSTREGISTRATIONTYPE>
     <STARTINGFROM>20230401</STARTINGFROM>
     <ENDINGAT>20240331</ENDINGAT>
     <BOOKSFROM>20200401</BOOKSFROM>
     <CURRENCYNAME>₹</CURRENCYNAME>
     <BASECURRENCYNAME>INR</BASECURRENCYNAME>
    </COMPANY>
''')
        
        # Groups
        print("\n📂 Generating Groups...")
        f.write(generate_group_xml())
        print("✅ Generated groups")
        
        # Godowns
        print("\n🏭 Generating Godowns...")
        f.write(generate_godown_xml())
        print("✅ Generated godowns")
        
        # Cost Centres
        print("\n📊 Generating Cost Centres...")
        f.write(generate_cost_centre_xml())
        print("✅ Generated cost centres")
        
        # Ledgers
        print("\n📋 Generating Ledgers with VARIED amounts...")
        ledger_types = [
            ("debtor", 15000),
            ("creditor", 15000),
            ("sales", 5000),
            ("purchase", 5000),
            ("expense", 2500),
            ("bank", 100),
            ("cash", 50),
            ("asset", 500),
            ("tax", 200),
        ]
        
        ledger_index = 0
        for ledger_type, count in ledger_types:
            print(f"   → {count} {ledger_type} ledgers...")
            for i in range(count):
                ledger_index += 1
                xml, _ = generate_ledger_xml(ledger_index, ledger_type)
                f.write(xml)
                
            current_size = os.path.getsize(output_file) / 1024 / 1024
            print(f"      Done ({current_size:.0f} MB)")
        
        print(f"✅ Generated {ledger_index:,} ledgers")
        
        # Stock Items
        print("\n📦 Generating Stock Items with Inventory...")
        for i in range(10000):
            f.write(generate_stock_item_xml(i + 1))
            if (i + 1) % 2000 == 0:
                current_size = os.path.getsize(output_file) / 1024 / 1024
                print(f"   → {i + 1} items ({current_size:.0f} MB)")
        print("✅ Generated 10,000 stock items")
        
        # Vouchers with GST
        print("\n📝 Generating Vouchers with GST & Inventory...")
        target_bytes = TARGET_SIZE_MB * 1024 * 1024
        voucher_count = 0
        
        while True:
            voucher_count += 1
            date = random_date(2023, 2024)
            f.write(generate_voucher_xml(voucher_count, date))
            
            if voucher_count % 25000 == 0:
                f.flush()
                current_size = os.path.getsize(output_file) / 1024 / 1024
                print(f"   → {voucher_count:,} vouchers ({current_size:.0f} MB)")
                
                if current_size >= target_bytes / 1024 / 1024 * 0.95:
                    break
            
            if voucher_count >= 400000:
                break
        
        print(f"✅ Generated {voucher_count:,} vouchers")
        
        # Close XML
        f.write('   </TALLYMESSAGE>\n')
        f.write('  </DATA>\n')
        f.write(' </BODY>\n')
        f.write('</ENVELOPE>\n')
    
    file_size = os.path.getsize(output_file) / 1024 / 1024
    
    print("\n" + "=" * 70)
    print("✅ COMPREHENSIVE XML GENERATION COMPLETE!")
    print("=" * 70)
    print(f"📁 File: {output_file}")
    print(f"📊 Size: {file_size:.0f} MB")
    print(f"📋 Ledgers: {ledger_index:,}")
    print(f"📦 Stock Items: 10,000")
    print(f"📝 Vouchers: {voucher_count:,}")
    print(f"🏭 Godowns: 6")
    print(f"📊 Cost Centres: 10")
    print("=" * 70)
    print("\n✨ Includes: GST, Inventory, Batches, Cost Centres, Varied Amounts")


if __name__ == "__main__":
    main()
