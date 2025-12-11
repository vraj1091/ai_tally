"""
Vector Store Routes - ChromaDB Management
"""

from fastapi import APIRouter, HTTPException
from app.services.chromadb_service import ChromaDBService
from app.config import Config
from pydantic import BaseModel
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

chroma_service = ChromaDBService(Config.CHROMA_DB_PATH)

class CollectionCreate(BaseModel):
    """Create collection request"""
    name: str
    metadata: Optional[Dict] = None

class DocumentAdd(BaseModel):
    """Add documents request"""
    collection_name: str
    documents: List[str]
    metadatas: List[Dict]
    ids: List[str]

class QueryRequest(BaseModel):
    """Query request"""
    collection_name: str
    query_texts: List[str]
    n_results: int = 5

@router.get("/collections")
async def list_collections():
    """List all ChromaDB collections"""
    try:
        collections = chroma_service.list_collections()
        return {
            "collections": collections,
            "count": len(collections)
        }
    except Exception as e:
        logger.error(f"Error listing collections: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/collections")
async def create_collection(request: CollectionCreate):
    """Create a new collection"""
    try:
        collection = chroma_service.create_collection(
            name=request.name,
            metadata=request.metadata
        )
        return {
            "success": True,
            "collection": request.name,
            "message": f"✓ Collection '{request.name}' created"
        }
    except Exception as e:
        logger.error(f"Error creating collection: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/collections/{collection_name}")
async def get_collection_info(collection_name: str):
    """Get information about a collection"""
    try:
        count = chroma_service.get_collection_count(collection_name)
        if count == 0:
            raise HTTPException(status_code=404, detail="Collection not found")
        
        return {
            "collection": collection_name,
            "document_count": count
        }
    except Exception as e:
        logger.error(f"Error getting collection info: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/collections/{collection_name}")
async def delete_collection(collection_name: str):
    """Delete a collection"""
    try:
        success = chroma_service.delete_collection(collection_name)
        if success:
            return {
                "success": True,
                "message": f"✓ Collection '{collection_name}' deleted"
            }
        else:
            raise HTTPException(status_code=404, detail="Collection not found")
    except Exception as e:
        logger.error(f"Error deleting collection: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/documents")
async def add_documents(request: DocumentAdd):
    """Add documents to a collection"""
    try:
        if len(request.documents) != len(request.metadatas) != len(request.ids):
            raise HTTPException(
                status_code=400,
                detail="Documents, metadatas, and ids must have same length"
            )
        
        success = chroma_service.add_documents(
            collection_name=request.collection_name,
            documents=request.documents,
            metadatas=request.metadatas,
            ids=request.ids
        )
        
        if success:
            return {
                "success": True,
                "collection": request.collection_name,
                "documents_added": len(request.documents),
                "message": f"✓ Added {len(request.documents)} documents"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to add documents")
            
    except Exception as e:
        logger.error(f"Error adding documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/query")
async def query_collection(request: QueryRequest):
    """Query a collection"""
    try:
        results = chroma_service.query_collection(
            collection_name=request.collection_name,
            query_texts=request.query_texts,
            n_results=request.n_results
        )
        
        if not results:
            raise HTTPException(status_code=404, detail="Collection not found")
        
        return {
            "collection": request.collection_name,
            "results": results,
            "query_count": len(request.query_texts)
        }
        
    except Exception as e:
        logger.error(f"Error querying collection: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
async def get_vector_store_stats():
    """Get vector store statistics"""
    try:
        collections = chroma_service.list_collections()
        
        collection_stats = []
        for collection_name in collections:
            count = chroma_service.get_collection_count(collection_name)
            collection_stats.append({
                "name": collection_name,
                "document_count": count
            })
        
        return {
            "total_collections": len(collections),
            "collections": collection_stats,
            "persist_directory": Config.CHROMA_DB_PATH
        }
        
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))