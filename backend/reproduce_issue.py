import os
import sys
import json
import asyncio
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add current directory to path
sys.path.append(os.getcwd())

from app.models.database import Base, User, TallyCache
from app.services.tbk_parser import TallyBackupParser

# Mock objects
class MockFile:
    def __init__(self, filename, content):
        self.filename = filename
        self.content = content
    
    async def read(self):
        return self.content

class MockUser:
    def __init__(self):
        self.id = 1
        self.email = "test@example.com"

# Setup DB
if os.path.exists("test.db"):
    os.remove("test.db")
engine = create_engine('sqlite:///test.db')
Base.metadata.create_all(engine)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

# Create dummy user
user = User(email="test@example.com", hashed_password="x", full_name="Test User")
db.add(user)
db.commit()

async def reproduce():
    print("--- STARTING REPRODUCTION ---")
    
    # 1. Create dummy XML
    xml_content = b"""<ENVELOPE>
    <HEADER>
        <TALLYREQUEST>Export Data</TALLYREQUEST>
    </HEADER>
    <BODY>
        <IMPORTDATA>
            <REQUESTDESC>
                <REPORTNAME>All Masters</REPORTNAME>
            </REQUESTDESC>
            <REQUESTDATA>
                <TALLYMESSAGE xmlns:UDF="TallyUDF">
                    <COMPANY>
                        <NAME>Test Company</NAME>
                        <GUID>12345</GUID>
                    </COMPANY>
                </TALLYMESSAGE>
                <TALLYMESSAGE xmlns:UDF="TallyUDF">
                    <LEDGER NAME="Test Ledger" RESERVEDNAME="">
                        <GUID>abcde</GUID>
                        <PARENT>Sundry Debtors</PARENT>
                        <OPENINGBALANCE>1000.00</OPENINGBALANCE>
                        <CLOSINGBALANCE>1000.00</CLOSINGBALANCE>
                    </LEDGER>
                </TALLYMESSAGE>
            </REQUESTDATA>
        </IMPORTDATA>
    </BODY>
</ENVELOPE>"""
    
    file = MockFile("backup.xml", xml_content)
    current_user = MockUser()
    
    try:
        print("1. Parsing file...")
        # Simulate upload logic
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix='.xml') as temp_file:
            temp_file.write(xml_content)
            temp_path = temp_file.name
            
        parser = TallyBackupParser()
        data = parser.parse_tbk_file(temp_path)
        print(f"Parsed: {len(data['companies'])} companies")
        
        print("2. Saving to DB...")
        # Simulate DB save logic from backup_routes.py
        companies_cached = []
        for company in data["companies"]:
            company_name = company["name"]
            print(f"Processing company: {company_name}")
            
            # Cache companies list
            cache_entry = db.query(TallyCache).filter(
                TallyCache.user_id == current_user.id,
                TallyCache.cache_key == "companies"
            ).first()
            
            if not cache_entry:
                print("Creating new companies cache entry")
                cache_entry = TallyCache(
                    user_id=current_user.id,
                    cache_key="companies",
                    cache_data=json.dumps({"companies": [company]}),
                    source="backup"
                )
                db.add(cache_entry)
            else:
                print("Updating existing companies cache entry")
                existing_data = json.loads(cache_entry.cache_data)
                existing_companies = existing_data.get("companies", [])
                existing_companies.append(company)
                cache_entry.cache_data = json.dumps({"companies": existing_companies})
                cache_entry.source = "backup"
                # cache_entry.last_updated = datetime.utcnow() # This might fail if column missing
            
            # Cache company data
            print(f"Caching data for {company_name}")
            company_cache = db.query(TallyCache).filter(
                TallyCache.user_id == current_user.id,
                TallyCache.cache_key == f"backup_data_{company_name}"
            ).first()
            
            cache_content = {
                "company": company,
                "ledgers": data["ledgers"],
                "vouchers": data["vouchers"],
                "stock_items": data["stock_items"],
                "groups": data["groups"],
                "metadata": data["metadata"]
            }
            
            if not company_cache:
                print("Creating new company data cache")
                company_cache = TallyCache(
                    user_id=current_user.id,
                    cache_key=f"backup_data_{company_name}",
                    cache_data=json.dumps(cache_content),
                    source="backup"
                )
                db.add(company_cache)
            else:
                print("Updating company data cache")
                company_cache.cache_data = json.dumps(cache_content)
                company_cache.source = "backup"
                # company_cache.last_updated = datetime.utcnow()
            
            companies_cached.append(company_name)
        
        print("3. Committing...")
        db.commit()
        print("SUCCESS! No errors found.")
        
    except Exception as e:
        print("\n!!! ERROR DETECTED !!!")
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if 'temp_path' in locals() and os.path.exists(temp_path):
            os.unlink(temp_path)
        if os.path.exists("test.db"):
            try:
                db.close()
                os.remove("test.db")
            except:
                pass

if __name__ == "__main__":
    asyncio.run(reproduce())
