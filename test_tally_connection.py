import requests

# Simple Tally request to get company list
xml_request = '''<ENVELOPE>
<HEADER>
<VERSION>1</VERSION>
<TALLYREQUEST>Export</TALLYREQUEST>
<TYPE>Collection</TYPE>
<ID>CompanyList</ID>
</HEADER>
<BODY>
<DESC>
<STATICVARIABLES>
<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
</STATICVARIABLES>
<TDL>
<TDLMESSAGE>
<COLLECTION NAME="CompanyList">
<TYPE>Company</TYPE>
<FETCH>NAME</FETCH>
</COLLECTION>
</TDLMESSAGE>
</TDL>
</DESC>
</BODY>
</ENVELOPE>'''

print("Testing Tally connection on localhost:9000...")
print("="*50)

try:
    response = requests.post(
        'http://localhost:9000', 
        data=xml_request, 
        headers={'Content-Type': 'application/xml'}, 
        timeout=10
    )
    print(f"Status Code: {response.status_code}")
    print(f"Response Length: {len(response.text)} chars")
    print("-"*50)
    if response.text:
        print("Response (first 1000 chars):")
        print(response.text[:1000])
    else:
        print("Empty response received")
except requests.exceptions.ConnectionError as e:
    print(f"CONNECTION ERROR: Cannot connect to Tally on port 9000")
    print(f"Details: {e}")
except requests.exceptions.Timeout:
    print("TIMEOUT: Tally did not respond in 10 seconds")
except Exception as e:
    print(f"ERROR: {type(e).__name__}: {e}")

