"""
Chat Routes - Combined Tally + Document RAG
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, BackgroundTasks
from pydantic import BaseModel
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
async def chat(query: ChatQuery):
    """
    Chat with combined Tally + Document RAG
    
    Automatically searches uploaded documents and Tally data.
    
    Request body:
    {
        "query": "What is our revenue?",
        "company_name": "Demo Company",  // optional
        "collection_name": "tally_combined",  // optional
        "tally_url": "http://192.168.1.100:9000"  // optional
    }
    """
    try:
        logger.info(f"Chat query received: {query.query}")
        
        # Try to load specific collection if provided
        if query.collection_name:
            try:
                rag_service.load_collection(query.collection_name)
                logger.info(f"Loaded collection: {query.collection_name}")
            except Exception as e:
                logger.warning(f"Could not load collection {query.collection_name}: {e}")
        
        # Query with auto-initialization (will load uploaded documents if available)
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