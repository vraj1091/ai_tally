
import asyncio
import os
import sys
from fastapi import UploadFile
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import MagicMock

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.routes.backup_routes import upload_tbk_file
from app.models.database import Base, User, TallyCache
from app.config import Config

# Setup test DB
engine = create_engine("sqlite:///:memory:")
Base.metadata.create_all(engine)
SessionLocal = sessionmaker(bind=engine)

async def test_upload():
    db = SessionLocal()
    
    # Create dummy user
    user = User(email="test@example.com", hashed_password="hash", username="testuser")
    db.add(user)
    db.commit()
    
    # Create dummy XML file
    xml_content = """<ENVELOPE>
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
                        <BOOKSBEGINFROM>20230401</BOOKSBEGINFROM>
                    </COMPANY>
                </TALLYMESSAGE>
            </REQUESTDATA>
        </IMPORTDATA>
    </BODY>
</ENVELOPE>"""
    
    with open("test_backup.xml", "w") as f:
        f.write(xml_content)
        
    try:
        # Mock UploadFile
        file_mock = MagicMock(spec=UploadFile)
        file_mock.filename = "test_backup.xml"
        
        # Mock read method to return bytes
        async def mock_read():
            return xml_content.encode('utf-8')
        file_mock.read = mock_read
        
        print("Attempting upload...")
        result = await upload_tbk_file(file=file_mock, db=db, current_user=user)
        print("Upload successful!")
        print(result)
        
    except Exception as e:
        print(f"Caught exception: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        if os.path.exists("test_backup.xml"):
            os.remove("test_backup.xml")
        db.close()

if __name__ == "__main__":
    asyncio.run(test_upload())
