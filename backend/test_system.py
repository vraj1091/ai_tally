"""
System Test Script
Tests all major components of the AI Tally Assistant
"""

import requests
import sys
import os
from pathlib import Path

BASE_URL = "http://localhost:8000"

def print_header(title):
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60)

def test_backend_health():
    """Test if backend is running"""
    print_header("Testing Backend Health")
    try:
        response = requests.get(f"{BASE_URL}/docs", timeout=5)
        if response.status_code == 200:
            print("✅ Backend is running")
            return True
        else:
            print("❌ Backend returned status code:", response.status_code)
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Backend is not running")
        print("   Start backend with: cd backend/app && python main.py")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_tally_connector_status():
    """Test TallyConnector DLL status"""
    print_header("Testing TallyConnector Status")
    try:
        response = requests.get(f"{BASE_URL}/tally/connector-status", timeout=5)
        data = response.json()
        
        if data.get("available"):
            print("✅ TallyConnector DLLs are installed")
        else:
            print("⚠️  TallyConnector DLLs are NOT installed")
            print(f"   Error: {data.get('error')}")
            if data.get('installation_instructions'):
                print("\n   Installation Instructions:")
                for instruction in data['installation_instructions']:
                    print(f"   {instruction}")
        
        return data.get("available", False)
    except Exception as e:
        print(f"❌ Error checking TallyConnector: {e}")
        return False

def test_rag_stats():
    """Test RAG vector database statistics"""
    print_header("Testing RAG Vector Database")
    try:
        response = requests.get(f"{BASE_URL}/documents/rag-stats", timeout=5)
        data = response.json()
        
        if data.get("success"):
            print(f"✅ RAG Database is accessible")
            print(f"   Total Collections: {data.get('total_collections', 0)}")
            
            collections = data.get('collections', [])
            if collections:
                print("\n   Collections:")
                for collection in collections:
                    print(f"   - {collection['name']}: {collection['document_count']} documents")
            else:
                print("   ℹ️  No collections yet (upload documents to create)")
            
            return True
        else:
            print("❌ RAG Database error")
            return False
    except Exception as e:
        print(f"❌ Error checking RAG stats: {e}")
        return False

def test_document_upload():
    """Test document upload functionality"""
    print_header("Testing Document Upload Capability")
    
    # Check if uploads directory exists
    uploads_dir = Path("app/uploads")
    if uploads_dir.exists():
        print(f"✅ Uploads directory exists: {uploads_dir.absolute()}")
    else:
        print(f"⚠️  Uploads directory not found: {uploads_dir.absolute()}")
    
    # Check ChromaDB directory
    chroma_dir = Path("app/chroma_db")
    if chroma_dir.exists():
        print(f"✅ ChromaDB directory exists: {chroma_dir.absolute()}")
    else:
        print(f"⚠️  ChromaDB directory not found: {chroma_dir.absolute()}")
    
    return True

def test_google_drive_status():
    """Test Google Drive integration status"""
    print_header("Testing Google Drive Integration")
    try:
        response = requests.get(f"{BASE_URL}/google-drive/status", timeout=5)
        data = response.json()
        
        if data.get("connected"):
            print("✅ Google Drive is configured")
        else:
            print("⚠️  Google Drive not configured")
            print(f"   Status: {data.get('status')}")
            print(f"   Message: {data.get('message')}")
        
        return data.get("connected", False)
    except Exception as e:
        print(f"❌ Error checking Google Drive: {e}")
        return False

def check_file_structure():
    """Check if critical files exist"""
    print_header("Checking File Structure")
    
    critical_files = {
        "Backend Main": "app/main.py",
        "Document Routes": "app/routes/document_routes.py",
        "Tally Service": "app/services/tally_service.py",
        "ChromaDB Service": "app/services/chromadb_service.py",
        "RAG Service": "app/services/rag_service.py",
        "Config": "app/config.py",
    }
    
    all_exist = True
    for name, path in critical_files.items():
        full_path = Path(path)
        if full_path.exists():
            print(f"✅ {name}: {path}")
        else:
            print(f"❌ {name}: {path} NOT FOUND")
            all_exist = False
    
    return all_exist

def main():
    """Run all tests"""
    print("\n" + "🔍 AI Tally Assistant - System Test".center(60, "="))
    print("Testing all components...".center(60))
    
    results = {
        "Backend Health": test_backend_health(),
        "File Structure": check_file_structure(),
        "TallyConnector": test_tally_connector_status(),
        "RAG Database": test_rag_stats(),
        "Document Upload": test_document_upload(),
        "Google Drive": test_google_drive_status(),
    }
    
    # Summary
    print_header("Test Summary")
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
    
    print(f"\n📊 Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! System is ready to use.")
        return 0
    else:
        print("\n⚠️  Some tests failed. Please check the errors above.")
        print("\nCommon fixes:")
        print("1. Ensure backend is running: cd backend/app && python main.py")
        print("2. Install TallyConnector DLLs (see TallyConnector/README_INSTALLATION.md)")
        print("3. Upload a document to create RAG collections")
        print("4. Configure Google Drive credentials if needed")
        return 1

if __name__ == "__main__":
    try:
        exit_code = main()
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        sys.exit(1)

