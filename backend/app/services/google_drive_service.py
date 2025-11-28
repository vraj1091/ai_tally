 
"""
Google Drive Integration Service
"""

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from typing import List, Dict
import os
import logging
from io import BytesIO
import pickle

logger = logging.getLogger(__name__)

SCOPES = ['https://www.googleapis.com/auth/drive.readonly']

class GoogleDriveService:
    """Service for Google Drive integration"""
    
    def __init__(self, credentials_file: str):
        self.credentials_file = credentials_file
        self.service = None
        self._authenticate()
    
    def _authenticate(self):
        """Authenticate with Google Drive API"""
        creds = None
        
        # Token file stores user's access and refresh tokens
        if os.path.exists('token.pickle'):
            with open('token.pickle', 'rb') as token:
                creds = pickle.load(token)
        
        # If no valid credentials, let user log in
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                flow = InstalledAppFlow.from_client_secrets_file(
                    self.credentials_file, SCOPES)
                creds = flow.run_local_server(port=0)
            
            # Save credentials for next run
            with open('token.pickle', 'wb') as token:
                pickle.dump(creds, token)
        
        self.service = build('drive', 'v3', credentials=creds)
        logger.info("✓ Authenticated with Google Drive")
    
    def list_files_in_folder(self, folder_id: str = None) -> List[Dict]:
        """List all files in a Google Drive folder"""
        try:
            query = f"'{folder_id}' in parents and trashed=false" if folder_id else "trashed=false"
            
            results = self.service.files().list(
                q=query,
                spaces='drive',
                fields='files(id, name, mimeType, size, createdTime, modifiedTime)',
                pageSize=100
            ).execute()
            
            files = results.get('files', [])
            logger.info(f"Found {len(files)} files in Drive")
            return files
        except Exception as e:
            logger.error(f"Error listing files: {e}")
            return []
    
    def download_file(self, file_id: str) -> BytesIO:
        """Download file from Google Drive"""
        try:
            request = self.service.files().get_media(fileId=file_id)
            file_content = BytesIO()
            downloader = MediaIoBaseDownload(file_content, request)
            
            done = False
            while not done:
                status, done = downloader.next_chunk()
            
            file_content.seek(0)
            logger.info(f"Downloaded file: {file_id}")
            return file_content
        except Exception as e:
            logger.error(f"Error downloading file {file_id}: {e}")
            raise
    
    def get_file_content(self, file_id: str) -> bytes:
        """Get file content as bytes"""
        file_content = self.download_file(file_id)
        return file_content.getvalue()
