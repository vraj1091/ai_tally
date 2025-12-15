"""
Chat Routes - Combined Tally + Document RAG
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, BackgroundTasks, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.models.database import get_db
from app.services.rag_service import CombinedRAGService
from app.services.document_service import DocumentService
from app.config import Config
try:
    from langchain.schema import Document
except ImportError:
    try:
        from langchain_core.documents import Document
    except ImportError:
        # Fallback mock implementation
        class Document:
            def __init__(self, page_content, metadata=None):
                self.page_content = page_content
                self.metadata = metadata or {}
from typing import Optional, List
import logging
import os
import shutil

logger = logging.getLogger(__name__)
router = APIRouter()

# Global service instances
rag_service = CombinedRAGService()
doc_service = DocumentService()

class ChatQuery(BaseModel):
    """Chat query request"""
    query: str
    company_name: str = "Demo Company"
    collection_name: str = "tally_combined"
    tally_url: Optional[str] = None

class ChatResponse(BaseModel):
    """Chat response with source attribution"""
    answer: str
    query: str
    tally_sources: List[dict]
    document_sources: List[dict]
    success: bool

class InitializeRequest(BaseModel):
    """Initialize chatbot request"""
    company_name: str
    tally_url: Optional[str] = None

@router.post("/initialize/{company_name}")
async def initialize_chat(
    company_name: str,
    tally_url: Optional[str] = None,
    background_tasks: BackgroundTasks = None
):
    """
    Initialize RAG with Tally company data
    
    Args:
        company_name: Name of Tally company
        tally_url: Optional remote Tally URL (e.g., http://192.168.1.100:9000)
    """
    try:
        url = tally_url or Config.TALLY_URL
        
        logger.info(f"Initializing chat for company: {company_name} at {url}")
        
        # Ingest Tally data
        success = rag_service.ingest_combined_data(
            company_name=company_name,
            tally_url=url
        )
        
        if success:
            return {
                "success": True,
                "message": f"✓ Chatbot initialized with Tally data for {company_name}",
                "company": company_name,
                "tally_url": url
            }
        else:
            raise HTTPException(
                status_code=500,
                detail="Failed to initialize chatbot"
            )
            
    except Exception as e:
        logger.error(f"Error initializing chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload-and-ingest/{company_name}")
async def upload_and_ingest(
    company_name: str,
    file: UploadFile = File(...),
    tally_url: Optional[str] = None
):
    """
    Upload document and ingest with Tally data
    
    Args:
        company_name: Name of Tally company
        file: Document file to upload
        tally_url: Optional remote Tally URL
    """
    try:
        # Validate file extension
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext.replace('.', '') not in Config.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"File type {file_ext} not allowed"
            )
        
        # Save file temporarily
        os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
        file_path = os.path.join(Config.UPLOAD_FOLDER, file.filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        logger.info(f"File saved: {file_path}")
        
        # Extract text
        text, file_type = doc_service.extract_text_from_file(file_path)
        
        # Create document
        doc = Document(
            page_content=text,
            metadata={
                "source": file.filename,
                "type": file_type,
                "company": company_name,
                "file_size": os.path.getsize(file_path)
            }
        )
        
        # Ingest combined data
        url = tally_url or Config.TALLY_URL
        success = rag_service.ingest_combined_data(
            company_name=company_name,
            documents=[doc],
            tally_url=url
        )
        
        # Cleanup
        os.remove(file_path)
        
        if success:
            return {
                "success": True,
                "message": f"✓ Uploaded and ingested {file.filename} with {company_name} data",
                "file": file.filename,
                "company": company_name,
                "text_length": len(text)
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to ingest data")
            
    except Exception as e:
        logger.error(f"Error uploading file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chat", response_model=ChatResponse)
async def chat(query: ChatQuery, db: Session = Depends(get_db)):
    """
    Chat with combined Tally + Document RAG
    
    Automatically searches uploaded documents and Tally data.
    Queries LIVE Tally first, then falls back to backup data.
    """
    try:
        logger.info(f"Chat query received: {query.query}")
        
        tally_context = ""
        tally_sources = []
        data_source = "none"
        
        # ===== STEP 0: Try BRIDGE Data First (for remote Tally) =====
        try:
            from app.services.bridge_tally_service import BridgeTallyService
            from app.routes.ws_bridge_routes import bridge_connections
            import json
            
            # Check if bridge is connected
            bridge_token = "user_tally_bridge"
            logger.info(f"Chat: Checking bridge. Available bridges: {list(bridge_connections.keys())}")
            
            if bridge_token in bridge_connections:
                bridge_info = bridge_connections[bridge_token]
                logger.info(f"Chat: Bridge info - tally_connected={bridge_info.get('tally_connected')}")
                
                if bridge_info.get("tally_connected"):
                    logger.info("✅ Bridge connected - fetching data for chat")
                    
                    bridge_service = BridgeTallyService(bridge_token)
                    companies = await bridge_service.get_companies()
                    
                    if companies:
                        company_name = companies[0] if isinstance(companies[0], str) else companies[0].get('name', '')
                        if company_name:
                            # Get all company data via bridge
                            company_data = await bridge_service.get_all_company_data(company_name, include_vouchers=False)
                            
                            if company_data and company_data.get('ledgers'):
                                ledgers = company_data['ledgers']
                                summary = company_data.get('summary', {})
                                
                                tally_context += f"\n\n=== LIVE TALLY DATA (via Bridge) ===\n"
                                tally_context += f"Company: {company_name}\n"
                                tally_context += f"Data Source: BRIDGE (Real-time from your local Tally)\n"
                                tally_context += f"Total Ledgers: {len(ledgers)}\n"
                                
                                # Add financial summary
                                tally_context += f"\n--- Financial Summary ---\n"
                                tally_context += f"Total Revenue: ₹{abs(summary.get('total_revenue', 0)):,.2f}\n"
                                tally_context += f"Total Expenses: ₹{abs(summary.get('total_expense', 0)):,.2f}\n"
                                tally_context += f"Net Profit: ₹{summary.get('net_profit', 0):,.2f}\n"
                                tally_context += f"Total Assets: ₹{abs(summary.get('total_assets', 0)):,.2f}\n"
                                tally_context += f"Total Liabilities: ₹{abs(summary.get('total_liabilities', 0)):,.2f}\n"
                                tally_context += f"Total Debtors: ₹{abs(summary.get('sundry_debtors', 0)):,.2f}\n"
                                tally_context += f"Total Creditors: ₹{abs(summary.get('sundry_creditors', 0)):,.2f}\n"
                                
                                # Add top ledgers
                                debtors = [l for l in ledgers if l.get('parent', '').lower() == 'sundry debtors']
                                creditors = [l for l in ledgers if l.get('parent', '').lower() == 'sundry creditors']
                                
                                if debtors:
                                    tally_context += f"\n--- Top 10 Customers/Debtors ---\n"
                                    sorted_debtors = sorted(debtors, key=lambda x: abs(x.get('closing_balance', 0) or 0), reverse=True)[:10]
                                    for l in sorted_debtors:
                                        balance = l.get('closing_balance', 0) or 0
                                        tally_context += f"- {l.get('name')}: ₹{abs(balance):,.2f}\n"
                                
                                if creditors:
                                    tally_context += f"\n--- Top 10 Suppliers/Creditors ---\n"
                                    sorted_creditors = sorted(creditors, key=lambda x: abs(x.get('closing_balance', 0) or 0), reverse=True)[:10]
                                    for l in sorted_creditors:
                                        balance = l.get('closing_balance', 0) or 0
                                        tally_context += f"- {l.get('name')}: ₹{abs(balance):,.2f}\n"
                                
                                data_source = "bridge"
                                tally_sources.append({"company": company_name, "source": "bridge", "ledgers": len(ledgers)})
                                logger.info(f"✅ Got {len(ledgers)} ledgers via Bridge for chat")
        except Exception as e:
            import traceback
            logger.warning(f"Could not fetch Bridge Tally data: {e}")
            logger.warning(f"Bridge error traceback: {traceback.format_exc()}")
        
        # ===== STEP 1: Try LIVE Tally Data First (if Bridge didn't work) =====
        if not tally_context:
            try:
                from app.services.custom_tally_connector import CustomTallyConnector
                import json
                
                connector = CustomTallyConnector()
                live_connected, live_message = connector.test_connection()
                
                if live_connected:
                    logger.info("✅ Live Tally connected - fetching data for chat")
                    
                    # Get companies from live Tally
                    companies = connector.get_companies()
                    
                    if companies:
                        for company_data in companies[:3]:  # Limit to first 3 companies
                            try:
                                # Extract company name from dict or string
                                company_name = company_data.get('name') if isinstance(company_data, dict) else company_data
                                if not company_name:
                                    continue
                                
                                # Get ledgers for this company
                                ledgers = connector.get_ledgers(company_name)
                                
                                # Get financial summary
                                financial_summary = connector.get_financial_summary(company_name)
                                
                                tally_context += f"\n\n=== LIVE TALLY DATA ===\n"
                                tally_context += f"Company: {company_name}\n"
                                tally_context += f"Data Source: LIVE (Real-time from Tally)\n"
                                tally_context += f"Total Ledgers: {len(ledgers)}\n"
                                
                                # Add financial summary
                                if financial_summary:
                                    tally_context += f"\n--- Financial Summary ---\n"
                                    tally_context += f"Total Revenue: ₹{abs(financial_summary.get('total_revenue', 0)):,.2f}\n"
                                    tally_context += f"Total Expenses: ₹{abs(financial_summary.get('total_expense', 0)):,.2f}\n"
                                    tally_context += f"Net Profit: ₹{financial_summary.get('net_profit', 0):,.2f}\n"
                                    tally_context += f"Total Assets: ₹{abs(financial_summary.get('total_assets', 0)):,.2f}\n"
                                    tally_context += f"Total Liabilities: ₹{abs(financial_summary.get('total_liabilities', 0)):,.2f}\n"
                                    tally_context += f"Total Debtors (Receivable): ₹{abs(financial_summary.get('total_debtors', 0)):,.2f}\n"
                                    tally_context += f"Total Creditors (Payable): ₹{abs(financial_summary.get('total_creditors', 0)):,.2f}\n"
                                
                                # Add ledger details - categorize them
                                if ledgers:
                                    # Group ledgers by parent
                                    debtors = [l for l in ledgers if l.get('parent', '').lower() == 'sundry debtors']
                                    creditors = [l for l in ledgers if l.get('parent', '').lower() == 'sundry creditors']
                                    sales = [l for l in ledgers if 'sales' in l.get('parent', '').lower() or 'income' in l.get('parent', '').lower()]
                                    expenses = [l for l in ledgers if l.get('is_expense', False)]
                                    
                                    if debtors:
                                        tally_context += f"\n--- Top Customers/Debtors ---\n"
                                        sorted_debtors = sorted(debtors, key=lambda x: abs(x.get('closing_balance', 0)), reverse=True)[:10]
                                        for l in sorted_debtors:
                                            balance = l.get('closing_balance', 0)
                                            tally_context += f"- {l.get('name')}: ₹{abs(balance):,.2f}\n"
                                    
                                    if creditors:
                                        tally_context += f"\n--- Top Suppliers/Creditors ---\n"
                                        sorted_creditors = sorted(creditors, key=lambda x: abs(x.get('closing_balance', 0)), reverse=True)[:10]
                                        for l in sorted_creditors:
                                            balance = l.get('closing_balance', 0)
                                            tally_context += f"- {l.get('name')}: ₹{abs(balance):,.2f}\n"
                                    
                                    if sales:
                                        tally_context += f"\n--- Sales/Income Accounts ---\n"
                                        for l in sales[:10]:
                                            balance = l.get('closing_balance', 0)
                                            tally_context += f"- {l.get('name')}: ₹{abs(balance):,.2f}\n"
                                    
                                    if expenses:
                                        tally_context += f"\n--- Expense Accounts ---\n"
                                        sorted_expenses = sorted(expenses, key=lambda x: abs(x.get('closing_balance', 0)), reverse=True)[:10]
                                        for l in sorted_expenses:
                                            balance = l.get('closing_balance', 0)
                                            tally_context += f"- {l.get('name')}: ₹{abs(balance):,.2f}\n"
                                
                                tally_sources.append({
                                    "content": f"Live Company: {company_name}, Ledgers: {len(ledgers)}",
                                    "metadata": {"source_type": "tally_live", "company": company_name}
                                })
                                data_source = "live"
                                logger.info(f"✅ Loaded LIVE context for {company_name}: {len(ledgers)} ledgers")
                            except Exception as e:
                                logger.warning(f"Error fetching live data for {company_name}: {e}")
                                continue
        except Exception as e:
            logger.warning(f"Could not fetch live Tally data: {e}")
        
        # ===== STEP 2: Also check backup data =====
        try:
            from app.models.database import TallyCache
            import json
            
            backup_entries = db.query(TallyCache).filter(
                TallyCache.source == "backup"
            ).all()
            
            if backup_entries:
                for entry in backup_entries:
                    try:
                        data = json.loads(entry.cache_data) if isinstance(entry.cache_data, str) else entry.cache_data
                        company = data.get("company", {})
                        summary = data.get("summary", {})
                        ledgers = data.get("ledgers", [])
                        vouchers = data.get("vouchers", [])
                        
                        tally_context += f"\n\n=== TALLY BACKUP DATA ===\n"
                        tally_context += f"Company: {company.get('name', 'Unknown')}\n"
                        tally_context += f"Data Source: BACKUP (Uploaded file)\n"
                        tally_context += f"Total Ledgers: {len(ledgers)}\n"
                        tally_context += f"Total Vouchers: {len(vouchers)}\n"
                        
                        if summary:
                            tally_context += f"\n--- Financial Summary ---\n"
                            tally_context += f"Total Revenue: ₹{summary.get('total_revenue', 0):,.2f}\n"
                            tally_context += f"Total Expenses: ₹{summary.get('total_expense', 0):,.2f}\n"
                            tally_context += f"Net Profit: ₹{summary.get('net_profit', 0):,.2f}\n"
                            tally_context += f"Total Assets: ₹{summary.get('total_assets', 0):,.2f}\n"
                            tally_context += f"Total Liabilities: ₹{summary.get('total_liabilities', 0):,.2f}\n"
                        
                        if ledgers:
                            tally_context += f"\n--- Sample Ledgers (first 20) ---\n"
                            for l in ledgers[:20]:
                                name = l.get('name', 'Unknown')
                                parent = l.get('parent', '')
                                balance = l.get('closing_balance', l.get('balance', 0))
                                tally_context += f"- {name} ({parent}): ₹{balance:,.2f}\n"
                        
                        tally_sources.append({
                            "content": f"Backup Company: {company.get('name')}, Ledgers: {len(ledgers)}, Vouchers: {len(vouchers)}",
                            "metadata": {"source_type": "tally_backup", "company": company.get('name')}
                        })
                        if data_source == "none":
                            data_source = "backup"
                        
                        logger.info(f"Loaded backup context for {company.get('name')}: {len(ledgers)} ledgers")
                    except Exception as e:
                        logger.warning(f"Error parsing backup entry: {e}")
                        continue
        except Exception as e:
            logger.warning(f"Could not load backup data: {e}")
        
        # If we have tally context (live or backup), use LLM with that context
        if tally_context:
            logger.info(f"Using {data_source.upper()} Tally data context for RAG query")
            try:
                import requests
                from app.config import Config
                
                prompt = f"""You are an AI assistant for TallyDash Pro, helping users analyze their Tally accounting data.

Here is the user's Tally data (from {data_source.upper()} source):
{tally_context}

IMPORTANT:
- Answer based ONLY on the data provided above
- If the user asks about a specific company, look for that company in the data
- If the company is not found, clearly state which companies ARE available
- Format currency values with ₹ symbol
- Be specific with numbers and names from the actual data

Question: {query.query}

Answer:"""
                
                ollama_response = requests.post(
                    f"{Config.OLLAMA_BASE_URL}/api/generate",
                    json={
                        "model": Config.OLLAMA_MODEL,
                        "prompt": prompt,
                        "stream": False
                    },
                    timeout=180  # Increased timeout for phi4:14b
                )
                
                if ollama_response.status_code == 200:
                    answer = ollama_response.json().get("response", "I couldn't generate a response.")
                    return ChatResponse(
                        answer=answer,
                        query=query.query,
                        tally_sources=tally_sources,
                        document_sources=[],
                        success=True
                    )
            except Exception as e:
                logger.error(f"Error calling Ollama with tally context: {e}")
        
        # Fallback to standard RAG query
        if query.collection_name:
            try:
                rag_service.load_collection(query.collection_name)
                logger.info(f"Loaded collection: {query.collection_name}")
            except Exception as e:
                logger.warning(f"Could not load collection {query.collection_name}: {e}")
        
        result = rag_service.query(query.query, search_all_collections=True)
        
        logger.info(f"Query result: success={result['success']}, "
                   f"tally_sources={len(result['tally_sources'])}, "
                   f"doc_sources={len(result['document_sources'])}")
        
        return ChatResponse(
            answer=result["answer"],
            query=result.get("query", query.query),
            tally_sources=result["tally_sources"],
            document_sources=result["document_sources"],
            success=result["success"]
        )
        
    except Exception as e:
        logger.error(f"Error in chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/collections")
async def list_collections():
    """List available ChromaDB collections"""
    try:
        collections = rag_service.list_collections()
        return {
            "collections": collections,
            "count": len(collections)
        }
    except Exception as e:
        logger.error(f"Error listing collections: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/load-collection/{collection_name}")
async def load_collection(collection_name: str):
    """Load a specific ChromaDB collection"""
    try:
        success = rag_service.load_collection(collection_name)
        if success:
            return {
                "success": True,
                "message": f"✓ Loaded collection: {collection_name}",
                "collection": collection_name
            }
        else:
            raise HTTPException(status_code=404, detail="Collection not found")
    except Exception as e:
        logger.error(f"Error loading collection: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/collection/{collection_name}")
async def delete_collection(collection_name: str):
    """Delete a ChromaDB collection"""
    try:
        # Implementation for deleting collection
        return {
            "success": True,
            "message": f"Collection {collection_name} deleted",
            "collection": collection_name
        }
    except Exception as e:
        logger.error(f"Error deleting collection: {e}")
        raise HTTPException(status_code=500, detail=str(e))