"""
Quick Test Script to Check Tally Gateway
Run this to verify Tally Gateway is accessible
"""

import requests
import sys

def test_tally_gateway():
    print("=" * 60)
    print("TALLY GATEWAY DIAGNOSTIC TEST")
    print("=" * 60)
    
    url = "http://localhost:9000"
    print(f"\nTesting connection to: {url}")
    print("-" * 60)
    
    # Test 1: Basic connectivity
    print("\n[TEST 1] Checking if port 9000 is accessible...")
    try:
        response = requests.get(url, timeout=5)
        print(f"✓ SUCCESS! Port 9000 is accessible")
        print(f"  Status Code: {response.status_code}")
        print(f"  Response Length: {len(response.text)} characters")
        
        if len(response.text) > 0:
            print(f"  First 200 chars: {response.text[:200]}")
    except requests.exceptions.ConnectionError:
        print("✗ FAILED: Cannot connect to port 9000")
        print("\n  SOLUTION:")
        print("  1. Open Tally Prime")
        print("  2. Press F12 (Configure)")
        print("  3. Go to Advanced Configuration")
        print("  4. Enable 'Tally Gateway Server' or 'Tally.NET Server'")
        print("  5. Set Port to 9000")
        print("  6. Restart Tally")
        return False
    except requests.exceptions.Timeout:
        print("✗ FAILED: Connection timed out")
        print("  Tally might be frozen or very slow")
        return False
    except Exception as e:
        print(f"✗ ERROR: {e}")
        return False
    
    # Test 2: Try to get company list
    print("\n[TEST 2] Trying to fetch company list...")
    xml_request = """<ENVELOPE>
    <HEADER>
        <VERSION>1</VERSION>
        <TALLYREQUEST>Export</TALLYREQUEST>
        <TYPE>Collection</TYPE>
        <ID>Company List</ID>
    </HEADER>
    <BODY>
        <DESC>
            <STATICVARIABLES>
                <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
            </STATICVARIABLES>
            <TDL>
                <TDLMESSAGE>
                    <COLLECTION NAME="Company List">
                        <TYPE>Company</TYPE>
                    </COLLECTION>
                </TDLMESSAGE>
            </TDL>
        </DESC>
    </BODY>
</ENVELOPE>"""
    
    try:
        response = requests.post(
            url,
            data=xml_request.encode('utf-8'),
            headers={'Content-Type': 'application/xml'},
            timeout=10
        )
        
        if len(response.text) > 100:
            print("✓ SUCCESS! Tally Gateway is responding with data")
            print(f"  Response Length: {len(response.text)} characters")
            
            # Try to parse company names
            if "<COMPANY>" in response.text:
                import xml.etree.ElementTree as ET
                try:
                    root = ET.fromstring(response.text)
                    companies = root.findall(".//COMPANY")
                    print(f"  Companies found: {len(companies)}")
                    for i, company in enumerate(companies[:3], 1):
                        name = company.find("NAME")
                        if name is not None:
                            print(f"    {i}. {name.text}")
                except:
                    print("  (Could not parse company names)")
            
            print("\n" + "=" * 60)
            print("✓✓✓ ALL TESTS PASSED! Tally Gateway is working! ✓✓✓")
            print("=" * 60)
            print("\nYour AI Tally Assistant should now connect successfully!")
            return True
        else:
            print("✗ Tally responded but with empty/short data")
            print("  Make sure a company is OPEN in Tally")
            return False
            
    except Exception as e:
        print(f"✗ FAILED: {e}")
        return False

if __name__ == "__main__":
    print("\nMake sure:")
    print("1. Tally Prime is running")
    print("2. A company is open")
    print("3. Gateway is enabled\n")
    
    input("Press Enter to start test...")
    
    success = test_tally_gateway()
    
    if not success:
        print("\n" + "=" * 60)
        print("TROUBLESHOOTING GUIDE")
        print("=" * 60)
        print("\nCommon Issues:")
        print("\n1. Gateway Not Enabled:")
        print("   Solution: F12 → Advanced Config → Enable Tally Gateway")
        print("\n2. No Company Open:")
        print("   Solution: Open any company in Tally")
        print("\n3. Firewall Blocking:")
        print("   Solution: Allow Tally through Windows Firewall")
        print("\n4. Wrong Port:")
        print("   Solution: Check Tally settings show Port 9000")
        print("\n5. Tally Frozen:")
        print("   Solution: Restart Tally")
    
    print("\nPress Enter to exit...")
    input()

