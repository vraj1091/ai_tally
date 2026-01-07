#!/usr/bin/env python3
"""
Tally Test Data Generator
Generates a comprehensive 1GB+ Tally backup file with all kinds of data

Usage:
    python generate_tally_test_data.py

Output:
    - tally_backup_1gb.json (1GB+ comprehensive test data)
"""

import json
import random
import string
from datetime import datetime, timedelta
from decimal import Decimal
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
    "Ahmedabad", "Jaipur", "Lucknow", "Kanpur", "Nagpur", "Indore", "Bhopal",
    "Visakhapatnam", "Patna", "Vadodara", "Ludhiana", "Agra", "Nashik"
]

PRODUCTS = [
    "Steel", "Iron", "Copper", "Aluminum", "Zinc", "Brass", "Bronze",
    "Cement", "Sand", "Gravel", "Bricks", "Tiles", "Glass", "Wood",
    "Cotton", "Silk", "Wool", "Polyester", "Nylon", "Leather",
    "Rice", "Wheat", "Sugar", "Salt", "Oil", "Ghee", "Spices",
    "Chemicals", "Fertilizers", "Pesticides", "Paints", "Lubricants",
    "Electronics", "Cables", "Wires", "Motors", "Pumps", "Valves",
    "Machinery", "Tools", "Equipment", "Vehicles", "Tyres", "Batteries"
]

EXPENSE_TYPES = [
    "Salary", "Wages", "Rent", "Electricity", "Telephone", "Internet",
    "Traveling", "Conveyance", "Printing", "Stationery", "Postage",
    "Advertisement", "Commission", "Insurance", "Repairs", "Maintenance",
    "Legal Fees", "Audit Fees", "Bank Charges", "Interest", "Depreciation",
    "Office Expenses", "Miscellaneous Expenses", "Transportation", "Freight"
]

TALLY_GROUPS = [
    # Primary Groups
    {"name": "Capital Account", "parent": "", "is_revenue": False, "nature": "Liabilities"},
    {"name": "Current Assets", "parent": "", "is_revenue": False, "nature": "Assets"},
    {"name": "Current Liabilities", "parent": "", "is_revenue": False, "nature": "Liabilities"},
    {"name": "Direct Expenses", "parent": "", "is_revenue": False, "nature": "Expenses"},
    {"name": "Direct Incomes", "parent": "", "is_revenue": True, "nature": "Income"},
    {"name": "Fixed Assets", "parent": "", "is_revenue": False, "nature": "Assets"},
    {"name": "Indirect Expenses", "parent": "", "is_revenue": False, "nature": "Expenses"},
    {"name": "Indirect Incomes", "parent": "", "is_revenue": True, "nature": "Income"},
    {"name": "Investments", "parent": "", "is_revenue": False, "nature": "Assets"},
    {"name": "Loans (Liability)", "parent": "", "is_revenue": False, "nature": "Liabilities"},
    {"name": "Misc. Expenses (ASSET)", "parent": "", "is_revenue": False, "nature": "Assets"},
    {"name": "Purchase Accounts", "parent": "", "is_revenue": False, "nature": "Expenses"},
    {"name": "Sales Accounts", "parent": "", "is_revenue": True, "nature": "Income"},
    {"name": "Suspense A/c", "parent": "", "is_revenue": False, "nature": "Assets"},
    # Sub Groups
    {"name": "Bank Accounts", "parent": "Current Assets", "is_revenue": False, "nature": "Assets"},
    {"name": "Bank OD A/c", "parent": "Loans (Liability)", "is_revenue": False, "nature": "Liabilities"},
    {"name": "Cash-in-Hand", "parent": "Current Assets", "is_revenue": False, "nature": "Assets"},
    {"name": "Deposits (Asset)", "parent": "Current Assets", "is_revenue": False, "nature": "Assets"},
    {"name": "Duties & Taxes", "parent": "Current Liabilities", "is_revenue": False, "nature": "Liabilities"},
    {"name": "Loans & Advances (Asset)", "parent": "Current Assets", "is_revenue": False, "nature": "Assets"},
    {"name": "Provisions", "parent": "Current Liabilities", "is_revenue": False, "nature": "Liabilities"},
    {"name": "Reserves & Surplus", "parent": "Capital Account", "is_revenue": False, "nature": "Liabilities"},
    {"name": "Secured Loans", "parent": "Loans (Liability)", "is_revenue": False, "nature": "Liabilities"},
    {"name": "Stock-in-Hand", "parent": "Current Assets", "is_revenue": False, "nature": "Assets"},
    {"name": "Sundry Creditors", "parent": "Current Liabilities", "is_revenue": False, "nature": "Liabilities"},
    {"name": "Sundry Debtors", "parent": "Current Assets", "is_revenue": False, "nature": "Assets"},
    {"name": "Unsecured Loans", "parent": "Loans (Liability)", "is_revenue": False, "nature": "Liabilities"},
]

VOUCHER_TYPES = [
    "Sales", "Purchase", "Receipt", "Payment", "Contra", "Journal",
    "Credit Note", "Debit Note", "Sales Order", "Purchase Order"
]


def random_name():
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"


def random_company_name():
    suffixes = ["Pvt Ltd", "Ltd", "LLP", "& Co", "Industries", "Enterprises", "Trading Co", "Solutions"]
    prefixes = ["Shree", "Sri", "New", "National", "Indian", "Global", "Modern", "Royal"]
    return f"{random.choice(prefixes)} {random.choice(LAST_NAMES)} {random.choice(suffixes)}"


def random_amount(min_val=1000, max_val=10000000):
    return round(random.uniform(min_val, max_val), 2)


def random_date(start_year=2020, end_year=2024):
    start = datetime(start_year, 1, 1)
    end = datetime(end_year, 12, 31)
    delta = end - start
    random_days = random.randint(0, delta.days)
    return (start + timedelta(days=random_days)).strftime("%Y%m%d")


def generate_ledger(index, group, ledger_type):
    """Generate a single ledger entry"""
    
    if ledger_type == "debtor":
        name = f"{random_name()} D{index}"
        parent = "Sundry Debtors"
        balance = random_amount(10000, 5000000)
        balance_type = "Dr"
    elif ledger_type == "creditor":
        name = f"{random_name()} C{index}"
        parent = "Sundry Creditors"
        balance = random_amount(10000, 5000000)
        balance_type = "Cr"
    elif ledger_type == "sales":
        product = random.choice(PRODUCTS)
        name = f"Sales {product} S{index}"
        parent = "Sales Accounts"
        balance = random_amount(100000, 50000000)
        balance_type = "Cr"
    elif ledger_type == "purchase":
        product = random.choice(PRODUCTS)
        name = f"Purchase {product} P{index}"
        parent = "Purchase Accounts"
        balance = random_amount(50000, 30000000)
        balance_type = "Dr"
    elif ledger_type == "expense":
        expense = random.choice(EXPENSE_TYPES)
        name = f"{expense} E{index}"
        parent = random.choice(["Direct Expenses", "Indirect Expenses"])
        balance = random_amount(10000, 1000000)
        balance_type = "Dr"
    elif ledger_type == "bank":
        banks = ["SBI", "HDFC", "ICICI", "Axis", "PNB", "BOB", "Kotak", "Yes Bank"]
        name = f"{random.choice(banks)} Bank A/c B{index}"
        parent = "Bank Accounts"
        balance = random_amount(100000, 50000000)
        balance_type = "Dr"
    elif ledger_type == "cash":
        name = f"Cash {random.choice(CITIES)} C{index}"
        parent = "Cash-in-Hand"
        balance = random_amount(10000, 500000)
        balance_type = "Dr"
    elif ledger_type == "asset":
        assets = ["Land", "Building", "Machinery", "Furniture", "Vehicle", "Computer", "Equipment"]
        name = f"{random.choice(assets)} A{index}"
        parent = "Fixed Assets"
        balance = random_amount(100000, 100000000)
        balance_type = "Dr"
    elif ledger_type == "loan":
        name = f"Loan from {random_name()} L{index}"
        parent = random.choice(["Secured Loans", "Unsecured Loans"])
        balance = random_amount(100000, 50000000)
        balance_type = "Cr"
    elif ledger_type == "capital":
        name = f"Capital - {random_name()} K{index}"
        parent = "Capital Account"
        balance = random_amount(1000000, 100000000)
        balance_type = "Cr"
    elif ledger_type == "tax":
        taxes = ["GST", "CGST", "SGST", "IGST", "TDS", "TCS", "Income Tax", "Professional Tax"]
        name = f"{random.choice(taxes)} T{index}"
        parent = "Duties & Taxes"
        balance = random_amount(10000, 5000000)
        balance_type = random.choice(["Dr", "Cr"])
    else:
        name = f"Ledger {index}"
        parent = random.choice([g["name"] for g in TALLY_GROUPS if g["parent"]])
        balance = random_amount()
        balance_type = random.choice(["Dr", "Cr"])
    
    city = random.choice(CITIES)
    
    return {
        "name": name,
        "parent": parent,
        "opening_balance": round(balance * 0.8, 2),
        "closing_balance": balance,
        "current_balance": balance,
        "balance": f"₹{balance:,.2f} {balance_type}",
        "address": f"{random.randint(1, 999)}, {random.choice(['Main Road', 'Industrial Area', 'Market Road', 'Station Road'])}, {city}",
        "city": city,
        "state": "Maharashtra" if city == "Mumbai" else "Delhi" if city == "Delhi" else "Karnataka",
        "pincode": str(random.randint(100000, 999999)),
        "phone": f"+91 {random.randint(7000000000, 9999999999)}",
        "email": f"{name.lower().replace(' ', '.')}@example.com",
        "gst_number": f"{random.randint(10, 37)}{random.choice(string.ascii_uppercase)}{random.choice(string.ascii_uppercase)}{random.choice(string.ascii_uppercase)}{random.choice(string.ascii_uppercase)}{random.randint(1000, 9999)}{random.choice(string.ascii_uppercase)}{random.randint(1, 9)}{random.choice(['Z', 'A', 'B', 'C'])}{random.randint(1, 9)}",
        "pan_number": f"{random.choice(string.ascii_uppercase)}{random.choice(string.ascii_uppercase)}{random.choice(string.ascii_uppercase)}{random.choice(string.ascii_uppercase)}{random.choice(string.ascii_uppercase)}{random.randint(1000, 9999)}{random.choice(string.ascii_uppercase)}",
        "credit_days": random.choice([0, 7, 15, 30, 45, 60, 90]),
        "credit_limit": random_amount(100000, 10000000),
        "is_revenue": parent in ["Sales Accounts", "Direct Incomes", "Indirect Incomes"],
        "is_expense": parent in ["Purchase Accounts", "Direct Expenses", "Indirect Expenses"],
        "created_date": random_date(2020, 2022),
        "modified_date": random_date(2023, 2024)
    }


def generate_voucher(index, ledgers):
    """Generate a single voucher entry"""
    voucher_type = random.choice(VOUCHER_TYPES)
    date = random_date(2023, 2024)
    
    # Select appropriate ledgers based on voucher type
    if voucher_type == "Sales":
        party_ledgers = [l for l in ledgers if l["parent"] == "Sundry Debtors"]
        sales_ledgers = [l for l in ledgers if l["parent"] == "Sales Accounts"]
        party = random.choice(party_ledgers) if party_ledgers else {"name": "Cash Sales"}
        sales = random.choice(sales_ledgers) if sales_ledgers else {"name": "Sales"}
        amount = random_amount(1000, 500000)
        narration = f"Sales to {party['name']}"
    elif voucher_type == "Purchase":
        party_ledgers = [l for l in ledgers if l["parent"] == "Sundry Creditors"]
        purchase_ledgers = [l for l in ledgers if l["parent"] == "Purchase Accounts"]
        party = random.choice(party_ledgers) if party_ledgers else {"name": "Cash Purchase"}
        purchase = random.choice(purchase_ledgers) if purchase_ledgers else {"name": "Purchase"}
        amount = random_amount(1000, 300000)
        narration = f"Purchase from {party['name']}"
    elif voucher_type == "Receipt":
        party_ledgers = [l for l in ledgers if l["parent"] == "Sundry Debtors"]
        bank_ledgers = [l for l in ledgers if l["parent"] == "Bank Accounts"]
        party = random.choice(party_ledgers) if party_ledgers else {"name": "Cash Receipt"}
        bank = random.choice(bank_ledgers) if bank_ledgers else {"name": "Cash"}
        amount = random_amount(5000, 1000000)
        narration = f"Receipt from {party['name']}"
    elif voucher_type == "Payment":
        party_ledgers = [l for l in ledgers if l["parent"] == "Sundry Creditors"]
        bank_ledgers = [l for l in ledgers if l["parent"] == "Bank Accounts"]
        party = random.choice(party_ledgers) if party_ledgers else {"name": "Cash Payment"}
        bank = random.choice(bank_ledgers) if bank_ledgers else {"name": "Cash"}
        amount = random_amount(5000, 1000000)
        narration = f"Payment to {party['name']}"
    else:
        amount = random_amount(1000, 100000)
        narration = f"{voucher_type} Entry - {random.choice(['Adjustment', 'Transfer', 'Correction'])}"
        party = {"name": random.choice([l["name"] for l in ledgers[:100]])}
    
    return {
        "voucher_number": f"{voucher_type[:3].upper()}/{date[:4]}/{index:06d}",
        "date": date,
        "voucher_type": voucher_type,
        "party_ledger_name": party["name"],
        "amount": amount,
        "narration": narration,
        "is_cancelled": random.random() < 0.02,  # 2% cancelled
        "is_optional": False,
        "reference_number": f"REF{random.randint(100000, 999999)}",
        "reference_date": date,
        "bill_number": f"BILL/{date[:6]}/{random.randint(1000, 9999)}",
        "due_date": (datetime.strptime(date, "%Y%m%d") + timedelta(days=random.choice([0, 7, 15, 30, 45, 60]))).strftime("%Y%m%d"),
        "cheque_number": f"{random.randint(100000, 999999)}" if voucher_type in ["Receipt", "Payment"] else None,
        "bank_name": random.choice(["SBI", "HDFC", "ICICI", "Axis"]) if voucher_type in ["Receipt", "Payment"] else None,
        "gst_details": {
            "gst_rate": random.choice([0, 5, 12, 18, 28]),
            "cgst": round(amount * 0.09, 2) if random.random() > 0.3 else 0,
            "sgst": round(amount * 0.09, 2) if random.random() > 0.3 else 0,
            "igst": round(amount * 0.18, 2) if random.random() > 0.7 else 0
        }
    }


def generate_stock_item(index):
    """Generate a single stock item"""
    product = random.choice(PRODUCTS)
    units = ["Kg", "Nos", "Pcs", "Ltrs", "Mtrs", "Box", "Carton", "Bags", "Tons"]
    unit = random.choice(units)
    rate = random_amount(10, 10000)
    qty = random.randint(10, 10000)
    
    return {
        "name": f"{product} - Grade {random.choice(['A', 'B', 'C', 'Premium', 'Standard'])} {index}",
        "parent": f"{product} Group",
        "category": product,
        "unit": unit,
        "opening_quantity": round(qty * 0.8, 2),
        "opening_rate": round(rate * 0.95, 2),
        "opening_value": round(qty * 0.8 * rate * 0.95, 2),
        "closing_quantity": qty,
        "closing_rate": rate,
        "closing_value": round(qty * rate, 2),
        "gst_rate": random.choice([0, 5, 12, 18, 28]),
        "hsn_code": f"{random.randint(1000, 9999)}",
        "reorder_level": random.randint(10, 100),
        "minimum_quantity": random.randint(1, 10),
        "batch_enabled": random.choice([True, False]),
        "expiry_enabled": random.choice([True, False])
    }


def generate_cost_center(index):
    """Generate a cost center"""
    departments = ["Production", "Sales", "Marketing", "HR", "Finance", "IT", "Admin", "R&D", "Quality", "Logistics"]
    locations = CITIES[:10]
    
    return {
        "name": f"{random.choice(departments)} - {random.choice(locations)} CC{index}",
        "parent": random.choice(["", "Head Office", "Branch Office"]),
        "category": random.choice(departments)
    }


def main():
    print("=" * 60)
    print("TALLY TEST DATA GENERATOR")
    print(f"Target Size: {TARGET_SIZE_MB} MB (1 GB)")
    print("=" * 60)
    
    # Initialize data structure
    data = {
        "company": {
            "name": COMPANY_NAME,
            "address": "123, Industrial Area, Mumbai",
            "state": "Maharashtra",
            "country": "India",
            "pincode": "400001",
            "phone": "+91 22 12345678",
            "email": "info@testenterprise.com",
            "gst_number": "27AABCT1234A1ZY",
            "pan_number": "AABCT1234A",
            "financial_year_from": "2023-04-01",
            "financial_year_to": "2024-03-31",
            "books_from": "2020-04-01"
        },
        "groups": TALLY_GROUPS,
        "ledgers": [],
        "vouchers": [],
        "stock_items": [],
        "cost_centers": []
    }
    
    current_size = 0
    target_bytes = TARGET_SIZE_MB * 1024 * 1024
    
    # Generate ledgers - distribution
    ledger_types = [
        ("debtor", 15000),      # 15,000 debtors
        ("creditor", 15000),    # 15,000 creditors
        ("sales", 5000),        # 5,000 sales accounts
        ("purchase", 5000),     # 5,000 purchase accounts
        ("expense", 2500),      # 2,500 expense accounts
        ("bank", 100),          # 100 bank accounts
        ("cash", 50),           # 50 cash accounts
        ("asset", 500),         # 500 fixed assets
        ("loan", 200),          # 200 loan accounts
        ("capital", 50),        # 50 capital accounts
        ("tax", 100)            # 100 tax accounts
    ]
    
    print("\n📊 Generating Ledgers...")
    ledger_index = 0
    for ledger_type, count in ledger_types:
        print(f"   Generating {count} {ledger_type} ledgers...")
        for i in range(count):
            ledger_index += 1
            ledger = generate_ledger(ledger_index, TALLY_GROUPS, ledger_type)
            data["ledgers"].append(ledger)
            
            if ledger_index % 5000 == 0:
                # Check size
                current_size = len(json.dumps(data))
                print(f"   Progress: {ledger_index} ledgers ({current_size / 1024 / 1024:.1f} MB)")
    
    print(f"✅ Generated {len(data['ledgers'])} ledgers")
    
    # Generate vouchers
    print("\n📝 Generating Vouchers...")
    voucher_count = 0
    target_vouchers = 500000  # 500,000 vouchers for 1GB
    
    while True:
        voucher_count += 1
        voucher = generate_voucher(voucher_count, data["ledgers"])
        data["vouchers"].append(voucher)
        
        if voucher_count % 50000 == 0:
            current_size = len(json.dumps(data))
            print(f"   Progress: {voucher_count} vouchers ({current_size / 1024 / 1024:.1f} MB)")
            
            if current_size >= target_bytes * 0.9:  # 90% of target
                break
        
        if voucher_count >= target_vouchers:
            break
    
    print(f"✅ Generated {len(data['vouchers'])} vouchers")
    
    # Generate stock items
    print("\n📦 Generating Stock Items...")
    for i in range(10000):  # 10,000 stock items
        data["stock_items"].append(generate_stock_item(i + 1))
    print(f"✅ Generated {len(data['stock_items'])} stock items")
    
    # Generate cost centers
    print("\n🏢 Generating Cost Centers...")
    for i in range(500):  # 500 cost centers
        data["cost_centers"].append(generate_cost_center(i + 1))
    print(f"✅ Generated {len(data['cost_centers'])} cost centers")
    
    # Calculate final summary
    print("\n📊 Calculating Summary...")
    total_revenue = sum(l["closing_balance"] for l in data["ledgers"] if l.get("is_revenue"))
    total_expense = sum(l["closing_balance"] for l in data["ledgers"] if l.get("is_expense"))
    
    data["summary"] = {
        "total_ledgers": len(data["ledgers"]),
        "total_vouchers": len(data["vouchers"]),
        "total_stock_items": len(data["stock_items"]),
        "total_cost_centers": len(data["cost_centers"]),
        "total_revenue": total_revenue,
        "total_expense": total_expense,
        "net_profit": total_revenue - total_expense,
        "total_debtors": sum(1 for l in data["ledgers"] if l["parent"] == "Sundry Debtors"),
        "total_creditors": sum(1 for l in data["ledgers"] if l["parent"] == "Sundry Creditors"),
        "generated_at": datetime.now().isoformat()
    }
    
    # Save to file
    output_file = "tally_backup_1gb.json"
    print(f"\n💾 Saving to {output_file}...")
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)
    
    file_size = os.path.getsize(output_file) / 1024 / 1024
    
    print("\n" + "=" * 60)
    print("✅ DATA GENERATION COMPLETE!")
    print("=" * 60)
    print(f"📁 Output File: {output_file}")
    print(f"📊 File Size: {file_size:.2f} MB")
    print(f"📋 Total Ledgers: {len(data['ledgers']):,}")
    print(f"📝 Total Vouchers: {len(data['vouchers']):,}")
    print(f"📦 Total Stock Items: {len(data['stock_items']):,}")
    print(f"🏢 Total Cost Centers: {len(data['cost_centers']):,}")
    print(f"💰 Total Revenue: ₹{total_revenue:,.2f}")
    print(f"💸 Total Expense: ₹{total_expense:,.2f}")
    print(f"📈 Net Profit: ₹{total_revenue - total_expense:,.2f}")
    print("=" * 60)
    
    return output_file


if __name__ == "__main__":
    main()

