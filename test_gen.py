import random
import datetime
import uuid
import xml.etree.ElementTree as ET

# Configuration
OUTPUT_FILE = "test_tally_data.xml"
NUM_RECORDS = 10
START_DATE = datetime.date.today() - datetime.timedelta(days=365)
END_DATE = datetime.date.today()
COMPANY_NAME = "AI Tally Demo Corp"

# Constants for Realism
STATES = ["Maharashtra", "Gujarat"]
CITIES = {"Maharashtra": ["Mumbai"], "Gujarat": ["Ahmedabad"]}
STOCK_GROUPS = ["Electronics"]
STOCK_ITEMS_DATA = [("iPhone 15", "8517", 18, 70000, 80000, "Electronics")]
PARTY_NAMES = ["Alpha Traders"]

def generate_gstin(state_code="27"):
    return f"{state_code}ABCDE1234F1Z5"

def get_random_date(start, end):
    delta = end - start
    random_days = random.randrange(delta.days)
    return start + datetime.timedelta(days=random_days)

def format_date_tally(date_obj):
    return date_obj.strftime("%Y%m%d")

class TallyXMLGenerator:
    def __init__(self):
        self.root = ET.Element("ENVELOPE")
        self.header = ET.SubElement(self.root, "HEADER")
        self.version = ET.SubElement(self.header, "VERSION")
        self.version.text = "1"
        self.tallyrequest = ET.SubElement(self.header, "TALLYREQUEST")
        self.tallyrequest.text = "Import Data"
        self.body = ET.SubElement(self.root, "BODY")
        self.importdata = ET.SubElement(self.body, "IMPORTDATA")
        self.requestdesc = ET.SubElement(self.importdata, "REQUESTDESC")
        self.reportname = ET.SubElement(self.requestdesc, "REPORTNAME")
        self.reportname.text = "All Masters"
        self.staticvariables = ET.SubElement(self.requestdesc, "STATICVARIABLES")
        self.svcurrentcompany = ET.SubElement(self.staticvariables, "SVCURRENTCOMPANY")
        self.svcurrentcompany.text = COMPANY_NAME
        self.requestdata = ET.SubElement(self.importdata, "REQUESTDATA")
        self.ledgers = []
        self.stock_items = []
        
    def add_tally_message(self, element):
        msg = ET.SubElement(self.requestdata, "TALLYMESSAGE")
        msg.append(element)

    def create_unit(self, name, symbol):
        unit = ET.Element("UNIT", NAME=name, RESERVEDNAME="")
        ET.SubElement(unit, "NAME").text = name
        ET.SubElement(unit, "ORIGINALNAME").text = symbol
        ET.SubElement(unit, "ISSIMPLEUNIT").text = "Yes"
        self.add_tally_message(unit)

    def create_group(self, name, parent="Primary"):
        group = ET.Element("GROUP", NAME=name, RESERVEDNAME="")
        ET.SubElement(group, "NAME").text = name
        ET.SubElement(group, "PARENT").text = parent
        self.add_tally_message(group)

    def create_ledger(self, name, parent, state="Maharashtra", gstin=None, opening_balance=0):
        ledger = ET.Element("LEDGER", NAME=name, RESERVEDNAME="")
        ET.SubElement(ledger, "NAME").text = name
        ET.SubElement(ledger, "PARENT").text = parent
        ET.SubElement(ledger, "OPENINGBALANCE").text = str(opening_balance)
        ET.SubElement(ledger, "ISBILLWISEON").text = "Yes"
        if state: ET.SubElement(ledger, "LEDGERSTATENAME").text = state
        if gstin:
            ET.SubElement(ledger, "PARTYGSTIN").text = gstin
            ET.SubElement(ledger, "GSTREGISTRATIONTYPE").text = "Regular"
        self.add_tally_message(ledger)
        self.ledgers.append({"name": name, "state": state, "gstin": gstin})

    def create_stock_group(self, name, parent="Primary"):
        group = ET.Element("STOCKGROUP", NAME=name, RESERVEDNAME="")
        ET.SubElement(group, "NAME").text = name
        ET.SubElement(group, "PARENT").text = parent
        self.add_tally_message(group)

    def create_stock_item(self, name, parent, hsn, gst_rate, price_min, price_max):
        item = ET.Element("STOCKITEM", NAME=name, RESERVEDNAME="")
        ET.SubElement(item, "NAME").text = name
        ET.SubElement(item, "PARENT").text = parent
        ET.SubElement(item, "BASEUNITS").text = "Nos"
        ET.SubElement(item, "OPENINGBALANCE").text = f"{random.randint(10, 100)} Nos"
        ET.SubElement(item, "OPENINGRATE").text = f"{price_min}/Nos"
        ET.SubElement(item, "OPENINGVALUE").text = f"-{random.randint(10, 100) * price_min}"
        ET.SubElement(item, "GSTAPPLICABLE").text = "&#4; Applicable"
        ET.SubElement(item, "GSTTYPEOFSUPPLY").text = "Goods"
        ET.SubElement(item, "HSNCODE").text = hsn
        ET.SubElement(item, "IGSTRATE").text = str(gst_rate)
        self.add_tally_message(item)
        self.stock_items.append({"name": name, "rate": gst_rate, "price_range": (price_min, price_max)})

    def create_voucher(self, vtype, date, party_name, ledgers_entries, inventory_entries=None, narration=""):
        voucher = ET.Element("VOUCHER", VCHTYPE=vtype, ACTION="Create", OBJVIEW="Accounting Voucher View")
        ET.SubElement(voucher, "DATE").text = date
        ET.SubElement(voucher, "VOUCHERTYPENAME").text = vtype
        ET.SubElement(voucher, "VOUCHERNUMBER").text = str(uuid.uuid4())[:8].upper()
        ET.SubElement(voucher, "PARTYLEDGERNAME").text = party_name
        ET.SubElement(voucher, "NARRATION").text = narration
        ET.SubElement(voucher, "FBTPAYMENTTYPE").text = "Default"
        ET.SubElement(voucher, "PERSISTEDVIEW").text = "Accounting Voucher View"
        for entry in ledgers_entries:
            led_entry = ET.SubElement(voucher, "ALLLEDGERENTRIES.LIST")
            ET.SubElement(led_entry, "LEDGERNAME").text = entry['name']
            ET.SubElement(led_entry, "ISDEEMEDPOSITIVE").text = entry['is_deemed_positive']
            ET.SubElement(led_entry, "AMOUNT").text = str(entry['amount'])
        if inventory_entries:
            for entry in inventory_entries:
                inv_entry = ET.SubElement(voucher, "ALLINVENTORYENTRIES.LIST")
                ET.SubElement(inv_entry, "STOCKITEMNAME").text = entry['name']
                ET.SubElement(inv_entry, "ISDEEMEDPOSITIVE").text = entry['is_deemed_positive']
                ET.SubElement(inv_entry, "RATE").text = f"{entry['rate']}/Nos"
                ET.SubElement(inv_entry, "AMOUNT").text = str(entry['amount'])
                ET.SubElement(inv_entry, "ACTUALQTY").text = f" {entry['qty']} Nos"
                ET.SubElement(inv_entry, "BILLEDQTY").text = f" {entry['qty']} Nos"
                acc_alloc = ET.SubElement(inv_entry, "ACCOUNTINGALLOCATIONS.LIST")
                ET.SubElement(acc_alloc, "LEDGERNAME").text = entry['ledger']
                ET.SubElement(acc_alloc, "ISDEEMEDPOSITIVE").text = entry['is_deemed_positive']
                ET.SubElement(acc_alloc, "AMOUNT").text = str(entry['amount'])
        self.add_tally_message(voucher)

    def generate_data(self):
        print("Generating Masters...")
        self.create_unit("Nos", "Nos")
        self.create_ledger("Sales Account", "Sales Accounts", state=None)
        self.create_stock_group("Electronics")
        self.create_stock_item("iPhone 15", "Electronics", "8517", 18, 70000, 80000)
        self.create_ledger("Alpha Traders", "Sundry Debtors", "Maharashtra", generate_gstin())
        
        print(f"Generating {NUM_RECORDS} Transactions...")
        for i in range(NUM_RECORDS):
            date_obj = get_random_date(START_DATE, END_DATE)
            date_str = format_date_tally(date_obj)
            self.create_voucher("Sales", date_str, "Alpha Traders", [{"name": "Alpha Traders", "is_deemed_positive": "Yes", "amount": -100}], [{"name": "iPhone 15", "is_deemed_positive": "No", "rate": 100, "qty": 1, "amount": 100, "ledger": "Sales Account"}])

    def save_xml(self):
        print(f"Saving to {OUTPUT_FILE}...")
        tree = ET.ElementTree(self.root)
        tree.write(OUTPUT_FILE, encoding="utf-8", xml_declaration=True)
        print("Done!")

if __name__ == "__main__":
    generator = TallyXMLGenerator()
    generator.generate_data()
    generator.save_xml()
