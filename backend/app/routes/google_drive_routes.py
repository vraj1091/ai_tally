"""
Google Drive Routes - Drive Integration
"""

from fastapi import APIRouter, HTTPException, Query
from app.services.google_drive_service import GoogleDriveService
from app.services.document_service import DocumentService
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
from typing import Optional, List
import logging
import os
import tempfile

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize services (lazy loading)
drive_service = None
doc_service = DocumentService()

def get_drive_service():
    """Get or initialize Google Drive service"""
    global drive_service
    if drive_service is None:
        if not os.path.exists(Config.GOOGLE_CREDENTIALS):
            raise HTTPException(
                status_code=500,
                detail="Google Drive credentials not configured"
            )
        drive_service = GoogleDriveService(Config.GOOGLE_CREDENTIALS)
    return drive_service

@router.get("/files")
async def list_drive_files(folder_id: Optional[str] = Query(None)):
    """
    List files from Google Drive
    
    Query params:
        folder_id: Optional folder ID to list files from
    """
    try:
        service = get_drive_service()
        files = service.list_files_in_folder(folder_id)
        
        return {
            "files": files,
            "count": len(files),
            "folder_id": folder_id or "root"
        }
        
    except Exception as e:
        logger.error(f"Error listing Drive files: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/download/{file_id}")
async def download_drive_file(file_id: str):
    """
    Download a file from Google Drive
    
    Path params:
        file_id: Google Drive file ID
    """
    try:
        service = get_drive_service()
        content = service.get_file_content(file_id)
        
        return {
            "success": True,
            "file_id": file_id,
            "size": len(content),
            "message": "File downloaded successfully"
        }
        
    except Exception as e:
        logger.error(f"Error downloading file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ingest/{file_id}")
async def ingest_drive_file(
    file_id: str,
    company_name: Optional[str] = Query(None)
):
    """
    Download and ingest a file from Google Drive
    
    Path params:
        file_id: Google Drive file ID
    Query params:
        company_name: Optional company name for context
    """
    try:
        service = get_drive_service()
        
        # Download file
        content = service.get_file_content(file_id)
        
        # Save temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.tmp') as tmp_file:
            tmp_file.write(content)
            tmp_path = tmp_file.name
        
        # Extract text
        text, file_type = doc_service.extract_text_from_file(tmp_path)
        
        # Cleanup
        os.unlink(tmp_path)
        
        # Create document
        doc = Document(
            page_content=text,
            metadata={
                "source": f"google_drive_{file_id}",
                "type": file_type,
                "company": company_name or "N/A",
                "file_id": file_id
            }
        )
        
        return {
            "success": True,
            "file_id": file_id,
            "text_length": len(text),
            "file_type": file_type,
            "message": "✓ File ingested successfully"
        }
        
    except Exception as e:
        logger.error(f"Error ingesting Drive file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ingest-folder/{folder_id}")
async def ingest_drive_folder(
    folder_id: str,
    company_name: Optional[str] = Query(None)
):
    """
    Ingest all files from a Google Drive folder
    
    Path params:
        folder_id: Google Drive folder ID
    Query params:
        company_name: Optional company name for context
    """
    try:
        service = get_drive_service()
        
        # List files in folder
        files = service.list_files_in_folder(folder_id)
        
        ingested_files = []
        errors = []
        
        for file in files:
            try:
                # Skip folders
                if file['mimeType'] == 'application/vnd.google-apps.folder':
                    continue
                
                # Download and process
                content = service.get_file_content(file['id'])
                
                with tempfile.NamedTemporaryFile(delete=False, suffix='.tmp') as tmp_file:
                    tmp_file.write(content)
                    tmp_path = tmp_file.name
                
                text, file_type = doc_service.extract_text_from_file(tmp_path)
                os.unlink(tmp_path)
                
                ingested_files.append({
                    "file_id": file['id'],
                    "name": file['name'],
                    "text_length": len(text)
                })
                
            except Exception as e:
                errors.append({
                    "file_id": file['id'],
                    "name": file['name'],
                    "error": str(e)
                })
        
        return {
            "success": True,
            "folder_id": folder_id,
            "ingested": ingested_files,
            "errors": errors,
            "total_files": len(files),
            "successful": len(ingested_files),
            "failed": len(errors)
        }
        
    except Exception as e:
        logger.error(f"Error ingesting Drive folder: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def get_drive_status():
    """Check Google Drive connection status"""
    try:
        if not os.path.exists(Config.GOOGLE_CREDENTIALS):
            return {
                "connected": False,
                "status": "credentials_not_found",
                "message": "Google Drive credentials not configured"
            }
        
        service = get_drive_service()
        
        return {
            "connected": True,
            "status": "connected",
            "message": "✓ Connected to Google Drive"
        }
        
    except Exception as e:
        logger.error(f"Error checking Drive status: {e}")
        return {
            "connected": False,
            "status": "error",
            "message": str(e)
        }