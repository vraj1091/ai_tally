"""
Diagnostic script to check what data is in Tally
Run this to verify if Tally has data and what's being returned
"""

import requests
import xml.etree.ElementTree as ET

TALLY_URL = "http://localhost:9000"

def check_tally():
    print("=" * 60)
    print("TALLY DATA DIAGNOSTIC")
    print("=" * 60)
    
    # 1. Test connection
    print("\n1. Testing connection...")
    try:
        response = requests.post(TALLY_URL, data="<ENVELOPE></ENVELOPE>", timeout=5)
        print(f"   Connection: OK (Status {response.status_code})")
    except Exception as e:
        print(f"   Connection FAILED: {e}")
        print("\n   Make sure Tally is running with ODBC Server enabled on port 9000")
        return
    
    # 2. Get companies
    print("\n2. Fetching companies...")
    company_xml = """<ENVELOPE>
<HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
<BODY><EXPORTDATA><REQUESTDESC>
<REPORTNAME>List of Companies</REPORTNAME>
</REQUESTDESC></EXPORTDATA></BODY>
</ENVELOPE>"""
    
    try:
        response = requests.post(TALLY_URL, data=company_xml, timeout=10)
        print(f"   Response length: {len(response.text)} chars")
        
        # Parse companies
        companies = []
        try:
            root = ET.fromstring(response.text)
            for elem in root.iter():
                if 'COMPANY' in elem.tag.upper():
                    name = elem.get('NAME') or elem.text
                    if name:
                        companies.append(name)
        except:
            import re
            companies = list(set(re.findall(r'<SVCURRENTCOMPANY>([^<]+)</SVCURRENTCOMPANY>', response.text)))
            if not companies:
                companies = list(set(re.findall(r'NAME="([^"]+)"', response.text)))
        
        print(f"   Companies found: {len(companies)}")
        for c in companies[:10]:
            print(f"      - {c}")
        
        if not companies:
            print("   No companies found in Tally!")
            return
            
        company_name = companies[0]
        print(f"\n   Using company: {company_name}")
        
    except Exception as e:
        print(f"   Error getting companies: {e}")
        return
    
    # 3. Get ledgers
    print(f"\n3. Fetching ledgers for '{company_name}'...")
    ledger_xml = f"""<ENVELOPE>
<HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
<BODY><EXPORTDATA><REQUESTDESC>
<REPORTNAME>List of Ledgers</REPORTNAME>
<STATICVARIABLES><SVCURRENTCOMPANY>{company_name}</SVCURRENTCOMPANY></STATICVARIABLES>
</REQUESTDESC></EXPORTDATA></BODY>
</ENVELOPE>"""
    
    try:
        response = requests.post(TALLY_URL, data=ledger_xml.encode('utf-8'), timeout=30)
        print(f"   Response length: {len(response.text)} chars")
        
        # Parse ledgers
        ledgers = []
        try:
            root = ET.fromstring(response.text)
            for elem in root.iter():
                if 'LEDGER' in elem.tag.upper():
                    name = elem.get('NAME') or elem.findtext('NAME')
                    parent = elem.findtext('PARENT') or ''
                    balance = elem.findtext('CLOSINGBALANCE') or '0'
                    if name:
                        ledgers.append({
                            'name': name,
                            'parent': parent,
                            'balance': balance
                        })
        except Exception as e:
            print(f"   XML parse error: {e}")
            # Try regex
            import re
            names = re.findall(r'NAME="([^"]+)"', response.text)
            for n in names[:50]:
                ledgers.append({'name': n, 'parent': '', 'balance': '0'})
        
        print(f"   Ledgers found: {len(ledgers)}")
        
        # Show sample ledgers
        print("\n   Sample ledgers:")
        for l in ledgers[:10]:
            print(f"      - {l['name']}: {l['parent']} = {l['balance']}")
        
        # Analyze balances
        non_zero = [l for l in ledgers if l['balance'] != '0' and l['balance'] != '0.0']
        print(f"\n   Ledgers with non-zero balance: {len(non_zero)}")
        for l in non_zero[:10]:
            print(f"      - {l['name']}: {l['balance']}")
            
    except Exception as e:
        print(f"   Error getting ledgers: {e}")
        return
    
    # 4. Check for vouchers
    print(f"\n4. Checking voucher count...")
    voucher_xml = f"""<ENVELOPE>
<HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
<BODY><EXPORTDATA><REQUESTDESC>
<REPORTNAME>Voucher Register</REPORTNAME>
<STATICVARIABLES>
<SVCURRENTCOMPANY>{company_name}</SVCURRENTCOMPANY>
<SVFROMDATE>20240401</SVFROMDATE>
<SVTODATE>20250331</SVTODATE>
</STATICVARIABLES>
</REQUESTDESC></EXPORTDATA></BODY>
</ENVELOPE>"""
    
    try:
        response = requests.post(TALLY_URL, data=voucher_xml.encode('utf-8'), timeout=30)
        
        # Count vouchers
        import re
        voucher_count = len(re.findall(r'<VOUCHER', response.text))
        print(f"   Vouchers in response: {voucher_count}")
        
        if voucher_count == 0:
            print("\n   WARNING: No vouchers found!")
            print("   This explains why dashboards show 0 data.")
            print("   The import likely failed due to exceptions.")
        
    except Exception as e:
        print(f"   Error checking vouchers: {e}")
    
    print("\n" + "=" * 60)
    print("DIAGNOSIS COMPLETE")
    print("=" * 60)
    
    if len(non_zero) == 0:
        print("\nPROBLEM: No ledgers have closing balances!")
        print("This means either:")
        print("1. No vouchers were successfully imported")
        print("2. The import had too many exceptions")
        print("\nSOLUTION: Use the clean import file that was generated:")
        print("   tally_2lakh_v2.xml")


if __name__ == "__main__":
    check_tally()

