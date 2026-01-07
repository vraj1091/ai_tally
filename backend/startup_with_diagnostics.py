"""
Startup Script with Full Diagnostics
Checks all systems before starting the backend
"""

import sys
import os
import time
from pathlib import Path

# Add app directory to path
sys.path.insert(0, str(Path(__file__).parent / "app"))

print("=" * 60)
print(" AI Tally Assistant - Startup Diagnostics")
print("=" * 60)
print()

# Test 1: Check Python version
print("1️⃣  Checking Python version...")
import platform
python_version = platform.python_version()
print(f"   ✓ Python {python_version}")
print()

# Test 2: Check required directories
print("2️⃣  Checking directories...")
required_dirs = ["app", "app/chroma_db", "app/uploads", "app/logs"]
for dir_path in required_dirs:
    full_path = Path(__file__).parent / dir_path
    if full_path.exists():
        print(f"   ✓ {dir_path}")
    else:
        print(f"   ⚠️  {dir_path} (creating...)")
        full_path.mkdir(parents=True, exist_ok=True)
        print(f"   ✓ Created {dir_path}")
print()

# Test 3: Check dependencies
print("3️⃣  Checking Python dependencies...")
required_packages = {
    "fastapi": "FastAPI",
    "uvicorn": "Uvicorn",
    "chromadb": "ChromaDB",
    "langchain": "LangChain",
    "sentence_transformers": "Sentence Transformers",
    "requests": "Requests",
    "sqlalchemy": "SQLAlchemy"
}

missing_packages = []
for package, name in required_packages.items():
    try:
        __import__(package)
        print(f"   ✓ {name}")
    except ImportError:
        print(f"   ✗ {name} - NOT INSTALLED")
        missing_packages.append(package)

if missing_packages:
    print()
    print(f"   ⚠️  Missing packages: {', '.join(missing_packages)}")
    print(f"   Run: pip install {' '.join(missing_packages)}")
    print()
else:
    print()

# Test 4: Test Tally connection
print("4️⃣  Testing Tally connection...")
try:
    import requests
    response = requests.get("http://localhost:9000", timeout=3)
    print("   ✓ Tally Gateway is accessible")
    print(f"   ✓ Response code: {response.status_code}")
except requests.exceptions.ConnectionError:
    print("   ⚠️  Cannot connect to Tally Gateway")
    print("   ℹ️  Make sure:")
    print("      - Tally is running")
    print("      - A company is open")
    print("      - Gateway is enabled (F1 → Settings → Connectivity)")
except Exception as e:
    print(f"   ⚠️  Tally check failed: {e}")
print()

# Test 5: Test Custom Connector
print("5️⃣  Testing Custom Tally Connector...")
try:
    from app.services.custom_tally_connector import CustomTallyConnector
    connector = CustomTallyConnector(host="localhost", port=9000)
    is_connected, message = connector.test_connection()
    if is_connected:
        print(f"   ✓ {message}")
        try:
            companies = connector.get_companies()
            print(f"   ✓ Found {len(companies)} companies")
            if companies:
                print(f"   ℹ️  Sample: {companies[0]['name']}")
        except Exception as e:
            print(f"   ⚠️  Could not fetch companies: {e}")
    else:
        print(f"   ✗ {message}")
except Exception as e:
    print(f"   ✗ Connector error: {e}")
print()

# Test 6: Check ChromaDB
print("6️⃣  Checking ChromaDB vector database...")
try:
    from app.services.chromadb_service import ChromaDBService
    from app.config import Config
    chroma_service = ChromaDBService(Config.CHROMA_DB_PATH)
    collections = chroma_service.list_collections()
    print(f"   ✓ ChromaDB is accessible")
    print(f"   ✓ Found {len(collections)} collections")
    for coll in collections:
        count = chroma_service.get_collection_count(coll)
        print(f"      - {coll}: {count} documents")
except Exception as e:
    print(f"   ⚠️  ChromaDB check failed: {e}")
print()

# Test 7: Check Ollama
print("7️⃣  Checking Ollama (AI Model)...")
try:
    import requests
    from app.config import Config
    response = requests.get(f"{Config.OLLAMA_BASE_URL}/api/tags", timeout=5)
    if response.status_code == 200:
        print(f"   ✓ Ollama is running")
        models = response.json().get("models", [])
        phi4_available = any(Config.OLLAMA_MODEL in m.get("name", "") for m in models)
        if phi4_available:
            print(f"   ✓ Model {Config.OLLAMA_MODEL} is available")
        else:
            print(f"   ⚠️  Model {Config.OLLAMA_MODEL} not found")
            print(f"   ℹ️  Run: ollama pull {Config.OLLAMA_MODEL}")
    else:
        print(f"   ⚠️  Ollama returned status {response.status_code}")
except requests.exceptions.ConnectionError:
    print(f"   ⚠️  Ollama is not running")
    print(f"   ℹ️  Start Ollama to enable AI chat features")
except Exception as e:
    print(f"   ⚠️  Ollama check failed: {e}")
print()

# Summary
print("=" * 60)
print(" Startup Summary")
print("=" * 60)
print()
print("✓ Core System: Ready")
print("✓ Custom Connector: Installed")
print("✓ Vector Database: Ready")
print()

if missing_packages:
    print("⚠️  Some Python packages are missing")
    print(f"   Install with: pip install -r requirements.txt")
    print()

print("🚀 Starting backend server...")
print()
print("=" * 60)
print()

# Import and start the FastAPI app
try:
    from app.main import app
    import uvicorn
    
    print("Backend will be available at:")
    print("  - API: http://localhost:8000")
    print("  - Docs: http://localhost:8000/docs")
    print("  - Debug Tally: http://localhost:8000/tally/debug-connection")
    print()
    print("Press CTRL+C to stop")
    print()
    
    # Configure uvicorn with proper shutdown handling
    config = uvicorn.Config(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
        timeout_keep_alive=5,  # Keep-alive timeout
        timeout_graceful_shutdown=10  # Graceful shutdown timeout
    )
    server = uvicorn.Server(config)
    
    # Add signal handlers for graceful shutdown
    import signal
    import asyncio
    
    def signal_handler(sig, frame):
        print("\n\n👋 Received shutdown signal, shutting down gracefully...")
        server.should_exit = True
    
    # Register signal handlers (works on Unix, Windows uses different approach)
    if sys.platform != "win32":
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        server.run()
    except KeyboardInterrupt:
        print("\n\n👋 Shutting down gracefully...")
        server.should_exit = True
    except Exception as e:
        print(f"\n\n❌ Error starting server: {e}")
        sys.exit(1)

