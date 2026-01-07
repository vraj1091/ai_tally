#!/usr/bin/env python3
"""
Comprehensive Tally Data Generator
Generates 500,000+ entries with ALL Tally data types
- 0 errors, 0 exceptions
- Proper dates: 01-Apr-2024 to 31-Mar-2025
- All data types: Ledgers, Vouchers, Stock, GST, Tax, etc.
"""

import json
import random
import os
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
import string

# Configuration
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'backups')
FINANCIAL_YEAR_START = datetime(2024, 4, 1)
FINANCIAL_YEAR_END = datetime(2025, 3, 31)

# Indian Names for realistic data
FIRST_NAMES = [
    "Rajesh", "Sunil", "Amit", "Vikram", "Pradeep", "Anil", "Sanjay", "Ramesh", 
    "Mahesh", "Dinesh", "Rohit", "Ajay", "Vijay", "Manish", "Rakesh", "Pankaj",
    "Deepak", "Ashok", "Suresh", "Mukesh", "Nitin", "Gaurav", "Sachin", "Kapil",
    "Naveen", "Ravi", "Sandeep", "Abhishek", "Vishal", "Vivek", "Karan", "Arjun",
    "Priya", "Sunita", "Kavita", "Neha", "Pooja", "Anjali", "Shreya", "Divya",
    "Meena", "Seema", "Rekha", "Anita", "Geeta", "Shalini", "Rashmi", "Vandana"
]

LAST_NAMES = [
    "Sharma", "Verma", "Gupta", "Singh", "Kumar", "Agarwal", "Jain", "Patel",
    "Shah", "Mehta", "Reddy", "Rao", "Iyer", "Nair", "Menon", "Pillai",
    "Banerjee", "Mukherjee", "Chatterjee", "Das", "Bose", "Sen", "Ghosh", "Roy",
    "Chauhan", "Yadav", "Pandey", "Mishra", "Tiwari", "Dubey", "Srivastava", "Saxena",
    "Khanna", "Kapoor", "Malhotra", "Arora", "Bhatia", "Chopra", "Kohli", "Sethi"
]

COMPANY_SUFFIXES = [
    "Pvt Ltd", "Ltd", "LLP", "& Co", "Industries", "Enterprises", "Trading Co",
    "Solutions", "Services", "Corporation", "Group", "Associates", "Partners"
]

CITIES = [
    "Mumbai", "Delhi", "Bangalore", "Chennai", "Kolkata", "Hyderabad", "Pune",
    "Ahmedabad", "Jaipur", "Lucknow", "Surat", "Kanpur", "Nagpur", "Indore",
    "Thane", "Bhopal", "Visakhapatnam", "Patna", "Vadodara", "Ghaziabad"
]

STATES = [
    "Maharashtra", "Delhi", "Karnataka", "Tamil Nadu", "West Bengal", "Telangana",
    "Gujarat", "Rajasthan", "Uttar Pradesh", "Madhya Pradesh", "Punjab", "Haryana"
]

GST_STATES = {
    "Maharashtra": "27", "Delhi": "07", "Karnataka": "29", "Tamil Nadu": "33",
    "West Bengal": "19", "Telangana": "36", "Gujarat": "24", "Rajasthan": "08",
    "Uttar Pradesh": "09", "Madhya Pradesh": "23", "Punjab": "03", "Haryana": "06"
}

PRODUCT_CATEGORIES = [
    "Electronics", "Textiles", "Chemicals", "Machinery", "Food Products",
    "Pharmaceuticals", "Automotive Parts", "Building Materials", "Plastics",
    "Paper Products", "Metal Products", "Furniture", "Electrical Equipment",
    "Packaging Materials", "Industrial Supplies", "Office Supplies"
]

PRODUCT_ADJECTIVES = [
    "Premium", "Standard", "Economy", "Industrial", "Commercial", "Heavy Duty",
    "Lightweight", "Compact", "Professional", "Advanced", "Basic", "Deluxe"
]

UNITS = ["Nos", "Pcs", "Kg", "Gm", "Ltr", "Mtr", "Box", "Carton", "Set", "Pair", "Dozen", "Quintal"]

GST_RATES = [0, 5, 12, 18, 28]

def generate_gstin(state_code):
    """Generate valid GSTIN format"""
    pan = ''.join(random.choices(string.ascii_uppercase, k=5)) + \
          ''.join(random.choices(string.digits, k=4)) + \
          random.choice(string.ascii_uppercase)
    entity = str(random.randint(1, 9))
    check = random.choice(string.ascii_uppercase + string.digits)
    return f"{state_code}{pan}{entity}Z{check}"

def generate_pan():
    """Generate valid PAN format"""
    return ''.join(random.choices(string.ascii_uppercase, k=5)) + \
           ''.join(random.choices(string.digits, k=4)) + \
           random.choice(string.ascii_uppercase)

def random_date(start=FINANCIAL_YEAR_START, end=FINANCIAL_YEAR_END):
    """Generate random date within financial year"""
    delta = end - start
    random_days = random.randint(0, delta.days)
    return start + timedelta(days=random_days)

def format_date(dt):
    """Format date for Tally: YYYYMMDD"""
    return dt.strftime("%Y%m%d")

def format_display_date(dt):
    """Format date for display: DD-Mon-YYYY"""
    return dt.strftime("%d-%b-%Y")

def round_amount(amount):
    """Round to 2 decimal places"""
    return float(Decimal(str(amount)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))

def generate_company_name():
    """Generate realistic company name"""
    patterns = [
        lambda: f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)} {random.choice(COMPANY_SUFFIXES)}",
        lambda: f"{random.choice(LAST_NAMES)} & {random.choice(LAST_NAMES)} {random.choice(COMPANY_SUFFIXES)}",
        lambda: f"{random.choice(LAST_NAMES)} {random.choice(PRODUCT_CATEGORIES)} {random.choice(COMPANY_SUFFIXES)}",
        lambda: f"{random.choice(CITIES)} {random.choice(PRODUCT_CATEGORIES)} {random.choice(COMPANY_SUFFIXES)}",
    ]
    return random.choice(patterns)()

def generate_product_name(category):
    """Generate realistic product name"""
    adj = random.choice(PRODUCT_ADJECTIVES)
    suffix = random.choice(["Type A", "Type B", "Grade 1", "Grade 2", "Model X", "Model Y", "Series", "Plus", "Pro", ""])
    return f"{adj} {category} {suffix}".strip()

class TallyDataGenerator:
    def __init__(self, company_name="Large Scale Trading & Manufacturing Co Pvt Ltd"):
        self.company_name = company_name
        self.data = {
            "company": {},
            "ledgers": [],
            "stock_groups": [],
            "stock_items": [],
            "vouchers": [],
            "godowns": [],
            "cost_centers": [],
            "units": [],
            "currencies": [],
            "summary": {}
        }
        
        # Counters for unique IDs
        self.ledger_counter = 0
        self.voucher_counter = 0
        self.stock_counter = 0
        
        # Track created entities for references
        self.customer_ledgers = []
        self.supplier_ledgers = []
        self.stock_item_names = []
        self.expense_ledgers = []
        self.income_ledgers = []
        
        # Financial totals
        self.total_sales = 0
        self.total_purchases = 0
        self.total_receipts = 0
        self.total_payments = 0
        
        # Monthly tracking for charts
        self.monthly_sales = {i: 0 for i in range(1, 13)}
        self.monthly_purchases = {i: 0 for i in range(1, 13)}
        
    def generate_all(self, target_entries=500000):
        """Generate all Tally data"""
        print(f"🏢 Generating Tally data for: {self.company_name}")
        print(f"📊 Target entries: {target_entries:,}")
        print("=" * 60)
        
        # Calculate distribution
        # Vouchers are the bulk of data
        num_customers = min(25000, target_entries // 20)
        num_suppliers = min(20000, target_entries // 25)
        num_stock_items = min(15000, target_entries // 35)
        num_expense_ledgers = 500
        num_income_ledgers = 200
        num_vouchers = target_entries - num_customers - num_suppliers - num_stock_items - num_expense_ledgers - num_income_ledgers - 1000
        
        print(f"\n📋 Distribution Plan:")
        print(f"   Customers: {num_customers:,}")
        print(f"   Suppliers: {num_suppliers:,}")
        print(f"   Stock Items: {num_stock_items:,}")
        print(f"   Expense Ledgers: {num_expense_ledgers:,}")
        print(f"   Income Ledgers: {num_income_ledgers:,}")
        print(f"   Vouchers: {num_vouchers:,}")
        
        # 1. Generate Company
        print("\n1️⃣ Generating Company...")
        self._generate_company()
        
        # 2. Generate Units
        print("2️⃣ Generating Units...")
        self._generate_units()
        
        # 3. Generate Godowns
        print("3️⃣ Generating Godowns...")
        self._generate_godowns()
        
        # 4. Generate Cost Centers
        print("4️⃣ Generating Cost Centers...")
        self._generate_cost_centers()
        
        # 5. Generate Stock Groups
        print("5️⃣ Generating Stock Groups...")
        self._generate_stock_groups()
        
        # 6. Generate Stock Items
        print(f"6️⃣ Generating {num_stock_items:,} Stock Items...")
        self._generate_stock_items(num_stock_items)
        
        # 7. Generate Base Ledgers (Bank, Cash, Tax, etc.)
        print("7️⃣ Generating Base Ledgers...")
        self._generate_base_ledgers()
        
        # 8. Generate Customer Ledgers
        print(f"8️⃣ Generating {num_customers:,} Customer Ledgers...")
        self._generate_party_ledgers("Sundry Debtors", num_customers, is_customer=True)
        
        # 9. Generate Supplier Ledgers
        print(f"9️⃣ Generating {num_suppliers:,} Supplier Ledgers...")
        self._generate_party_ledgers("Sundry Creditors", num_suppliers, is_customer=False)
        
        # 10. Generate Expense Ledgers
        print(f"🔟 Generating {num_expense_ledgers:,} Expense Ledgers...")
        self._generate_expense_ledgers(num_expense_ledgers)
        
        # 11. Generate Income Ledgers
        print(f"1️⃣1️⃣ Generating {num_income_ledgers:,} Income Ledgers...")
        self._generate_income_ledgers(num_income_ledgers)
        
        # 12. Generate Vouchers
        print(f"1️⃣2️⃣ Generating {num_vouchers:,} Vouchers...")
        self._generate_vouchers(num_vouchers)
        
        # 13. Generate Summary
        print("1️⃣3️⃣ Generating Summary...")
        self._generate_summary()
        
        print("\n✅ Data generation complete!")
        print(f"   Total Ledgers: {len(self.data['ledgers']):,}")
        print(f"   Total Stock Items: {len(self.data['stock_items']):,}")
        print(f"   Total Vouchers: {len(self.data['vouchers']):,}")
        print(f"   Total Entries: {len(self.data['ledgers']) + len(self.data['stock_items']) + len(self.data['vouchers']):,}")
        
        return self.data
    
    def _generate_company(self):
        """Generate company master"""
        state = random.choice(list(GST_STATES.keys()))
        state_code = GST_STATES[state]
        
        self.data["company"] = {
            "name": self.company_name,
            "formal_name": self.company_name,
            "address": f"Plot No. {random.randint(1, 500)}, Industrial Area, Phase-{random.choice(['I', 'II', 'III'])}",
            "city": random.choice(CITIES),
            "state": state,
            "pincode": str(random.randint(100000, 999999)),
            "country": "India",
            "phone": f"+91-{random.randint(20, 99)}-{random.randint(10000000, 99999999)}",
            "email": f"accounts@{self.company_name.lower().replace(' ', '').replace('&', '')[:15]}.com",
            "website": f"www.{self.company_name.lower().replace(' ', '').replace('&', '')[:15]}.com",
            "pan": generate_pan(),
            "gstin": generate_gstin(state_code),
            "cin": f"U{random.randint(10000, 99999)}{state_code}2020PTC{random.randint(100000, 999999)}",
            "books_from": format_date(FINANCIAL_YEAR_START),
            "financial_year_from": "01-Apr-2024",
            "financial_year_to": "31-Mar-2025",
            "currency": "INR",
            "guid": f"company-{random.randint(100000, 999999)}"
        }
    
    def _generate_units(self):
        """Generate unit masters"""
        for unit in UNITS:
            self.data["units"].append({
                "name": unit,
                "symbol": unit,
                "formal_name": unit,
                "is_simple_unit": True,
                "number_of_decimal_places": 2 if unit in ["Kg", "Ltr", "Mtr"] else 0
            })
    
    def _generate_godowns(self):
        """Generate godown/warehouse masters"""
        godowns = [
            "Main Warehouse", "Branch Warehouse - North", "Branch Warehouse - South",
            "Branch Warehouse - East", "Branch Warehouse - West", "Factory Store",
            "Finished Goods Store", "Raw Material Store", "Packing Store", "Rejected Goods Store"
        ]
        for name in godowns:
            self.data["godowns"].append({
                "name": name,
                "address": f"Location {random.randint(1, 100)}",
                "is_internal": True,
                "has_no_space": False
            })
    
    def _generate_cost_centers(self):
        """Generate cost center masters"""
        cost_centers = [
            "Head Office", "North Region", "South Region", "East Region", "West Region",
            "Production", "Sales", "Marketing", "Admin", "HR", "Finance", "IT",
            "Research & Development", "Quality Control", "Logistics", "Procurement"
        ]
        for name in cost_centers:
            self.data["cost_centers"].append({
                "name": name,
                "parent": "",
                "category": "Primary Cost Category"
            })
    
    def _generate_stock_groups(self):
        """Generate stock group masters"""
        for category in PRODUCT_CATEGORIES:
            self.data["stock_groups"].append({
                "name": category,
                "parent": "Primary",
                "is_addable": True,
                "is_sub_ledger": False
            })
            # Sub-groups
            for sub in ["Raw Materials", "Finished Goods", "Work in Progress"]:
                self.data["stock_groups"].append({
                    "name": f"{category} - {sub}",
                    "parent": category,
                    "is_addable": True,
                    "is_sub_ledger": False
                })
    
    def _generate_stock_items(self, count):
        """Generate stock item masters"""
        items_per_category = count // len(PRODUCT_CATEGORIES)
        
        for category in PRODUCT_CATEGORIES:
            for i in range(items_per_category):
                self.stock_counter += 1
                
                name = f"{generate_product_name(category)} {self.stock_counter}"
                unit = random.choice(UNITS)
                gst_rate = random.choice(GST_RATES)
                
                # Realistic pricing
                cost_price = round_amount(random.uniform(50, 50000))
                margin = random.uniform(0.05, 0.40)  # 5% to 40% margin
                selling_price = round_amount(cost_price * (1 + margin))
                
                opening_qty = random.randint(0, 1000)
                opening_value = round_amount(opening_qty * cost_price)
                
                item = {
                    "name": name,
                    "guid": f"stock-{self.stock_counter}",
                    "parent": category,
                    "category": f"{category} - Finished Goods",
                    "base_units": unit,
                    "opening_balance": opening_qty,
                    "opening_value": opening_value,
                    "closing_balance": opening_qty,
                    "closing_value": opening_value,
                    "gst_applicable": True,
                    "gst_rate": gst_rate,
                    "hsn_code": f"{random.randint(1000, 9999)}{random.randint(10, 99)}",
                    "cost_price": cost_price,
                    "selling_price": selling_price,
                    "mrp": round_amount(selling_price * 1.1),
                    "godown": random.choice(self.data["godowns"])["name"] if self.data["godowns"] else "Main Warehouse",
                    "batch_name": f"BATCH-{random.randint(1000, 9999)}",
                    "mfg_date": format_date(random_date(datetime(2024, 1, 1), FINANCIAL_YEAR_START)),
                    "expiry_date": format_date(random_date(FINANCIAL_YEAR_END, datetime(2026, 3, 31))),
                    "reorder_level": random.randint(10, 100),
                    "minimum_order_qty": random.randint(1, 10)
                }
                
                self.data["stock_items"].append(item)
                self.stock_item_names.append(name)
                
                if self.stock_counter % 1000 == 0:
                    print(f"   Generated {self.stock_counter:,} stock items...")
    
    def _generate_base_ledgers(self):
        """Generate base ledgers (Bank, Cash, Tax accounts, etc.)"""
        base_ledgers = [
            # Bank Accounts
            {"name": "HDFC Bank Current A/c", "parent": "Bank Accounts", "opening_balance": 5000000},
            {"name": "ICICI Bank Current A/c", "parent": "Bank Accounts", "opening_balance": 3000000},
            {"name": "State Bank of India", "parent": "Bank Accounts", "opening_balance": 2500000},
            {"name": "Axis Bank Current A/c", "parent": "Bank Accounts", "opening_balance": 1500000},
            {"name": "Kotak Mahindra Bank", "parent": "Bank Accounts", "opening_balance": 1000000},
            
            # Cash
            {"name": "Cash in Hand", "parent": "Cash-in-Hand", "opening_balance": 500000},
            {"name": "Petty Cash", "parent": "Cash-in-Hand", "opening_balance": 50000},
            
            # GST Ledgers - CGST
            {"name": "CGST Input 5%", "parent": "Duties & Taxes", "opening_balance": 0, "is_gst": True, "gst_rate": 5},
            {"name": "CGST Input 12%", "parent": "Duties & Taxes", "opening_balance": 0, "is_gst": True, "gst_rate": 12},
            {"name": "CGST Input 18%", "parent": "Duties & Taxes", "opening_balance": 0, "is_gst": True, "gst_rate": 18},
            {"name": "CGST Input 28%", "parent": "Duties & Taxes", "opening_balance": 0, "is_gst": True, "gst_rate": 28},
            {"name": "CGST Output 5%", "parent": "Duties & Taxes", "opening_balance": 0, "is_gst": True, "gst_rate": 5},
            {"name": "CGST Output 12%", "parent": "Duties & Taxes", "opening_balance": 0, "is_gst": True, "gst_rate": 12},
            {"name": "CGST Output 18%", "parent": "Duties & Taxes", "opening_balance": 0, "is_gst": True, "gst_rate": 18},
            {"name": "CGST Output 28%", "parent": "Duties & Taxes", "opening_balance": 0, "is_gst": True, "gst_rate": 28},
            
            # GST Ledgers - SGST
            {"name": "SGST Input 5%", "parent": "Duties & Taxes", "opening_balance": 0, "is_gst": True, "gst_rate": 5},
            {"name": "SGST Input 12%", "parent": "Duties & Taxes", "opening_balance": 0, "is_gst": True, "gst_rate": 12},
            {"name": "SGST Input 18%", "parent": "Duties & Taxes", "opening_balance": 0, "is_gst": True, "gst_rate": 18},
            {"name": "SGST Input 28%", "parent": "Duties & Taxes", "opening_balance": 0, "is_gst": True, "gst_rate": 28},
            {"name": "SGST Output 5%", "parent": "Duties & Taxes", "opening_balance": 0, "is_gst": True, "gst_rate": 5},
            {"name": "SGST Output 12%", "parent": "Duties & Taxes", "opening_balance": 0, "is_gst": True, "gst_rate": 12},
            {"name": "SGST Output 18%", "parent": "Duties & Taxes", "opening_balance": 0, "is_gst": True, "gst_rate": 18},
            {"name": "SGST Output 28%", "parent": "Duties & Taxes", "opening_balance": 0, "is_gst": True, "gst_rate": 28},
            
            # GST Ledgers - IGST
            {"name": "IGST Input 5%", "parent": "Duties & Taxes", "opening_balance": 0, "is_gst": True, "gst_rate": 5},
            {"name": "IGST Input 12%", "parent": "Duties & Taxes", "opening_balance": 0, "is_gst": True, "gst_rate": 12},
            {"name": "IGST Input 18%", "parent": "Duties & Taxes", "opening_balance": 0, "is_gst": True, "gst_rate": 18},
            {"name": "IGST Input 28%", "parent": "Duties & Taxes", "opening_balance": 0, "is_gst": True, "gst_rate": 28},
            {"name": "IGST Output 5%", "parent": "Duties & Taxes", "opening_balance": 0, "is_gst": True, "gst_rate": 5},
            {"name": "IGST Output 12%", "parent": "Duties & Taxes", "opening_balance": 0, "is_gst": True, "gst_rate": 12},
            {"name": "IGST Output 18%", "parent": "Duties & Taxes", "opening_balance": 0, "is_gst": True, "gst_rate": 18},
            {"name": "IGST Output 28%", "parent": "Duties & Taxes", "opening_balance": 0, "is_gst": True, "gst_rate": 28},
            
            # TDS Ledgers
            {"name": "TDS Payable 194C", "parent": "Duties & Taxes", "opening_balance": 0},
            {"name": "TDS Payable 194J", "parent": "Duties & Taxes", "opening_balance": 0},
            {"name": "TDS Payable 194H", "parent": "Duties & Taxes", "opening_balance": 0},
            {"name": "TDS Payable 194I", "parent": "Duties & Taxes", "opening_balance": 0},
            {"name": "TDS Receivable", "parent": "Duties & Taxes", "opening_balance": 0},
            
            # Sales Accounts
            {"name": "Sales - Local", "parent": "Sales Accounts", "opening_balance": 0, "is_revenue": True},
            {"name": "Sales - Interstate", "parent": "Sales Accounts", "opening_balance": 0, "is_revenue": True},
            {"name": "Sales - Export", "parent": "Sales Accounts", "opening_balance": 0, "is_revenue": True},
            {"name": "Sales - Exempt", "parent": "Sales Accounts", "opening_balance": 0, "is_revenue": True},
            {"name": "Sales Returns", "parent": "Sales Accounts", "opening_balance": 0, "is_revenue": True},
            
            # Purchase Accounts
            {"name": "Purchase - Local", "parent": "Purchase Accounts", "opening_balance": 0, "is_expense": True},
            {"name": "Purchase - Interstate", "parent": "Purchase Accounts", "opening_balance": 0, "is_expense": True},
            {"name": "Purchase - Import", "parent": "Purchase Accounts", "opening_balance": 0, "is_expense": True},
            {"name": "Purchase - Exempt", "parent": "Purchase Accounts", "opening_balance": 0, "is_expense": True},
            {"name": "Purchase Returns", "parent": "Purchase Accounts", "opening_balance": 0, "is_expense": True},
            
            # Capital
            {"name": "Share Capital", "parent": "Capital Account", "opening_balance": -50000000},
            {"name": "Reserves & Surplus", "parent": "Reserves & Surplus", "opening_balance": -25000000},
            {"name": "Profit & Loss A/c", "parent": "Capital Account", "opening_balance": -15000000},
            
            # Fixed Assets
            {"name": "Land & Building", "parent": "Fixed Assets", "opening_balance": 30000000},
            {"name": "Plant & Machinery", "parent": "Fixed Assets", "opening_balance": 25000000},
            {"name": "Furniture & Fixtures", "parent": "Fixed Assets", "opening_balance": 5000000},
            {"name": "Computer & IT Equipment", "parent": "Fixed Assets", "opening_balance": 3000000},
            {"name": "Vehicles", "parent": "Fixed Assets", "opening_balance": 8000000},
            
            # Current Assets
            {"name": "Stock-in-Hand", "parent": "Stock-in-Hand", "opening_balance": 20000000},
            {"name": "Prepaid Expenses", "parent": "Current Assets", "opening_balance": 500000},
            {"name": "Advance to Suppliers", "parent": "Loans & Advances (Asset)", "opening_balance": 2000000},
            {"name": "Security Deposits", "parent": "Loans & Advances (Asset)", "opening_balance": 1500000},
            
            # Current Liabilities
            {"name": "Creditors for Expenses", "parent": "Current Liabilities", "opening_balance": -3000000},
            {"name": "Statutory Liabilities", "parent": "Current Liabilities", "opening_balance": -1500000},
            {"name": "Advance from Customers", "parent": "Current Liabilities", "opening_balance": -2500000},
            
            # Loans
            {"name": "Term Loan - HDFC", "parent": "Loans (Liability)", "opening_balance": -15000000},
            {"name": "Working Capital Loan", "parent": "Bank OD A/c", "opening_balance": -5000000},
            
            # Investments
            {"name": "Fixed Deposits", "parent": "Investments", "opening_balance": 10000000},
            {"name": "Mutual Funds", "parent": "Investments", "opening_balance": 5000000},
        ]
        
        for ledger in base_ledgers:
            self.ledger_counter += 1
            ledger["guid"] = f"ledger-{self.ledger_counter}"
            ledger["closing_balance"] = ledger.get("opening_balance", 0)
            self.data["ledgers"].append(ledger)
    
    def _generate_party_ledgers(self, parent, count, is_customer=True):
        """Generate customer or supplier ledgers"""
        prefix = "D" if is_customer else "C"
        
        for i in range(count):
            self.ledger_counter += 1
            
            state = random.choice(list(GST_STATES.keys()))
            state_code = GST_STATES[state]
            
            # Random opening balance
            if is_customer:
                opening = round_amount(random.uniform(0, 500000))  # Debit balance for debtors
            else:
                opening = -round_amount(random.uniform(0, 500000))  # Credit balance for creditors
            
            name = f"{generate_company_name()} {prefix}{self.ledger_counter}"
            
            ledger = {
                "name": name,
                "guid": f"ledger-{self.ledger_counter}",
                "parent": parent,
                "address": f"Address Line {random.randint(1, 999)}, {random.choice(CITIES)}",
                "state": state,
                "country": "India",
                "pincode": str(random.randint(100000, 999999)),
                "gstin": generate_gstin(state_code) if random.random() > 0.2 else "",  # 80% have GSTIN
                "pan": generate_pan(),
                "email": f"contact{self.ledger_counter}@example.com",
                "phone": f"+91-{random.randint(7000000000, 9999999999)}",
                "opening_balance": opening,
                "closing_balance": opening,
                "credit_limit": round_amount(random.uniform(100000, 5000000)) if is_customer else 0,
                "credit_days": random.choice([15, 30, 45, 60, 90]),
                "is_gst_registered": random.random() > 0.2,
                "gst_registration_type": random.choice(["Regular", "Composition", "Unregistered"]),
                "maintain_bill_by_bill": True
            }
            
            self.data["ledgers"].append(ledger)
            
            if is_customer:
                self.customer_ledgers.append(name)
            else:
                self.supplier_ledgers.append(name)
            
            if self.ledger_counter % 5000 == 0:
                print(f"   Generated {self.ledger_counter:,} ledgers...")
    
    def _generate_expense_ledgers(self, count):
        """Generate expense ledgers"""
        expense_types = [
            ("Salaries & Wages", "Indirect Expenses"),
            ("Rent Expense", "Indirect Expenses"),
            ("Electricity Charges", "Indirect Expenses"),
            ("Telephone & Internet", "Indirect Expenses"),
            ("Travelling Expenses", "Indirect Expenses"),
            ("Conveyance Expenses", "Indirect Expenses"),
            ("Printing & Stationery", "Indirect Expenses"),
            ("Postage & Courier", "Indirect Expenses"),
            ("Legal & Professional Fees", "Indirect Expenses"),
            ("Audit Fees", "Indirect Expenses"),
            ("Bank Charges", "Indirect Expenses"),
            ("Interest on Loan", "Indirect Expenses"),
            ("Depreciation", "Indirect Expenses"),
            ("Insurance Premium", "Indirect Expenses"),
            ("Repairs & Maintenance", "Indirect Expenses"),
            ("Advertisement Expenses", "Indirect Expenses"),
            ("Sales Promotion", "Indirect Expenses"),
            ("Commission Paid", "Indirect Expenses"),
            ("Discount Allowed", "Indirect Expenses"),
            ("Bad Debts Written Off", "Indirect Expenses"),
            ("Freight Outward", "Direct Expenses"),
            ("Packing Charges", "Direct Expenses"),
            ("Loading & Unloading", "Direct Expenses"),
            ("Factory Expenses", "Direct Expenses"),
            ("Power & Fuel", "Direct Expenses"),
            ("Consumables", "Direct Expenses"),
            ("Wages", "Direct Expenses"),
            ("Job Work Charges", "Direct Expenses"),
        ]
        
        for i in range(count):
            self.ledger_counter += 1
            exp_type, parent = random.choice(expense_types)
            
            name = f"{exp_type} - {random.choice(CITIES)}" if random.random() > 0.5 else f"{exp_type} {self.ledger_counter}"
            
            ledger = {
                "name": name,
                "guid": f"ledger-{self.ledger_counter}",
                "parent": parent,
                "opening_balance": 0,
                "closing_balance": 0,
                "is_expense": True
            }
            
            self.data["ledgers"].append(ledger)
            self.expense_ledgers.append(name)
    
    def _generate_income_ledgers(self, count):
        """Generate income ledgers"""
        income_types = [
            ("Interest Received", "Indirect Incomes"),
            ("Discount Received", "Indirect Incomes"),
            ("Commission Received", "Indirect Incomes"),
            ("Rent Received", "Indirect Incomes"),
            ("Dividend Received", "Indirect Incomes"),
            ("Profit on Sale of Assets", "Indirect Incomes"),
            ("Miscellaneous Income", "Indirect Incomes"),
            ("Service Charges", "Direct Incomes"),
            ("Job Work Income", "Direct Incomes"),
            ("Processing Charges", "Direct Incomes"),
            ("Scrap Sales", "Direct Incomes"),
        ]
        
        for i in range(count):
            self.ledger_counter += 1
            inc_type, parent = random.choice(income_types)
            
            name = f"{inc_type} {self.ledger_counter}"
            
            ledger = {
                "name": name,
                "guid": f"ledger-{self.ledger_counter}",
                "parent": parent,
                "opening_balance": 0,
                "closing_balance": 0,
                "is_revenue": True
            }
            
            self.data["ledgers"].append(ledger)
            self.income_ledgers.append(name)
    
    def _generate_vouchers(self, count):
        """Generate vouchers of all types"""
        # Voucher type distribution
        voucher_types = {
            "Sales": 0.30,
            "Purchase": 0.25,
            "Receipt": 0.15,
            "Payment": 0.15,
            "Journal": 0.08,
            "Contra": 0.02,
            "Credit Note": 0.025,
            "Debit Note": 0.025
        }
        
        for voucher_type, ratio in voucher_types.items():
            type_count = int(count * ratio)
            print(f"   Generating {type_count:,} {voucher_type} vouchers...")
            
            for i in range(type_count):
                self.voucher_counter += 1
                voucher_date = random_date()
                month_num = voucher_date.month if voucher_date.month >= 4 else voucher_date.month + 9
                if month_num > 12:
                    month_num -= 12
                
                if voucher_type == "Sales":
                    voucher = self._create_sales_voucher(voucher_date)
                    self.total_sales += voucher.get("amount", 0)
                    self.monthly_sales[month_num] = self.monthly_sales.get(month_num, 0) + voucher.get("amount", 0)
                elif voucher_type == "Purchase":
                    voucher = self._create_purchase_voucher(voucher_date)
                    self.total_purchases += voucher.get("amount", 0)
                    self.monthly_purchases[month_num] = self.monthly_purchases.get(month_num, 0) + voucher.get("amount", 0)
                elif voucher_type == "Receipt":
                    voucher = self._create_receipt_voucher(voucher_date)
                    self.total_receipts += voucher.get("amount", 0)
                elif voucher_type == "Payment":
                    voucher = self._create_payment_voucher(voucher_date)
                    self.total_payments += voucher.get("amount", 0)
                elif voucher_type == "Journal":
                    voucher = self._create_journal_voucher(voucher_date)
                elif voucher_type == "Contra":
                    voucher = self._create_contra_voucher(voucher_date)
                elif voucher_type == "Credit Note":
                    voucher = self._create_credit_note(voucher_date)
                elif voucher_type == "Debit Note":
                    voucher = self._create_debit_note(voucher_date)
                else:
                    continue
                
                self.data["vouchers"].append(voucher)
                
                if self.voucher_counter % 10000 == 0:
                    print(f"      Generated {self.voucher_counter:,} vouchers...")
    
    def _create_sales_voucher(self, date):
        """Create a sales voucher with GST"""
        customer = random.choice(self.customer_ledgers) if self.customer_ledgers else "Cash Sales"
        
        # Select random stock items
        num_items = random.randint(1, 5)
        items = random.sample(self.stock_item_names, min(num_items, len(self.stock_item_names))) if self.stock_item_names else []
        
        base_amount = round_amount(random.uniform(1000, 500000))
        gst_rate = random.choice(GST_RATES)
        gst_amount = round_amount(base_amount * gst_rate / 100)
        total_amount = round_amount(base_amount + gst_amount)
        
        # Determine if local or interstate
        is_local = random.random() > 0.3
        
        inventory_entries = []
        for item in items:
            qty = random.randint(1, 100)
            rate = round_amount(base_amount / (num_items * qty)) if num_items > 0 else base_amount
            inventory_entries.append({
                "stock_item": item,
                "quantity": qty,
                "rate": rate,
                "amount": round_amount(qty * rate),
                "godown": random.choice(self.data["godowns"])["name"] if self.data["godowns"] else "Main Warehouse"
            })
        
        ledger_entries = [
            {"ledger": customer, "amount": total_amount, "is_debit": True},
            {"ledger": "Sales - Local" if is_local else "Sales - Interstate", "amount": base_amount, "is_debit": False},
        ]
        
        if gst_rate > 0:
            if is_local:
                ledger_entries.append({"ledger": f"CGST Output {gst_rate}%", "amount": round_amount(gst_amount / 2), "is_debit": False})
                ledger_entries.append({"ledger": f"SGST Output {gst_rate}%", "amount": round_amount(gst_amount / 2), "is_debit": False})
            else:
                ledger_entries.append({"ledger": f"IGST Output {gst_rate}%", "amount": gst_amount, "is_debit": False})
        
        return {
            "voucher_number": f"SAL/{date.strftime('%y%m')}/{self.voucher_counter}",
            "guid": f"voucher-{self.voucher_counter}",
            "date": format_date(date),
            "display_date": format_display_date(date),
            "type": "Sales",
            "voucher_type": "Sales",
            "party_name": customer,
            "amount": total_amount,
            "base_amount": base_amount,
            "gst_rate": gst_rate,
            "gst_amount": gst_amount,
            "is_local": is_local,
            "narration": f"Sales to {customer} - Invoice {self.voucher_counter}",
            "ledger_entries": ledger_entries,
            "inventory_entries": inventory_entries,
            "is_invoice": True,
            "reference_number": f"INV-{self.voucher_counter}",
            "reference_date": format_date(date)
        }
    
    def _create_purchase_voucher(self, date):
        """Create a purchase voucher with GST"""
        supplier = random.choice(self.supplier_ledgers) if self.supplier_ledgers else "Cash Purchase"
        
        # Select random stock items
        num_items = random.randint(1, 5)
        items = random.sample(self.stock_item_names, min(num_items, len(self.stock_item_names))) if self.stock_item_names else []
        
        base_amount = round_amount(random.uniform(1000, 400000))
        gst_rate = random.choice(GST_RATES)
        gst_amount = round_amount(base_amount * gst_rate / 100)
        total_amount = round_amount(base_amount + gst_amount)
        
        is_local = random.random() > 0.3
        
        inventory_entries = []
        for item in items:
            qty = random.randint(1, 100)
            rate = round_amount(base_amount / (num_items * qty)) if num_items > 0 else base_amount
            inventory_entries.append({
                "stock_item": item,
                "quantity": qty,
                "rate": rate,
                "amount": round_amount(qty * rate),
                "godown": random.choice(self.data["godowns"])["name"] if self.data["godowns"] else "Main Warehouse"
            })
        
        ledger_entries = [
            {"ledger": supplier, "amount": total_amount, "is_debit": False},
            {"ledger": "Purchase - Local" if is_local else "Purchase - Interstate", "amount": base_amount, "is_debit": True},
        ]
        
        if gst_rate > 0:
            if is_local:
                ledger_entries.append({"ledger": f"CGST Input {gst_rate}%", "amount": round_amount(gst_amount / 2), "is_debit": True})
                ledger_entries.append({"ledger": f"SGST Input {gst_rate}%", "amount": round_amount(gst_amount / 2), "is_debit": True})
            else:
                ledger_entries.append({"ledger": f"IGST Input {gst_rate}%", "amount": gst_amount, "is_debit": True})
        
        return {
            "voucher_number": f"PUR/{date.strftime('%y%m')}/{self.voucher_counter}",
            "guid": f"voucher-{self.voucher_counter}",
            "date": format_date(date),
            "display_date": format_display_date(date),
            "type": "Purchase",
            "voucher_type": "Purchase",
            "party_name": supplier,
            "amount": total_amount,
            "base_amount": base_amount,
            "gst_rate": gst_rate,
            "gst_amount": gst_amount,
            "is_local": is_local,
            "narration": f"Purchase from {supplier} - Bill {self.voucher_counter}",
            "ledger_entries": ledger_entries,
            "inventory_entries": inventory_entries,
            "is_invoice": True,
            "supplier_invoice_no": f"SUP-{random.randint(10000, 99999)}",
            "supplier_invoice_date": format_date(date - timedelta(days=random.randint(0, 5)))
        }
    
    def _create_receipt_voucher(self, date):
        """Create a receipt voucher"""
        customer = random.choice(self.customer_ledgers) if self.customer_ledgers else "Cash"
        amount = round_amount(random.uniform(5000, 1000000))
        
        # Payment mode
        mode = random.choice(["Cash", "Cheque", "NEFT", "RTGS", "UPI"])
        bank = random.choice(["HDFC Bank Current A/c", "ICICI Bank Current A/c", "State Bank of India"])
        
        credit_ledger = "Cash in Hand" if mode == "Cash" else bank
        
        return {
            "voucher_number": f"REC/{date.strftime('%y%m')}/{self.voucher_counter}",
            "guid": f"voucher-{self.voucher_counter}",
            "date": format_date(date),
            "display_date": format_display_date(date),
            "type": "Receipt",
            "voucher_type": "Receipt",
            "party_name": customer,
            "amount": amount,
            "payment_mode": mode,
            "narration": f"Receipt from {customer} via {mode}",
            "ledger_entries": [
                {"ledger": credit_ledger, "amount": amount, "is_debit": True},
                {"ledger": customer, "amount": amount, "is_debit": False}
            ],
            "cheque_number": f"{random.randint(100000, 999999)}" if mode == "Cheque" else "",
            "cheque_date": format_date(date) if mode == "Cheque" else "",
            "bank_name": bank if mode != "Cash" else ""
        }
    
    def _create_payment_voucher(self, date):
        """Create a payment voucher"""
        # 70% to suppliers, 30% to expenses
        if random.random() > 0.3 and self.supplier_ledgers:
            party = random.choice(self.supplier_ledgers)
            is_expense = False
        else:
            party = random.choice(self.expense_ledgers) if self.expense_ledgers else "Miscellaneous Expenses"
            is_expense = True
        
        amount = round_amount(random.uniform(1000, 500000))
        
        mode = random.choice(["Cash", "Cheque", "NEFT", "RTGS", "UPI"])
        bank = random.choice(["HDFC Bank Current A/c", "ICICI Bank Current A/c", "State Bank of India"])
        
        debit_ledger = "Cash in Hand" if mode == "Cash" else bank
        
        return {
            "voucher_number": f"PAY/{date.strftime('%y%m')}/{self.voucher_counter}",
            "guid": f"voucher-{self.voucher_counter}",
            "date": format_date(date),
            "display_date": format_display_date(date),
            "type": "Payment",
            "voucher_type": "Payment",
            "party_name": party,
            "amount": amount,
            "payment_mode": mode,
            "is_expense": is_expense,
            "narration": f"Payment to {party} via {mode}",
            "ledger_entries": [
                {"ledger": party, "amount": amount, "is_debit": True},
                {"ledger": debit_ledger, "amount": amount, "is_debit": False}
            ],
            "cheque_number": f"{random.randint(100000, 999999)}" if mode == "Cheque" else "",
            "cheque_date": format_date(date) if mode == "Cheque" else "",
            "bank_name": bank if mode != "Cash" else ""
        }
    
    def _create_journal_voucher(self, date):
        """Create a journal voucher"""
        amount = round_amount(random.uniform(1000, 100000))
        
        # Various journal types
        journal_types = [
            ("Depreciation Entry", "Depreciation", "Plant & Machinery"),
            ("Salary Provision", "Salaries & Wages - Mumbai" if self.expense_ledgers else "Salaries & Wages", "Creditors for Expenses"),
            ("Interest Provision", "Interest on Loan", "Statutory Liabilities"),
            ("TDS Entry", "TDS Receivable", "TDS Payable 194C"),
        ]
        
        j_type, debit_ledger, credit_ledger = random.choice(journal_types)
        
        # Use expense ledgers if available
        if self.expense_ledgers and "Salary" in j_type:
            debit_ledger = random.choice([e for e in self.expense_ledgers if "Salar" in e] or self.expense_ledgers[:1])[0] if isinstance(self.expense_ledgers[0], list) else random.choice([e for e in self.expense_ledgers if "Salar" in e] or [self.expense_ledgers[0]])
        
        return {
            "voucher_number": f"JRN/{date.strftime('%y%m')}/{self.voucher_counter}",
            "guid": f"voucher-{self.voucher_counter}",
            "date": format_date(date),
            "display_date": format_display_date(date),
            "type": "Journal",
            "voucher_type": "Journal",
            "amount": amount,
            "narration": f"{j_type} for {date.strftime('%B %Y')}",
            "ledger_entries": [
                {"ledger": debit_ledger, "amount": amount, "is_debit": True},
                {"ledger": credit_ledger, "amount": amount, "is_debit": False}
            ]
        }
    
    def _create_contra_voucher(self, date):
        """Create a contra voucher (cash to bank or vice versa)"""
        amount = round_amount(random.uniform(10000, 500000))
        
        banks = ["HDFC Bank Current A/c", "ICICI Bank Current A/c", "State Bank of India", "Axis Bank Current A/c"]
        
        # Cash deposit or withdrawal
        is_deposit = random.random() > 0.5
        bank = random.choice(banks)
        
        if is_deposit:
            debit_ledger = bank
            credit_ledger = "Cash in Hand"
            narration = f"Cash deposited to {bank}"
        else:
            debit_ledger = "Cash in Hand"
            credit_ledger = bank
            narration = f"Cash withdrawn from {bank}"
        
        return {
            "voucher_number": f"CON/{date.strftime('%y%m')}/{self.voucher_counter}",
            "guid": f"voucher-{self.voucher_counter}",
            "date": format_date(date),
            "display_date": format_display_date(date),
            "type": "Contra",
            "voucher_type": "Contra",
            "amount": amount,
            "is_deposit": is_deposit,
            "narration": narration,
            "ledger_entries": [
                {"ledger": debit_ledger, "amount": amount, "is_debit": True},
                {"ledger": credit_ledger, "amount": amount, "is_debit": False}
            ]
        }
    
    def _create_credit_note(self, date):
        """Create a credit note (sales return)"""
        customer = random.choice(self.customer_ledgers) if self.customer_ledgers else "Cash"
        
        base_amount = round_amount(random.uniform(500, 50000))
        gst_rate = random.choice(GST_RATES)
        gst_amount = round_amount(base_amount * gst_rate / 100)
        total_amount = round_amount(base_amount + gst_amount)
        
        is_local = random.random() > 0.3
        
        ledger_entries = [
            {"ledger": customer, "amount": total_amount, "is_debit": False},
            {"ledger": "Sales Returns", "amount": base_amount, "is_debit": True},
        ]
        
        if gst_rate > 0:
            if is_local:
                ledger_entries.append({"ledger": f"CGST Output {gst_rate}%", "amount": round_amount(gst_amount / 2), "is_debit": True})
                ledger_entries.append({"ledger": f"SGST Output {gst_rate}%", "amount": round_amount(gst_amount / 2), "is_debit": True})
            else:
                ledger_entries.append({"ledger": f"IGST Output {gst_rate}%", "amount": gst_amount, "is_debit": True})
        
        return {
            "voucher_number": f"CRN/{date.strftime('%y%m')}/{self.voucher_counter}",
            "guid": f"voucher-{self.voucher_counter}",
            "date": format_date(date),
            "display_date": format_display_date(date),
            "type": "Credit Note",
            "voucher_type": "Credit Note",
            "party_name": customer,
            "amount": total_amount,
            "base_amount": base_amount,
            "gst_rate": gst_rate,
            "gst_amount": gst_amount,
            "narration": f"Sales return from {customer}",
            "ledger_entries": ledger_entries,
            "original_invoice_no": f"SAL/{date.strftime('%y%m')}/{random.randint(1, self.voucher_counter)}"
        }
    
    def _create_debit_note(self, date):
        """Create a debit note (purchase return)"""
        supplier = random.choice(self.supplier_ledgers) if self.supplier_ledgers else "Cash"
        
        base_amount = round_amount(random.uniform(500, 50000))
        gst_rate = random.choice(GST_RATES)
        gst_amount = round_amount(base_amount * gst_rate / 100)
        total_amount = round_amount(base_amount + gst_amount)
        
        is_local = random.random() > 0.3
        
        ledger_entries = [
            {"ledger": supplier, "amount": total_amount, "is_debit": True},
            {"ledger": "Purchase Returns", "amount": base_amount, "is_debit": False},
        ]
        
        if gst_rate > 0:
            if is_local:
                ledger_entries.append({"ledger": f"CGST Input {gst_rate}%", "amount": round_amount(gst_amount / 2), "is_debit": False})
                ledger_entries.append({"ledger": f"SGST Input {gst_rate}%", "amount": round_amount(gst_amount / 2), "is_debit": False})
            else:
                ledger_entries.append({"ledger": f"IGST Input {gst_rate}%", "amount": gst_amount, "is_debit": False})
        
        return {
            "voucher_number": f"DBN/{date.strftime('%y%m')}/{self.voucher_counter}",
            "guid": f"voucher-{self.voucher_counter}",
            "date": format_date(date),
            "display_date": format_display_date(date),
            "type": "Debit Note",
            "voucher_type": "Debit Note",
            "party_name": supplier,
            "amount": total_amount,
            "base_amount": base_amount,
            "gst_rate": gst_rate,
            "gst_amount": gst_amount,
            "narration": f"Purchase return to {supplier}",
            "ledger_entries": ledger_entries,
            "original_invoice_no": f"PUR/{date.strftime('%y%m')}/{random.randint(1, self.voucher_counter)}"
        }
    
    def _generate_summary(self):
        """Generate financial summary"""
        # Calculate from vouchers
        total_revenue = sum(v.get("amount", 0) for v in self.data["vouchers"] if v.get("type") == "Sales")
        total_expense = sum(v.get("amount", 0) for v in self.data["vouchers"] if v.get("type") == "Purchase")
        
        # Convert monthly data to list format for charts
        monthly_sales_list = []
        monthly_purchases_list = []
        
        months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"]
        for i, month in enumerate(months, 1):
            monthly_sales_list.append({
                "month": month,
                "value": round_amount(self.monthly_sales.get(i, 0))
            })
            monthly_purchases_list.append({
                "month": month,
                "value": round_amount(self.monthly_purchases.get(i, 0))
            })
        
        # Calculate assets and liabilities from ledgers
        total_assets = sum(l.get("closing_balance", 0) for l in self.data["ledgers"] 
                         if l.get("parent") in ["Bank Accounts", "Cash-in-Hand", "Fixed Assets", 
                                                "Current Assets", "Investments", "Stock-in-Hand",
                                                "Loans & Advances (Asset)"])
        
        total_liabilities = abs(sum(l.get("closing_balance", 0) for l in self.data["ledgers"]
                                   if l.get("parent") in ["Current Liabilities", "Loans (Liability)", 
                                                          "Bank OD A/c", "Duties & Taxes"]))
        
        total_equity = abs(sum(l.get("closing_balance", 0) for l in self.data["ledgers"]
                              if l.get("parent") in ["Capital Account", "Reserves & Surplus"]))
        
        self.data["summary"] = {
            "company_name": self.company_name,
            "financial_year": "2024-2025",
            "from_date": "01-Apr-2024",
            "to_date": "31-Mar-2025",
            "total_revenue": round_amount(total_revenue),
            "total_expense": round_amount(total_expense),
            "net_profit": round_amount(total_revenue - total_expense),
            "profit_margin": round_amount((total_revenue - total_expense) / total_revenue * 100) if total_revenue > 0 else 0,
            "total_assets": round_amount(total_assets),
            "total_liabilities": round_amount(total_liabilities),
            "total_equity": round_amount(total_equity),
            "total_sales": round_amount(self.total_sales),
            "total_purchases": round_amount(self.total_purchases),
            "total_receipts": round_amount(self.total_receipts),
            "total_payments": round_amount(self.total_payments),
            "total_customers": len(self.customer_ledgers),
            "total_suppliers": len(self.supplier_ledgers),
            "total_stock_items": len(self.stock_item_names),
            "total_ledgers": len(self.data["ledgers"]),
            "total_vouchers": len(self.data["vouchers"]),
            "monthly_sales": monthly_sales_list,
            "monthly_purchases": monthly_purchases_list,
            "generated_at": datetime.now().isoformat()
        }
    
    def save_to_json(self, filename=None):
        """Save data to JSON file"""
        if filename is None:
            filename = f"tally_backup_{self.company_name.replace(' ', '_')[:30]}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        # Ensure output directory exists
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        filepath = os.path.join(OUTPUT_DIR, filename)
        
        print(f"\n💾 Saving to {filepath}...")
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(self.data, f, indent=2, ensure_ascii=False)
        
        # Get file size
        file_size = os.path.getsize(filepath)
        size_mb = file_size / (1024 * 1024)
        size_gb = file_size / (1024 * 1024 * 1024)
        
        print(f"✅ Saved successfully!")
        print(f"   File size: {size_mb:.2f} MB ({size_gb:.2f} GB)")
        print(f"   Location: {filepath}")
        
        return filepath


def main():
    print("=" * 70)
    print("🏭 TALLY DATA GENERATOR - Large Scale (1,000,000+ entries)")
    print("=" * 70)
    print(f"📅 Financial Year: 01-Apr-2024 to 31-Mar-2025")
    print(f"🎯 Target: 1,000,000+ entries, ~1GB+ file")
    print("=" * 70)
    
    # Create generator
    generator = TallyDataGenerator(
        company_name="Large Scale Trading & Manufacturing Co Pvt Ltd"
    )
    
    # Generate data - 1 million entries for ~1GB file
    generator.generate_all(target_entries=1000000)
    
    # Save to JSON
    filepath = generator.save_to_json()
    
    print("\n" + "=" * 70)
    print("📊 SUMMARY")
    print("=" * 70)
    summary = generator.data["summary"]
    print(f"   Total Revenue: ₹{summary['total_revenue']:,.2f}")
    print(f"   Total Expense: ₹{summary['total_expense']:,.2f}")
    print(f"   Net Profit: ₹{summary['net_profit']:,.2f}")
    print(f"   Total Assets: ₹{summary['total_assets']:,.2f}")
    print(f"   Total Liabilities: ₹{summary['total_liabilities']:,.2f}")
    print(f"   Customers: {summary['total_customers']:,}")
    print(f"   Suppliers: {summary['total_suppliers']:,}")
    print(f"   Stock Items: {summary['total_stock_items']:,}")
    print(f"   Total Ledgers: {summary['total_ledgers']:,}")
    print(f"   Total Vouchers: {summary['total_vouchers']:,}")
    print("=" * 70)
    print("✅ DONE! Data file ready for import.")
    
    return filepath


if __name__ == "__main__":
    main()

