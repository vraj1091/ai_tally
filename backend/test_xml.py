import xml.etree.ElementTree as ET

xml = '''<ENVELOPE>
<BODY>
<DATA>
<COLLECTION>
<LEDGER NAME="ABC Corporation Ltd">
<PARENT TYPE="String">Sundry Debtors</PARENT>
<CLOSINGBALANCE TYPE="Amount"></CLOSINGBALANCE>
<OPENINGBALANCE TYPE="Amount">0.00</OPENINGBALANCE>
</LEDGER>
</COLLECTION>
</DATA>
</BODY>
</ENVELOPE>'''

root = ET.fromstring(xml)
for ledger in root.findall('.//LEDGER'):
    name = ledger.get('NAME')
    parent = ledger.find('PARENT')
    closing = ledger.find('CLOSINGBALANCE')
    opening = ledger.find('OPENINGBALANCE')
    
    print(f"Name attr: {name}")
    print(f"Parent element: {parent}")
    print(f"Parent text: {parent.text if parent is not None else 'None'}")
    print(f"Closing text: {closing.text if closing is not None else 'None'}")
    print(f"Opening text: {opening.text if opening is not None else 'None'}")

