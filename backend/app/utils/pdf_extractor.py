"""
PDF Text Extractor
Advanced PDF processing utilities
"""

import PyPDF2
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)

class PDFExtractor:
    """Advanced PDF text extraction"""
    
    @staticmethod
    def extract_text(file_path: str) -> str:
        """Extract all text from PDF"""
        try:
            text = ""
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                
                for page_num, page in enumerate(pdf_reader.pages):
                    page_text = page.extract_text()
                    if page_text:
                        text += f"\n--- Page {page_num + 1} ---\n"
                        text += page_text
            
            return text
        except Exception as e:
            logger.error(f"Error extracting PDF: {e}")
            raise
    
    @staticmethod
    def extract_pages(file_path: str) -> List[str]:
        """Extract text from each page separately"""
        try:
            pages = []
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                
                for page in pdf_reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        pages.append(page_text)
            
            return pages
        except Exception as e:
            logger.error(f"Error extracting PDF pages: {e}")
            raise
    
    @staticmethod
    def get_metadata(file_path: str) -> Dict:
        """Extract PDF metadata"""
        try:
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                
                info = pdf_reader.metadata
                
                return {
                    "title": info.get('/Title', ''),
                    "author": info.get('/Author', ''),
                    "subject": info.get('/Subject', ''),
                    "creator": info.get('/Creator', ''),
                    "producer": info.get('/Producer', ''),
                    "pages": len(pdf_reader.pages)
                }
        except Exception as e:
            logger.error(f"Error extracting PDF metadata: {e}")
            return {}

