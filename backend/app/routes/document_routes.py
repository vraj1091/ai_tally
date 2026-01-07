"""
Document Routes - File Upload & Management with RAG Integration
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from app.services.document_service import DocumentService
from app.services.chromadb_service import ChromaDBService
from app.services.chunking_service import ChunkingService
from app.services.embeddings_service import EmbeddingsService
from app.config import Config
try:
    from langchain.schema import Document
except ImportError:
    try:
        from langchain_core.documents import Document
    except ImportError:
        class Document:
            def __init__(self, page_content, metadata=None):
                self.page_content = page_content
                self.metadata = metadata or {}
from typing import List
import logging
import os
import shutil
import uuid

logger = logging.getLogger(__name__)
router = APIRouter()

doc_service = DocumentService()
chroma_service = ChromaDBService(Config.CHROMA_DB_PATH)
chunking_service = ChunkingService(chunk_size=Config.CHUNK_SIZE, chunk_overlap=Config.CHUNK_OVERLAP)
embeddings_service = EmbeddingsService()

@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    Upload a document and automatically store in RAG vector database
    
    Supported formats: PDF, DOCX, TXT, MD, Images (PNG, JPG, JPEG)
    """
    try:
        # Validate file extension
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext.replace('.', '') not in Config.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"File type {file_ext} not allowed. Allowed: {', '.join(Config.ALLOWED_EXTENSIONS)}"
            )
        
        # Check file size
        file.file.seek(0, 2)
        file_size = file.file.tell()
        file.file.seek(0)
        
        if file_size > Config.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Max size: {Config.MAX_FILE_SIZE / 1024 / 1024}MB"
            )
        
        # Save file
        os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
        file_path = os.path.join(Config.UPLOAD_FOLDER, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        logger.info(f"✓ File uploaded: {file.filename}")
        
        # Extract text and process for RAG
        try:
            text, file_type = doc_service.extract_text_from_file(file_path)
            logger.info(f"✓ Extracted {len(text)} characters from {file.filename}")
            
            # Create document object
            doc = Document(
                page_content=text,
                metadata={
                    "source": file.filename,
                    "type": file_type,
                    "file_size": file_size,
                    "source_type": "uploaded_document"
                }
            )
            
            # Chunk the document
            chunks = chunking_service.chunk_uploaded_documents([doc])
            logger.info(f"✓ Created {len(chunks)} chunks from {file.filename}")
            
            # Generate embeddings and store in ChromaDB
            collection_name = "uploaded_documents"
            
            # Extract text from chunks
            documents = [chunk.page_content for chunk in chunks]
            metadatas = [chunk.metadata for chunk in chunks]
            ids = [f"{file.filename}_{uuid.uuid4().hex[:8]}_{i}" for i in range(len(chunks))]
            
            # Store in vector database
            success = chroma_service.add_documents(
                collection_name=collection_name,
                documents=documents,
                metadatas=metadatas,
                ids=ids
            )
            
            if success:
                logger.info(f"✓ Stored {len(chunks)} chunks in vector database")
                rag_status = "stored_in_rag"
                rag_message = f"Document processed and {len(chunks)} chunks stored in RAG"
            else:
                rag_status = "rag_storage_failed"
                rag_message = "Failed to store in RAG database"
                
        except Exception as rag_error:
            logger.error(f"Error processing document for RAG: {rag_error}")
            rag_status = "rag_processing_error"
            rag_message = f"RAG processing error: {str(rag_error)}"
        
        return {
            "success": True,
            "filename": file.filename,
            "file_path": file_path,
            "file_size": file_size,
            "rag_status": rag_status,
            "chunks_created": len(chunks) if 'chunks' in locals() else 0,
            "message": f"✓ File {file.filename} uploaded successfully. {rag_message}"
        }
        
    except Exception as e:
        logger.error(f"Error uploading file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/extract-text")
async def extract_text(file: UploadFile = File(...)):
    """
    Extract text from uploaded document
    """
    try:
        # Save file temporarily
        os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
        file_path = os.path.join(Config.UPLOAD_FOLDER, file.filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Extract text
        text, file_type = doc_service.extract_text_from_file(file_path)
        
        # Cleanup
        os.remove(file_path)
        
        return {
            "success": True,
            "filename": file.filename,
            "file_type": file_type,
            "text": text,
            "text_length": len(text),
            "message": f"✓ Extracted {len(text)} characters from {file.filename}"
        }
        
    except Exception as e:
        logger.error(f"Error extracting text: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list")
async def list_documents():
    """List all uploaded documents"""
    try:
        if not os.path.exists(Config.UPLOAD_FOLDER):
            return {"documents": [], "count": 0}
        
        files = []
        for filename in os.listdir(Config.UPLOAD_FOLDER):
            file_path = os.path.join(Config.UPLOAD_FOLDER, filename)
            if os.path.isfile(file_path):
                files.append({
                    "filename": filename,
                    "size": os.path.getsize(file_path),
                    "modified": os.path.getmtime(file_path)
                })
        
        return {
            "documents": files,
            "count": len(files)
        }
        
    except Exception as e:
        logger.error(f"Error listing documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/delete/{filename}")
async def delete_document(filename: str):
    """Delete an uploaded document and its RAG data"""
    try:
        file_path = os.path.join(Config.UPLOAD_FOLDER, filename)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")
        
        os.remove(file_path)
        
        # Note: Currently we don't delete from ChromaDB as chunks have unique IDs
        # In production, you'd want to track document IDs and clean up chunks
        
        return {
            "success": True,
            "message": f"✓ File {filename} deleted successfully"
        }
        
    except Exception as e:
        logger.error(f"Error deleting file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rag-stats")
async def get_rag_stats():
    """Get RAG vector database statistics"""
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
            "success": True,
            "total_collections": len(collections),
            "collections": collection_stats,
            "persist_directory": Config.CHROMA_DB_PATH
        }
        
    except Exception as e:
        logger.error(f"Error getting RAG stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))