 
"""
Document Processing Service
Handles PDF, DOCX, TXT, Images (with OCR)
"""

import PyPDF2
from docx import Document as DocxDocument
from PIL import Image
import pytesseract
import logging
from typing import Tuple
from pathlib import Path

logger = logging.getLogger(__name__)

class DocumentService:
    """Service for document processing and text extraction"""
    
    @staticmethod
    def extract_pdf_text(file_path: str) -> str:
        """Extract text from PDF files"""
        try:
            text = ""
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page in pdf_reader.pages:
                    extracted = page.extract_text()
                    if extracted:
                        text += extracted + "\n"
            
            logger.info(f"Extracted {len(text)} characters from PDF: {file_path}")
            return text
        except Exception as e:
            logger.error(f"Error extracting PDF {file_path}: {e}")
            raise
    
    @staticmethod
    def extract_docx_text(file_path: str) -> str:
        """Extract text from DOCX files"""
        try:
            doc = DocxDocument(file_path)
            text = ""
            
            # Extract from paragraphs
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            
            # Extract from tables
            for table in doc.tables:
                for row in table.rows:
                    for cell in row.cells:
                        text += cell.text + " "
                    text += "\n"
            
            logger.info(f"Extracted {len(text)} characters from DOCX: {file_path}")
            return text
        except Exception as e:
            logger.error(f"Error extracting DOCX {file_path}: {e}")
            raise
    
    @staticmethod
    def extract_txt_text(file_path: str) -> str:
        """Extract text from TXT files"""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as file:
                text = file.read()
            
            logger.info(f"Extracted {len(text)} characters from TXT: {file_path}")
            return text
        except Exception as e:
            logger.error(f"Error extracting TXT {file_path}: {e}")
            raise
    
    @staticmethod
    def extract_image_text(file_path: str) -> str:
        """Extract text from images using OCR"""
        try:
            image = Image.open(file_path)
            text = pytesseract.image_to_string(image)
            
            logger.info(f"Extracted {len(text)} characters from image: {file_path}")
            return text
        except Exception as e:
            logger.error(f"Error extracting image text {file_path}: {e}")
            # Return empty string if OCR fails
            return ""
    
    @staticmethod
    def extract_xml_text(file_path: str) -> str:
        """Extract text from XML files"""
        try:
            import xml.etree.ElementTree as ET
            tree = ET.parse(file_path)
            root = tree.getroot()
            
            # Recursively extract text
            text = ""
            for elem in root.iter():
                if elem.text and elem.text.strip():
                    text += elem.text.strip() + "\n"
            
            logger.info(f"Extracted {len(text)} characters from XML: {file_path}")
            return text
        except Exception as e:
            logger.error(f"Error extracting XML {file_path}: {e}")
            raise

    @staticmethod
    def extract_text_from_file(file_path: str) -> Tuple[str, str]:
        """
        Extract text from any supported file
        
        Returns:
            Tuple of (text, file_type)
        """
        file_extension = Path(file_path).suffix.lower()
        
        extractors = {
            '.pdf': (DocumentService.extract_pdf_text, 'pdf'),
            '.docx': (DocumentService.extract_docx_text, 'docx'),
            '.txt': (DocumentService.extract_txt_text, 'txt'),
            '.md': (DocumentService.extract_txt_text, 'markdown'),
            '.png': (DocumentService.extract_image_text, 'image'),
            '.jpg': (DocumentService.extract_image_text, 'image'),
            '.jpeg': (DocumentService.extract_image_text, 'image'),
            '.gif': (DocumentService.extract_image_text, 'image'),
            '.bmp': (DocumentService.extract_image_text, 'image'),
            '.xml': (DocumentService.extract_xml_text, 'xml'),
        }
        
        if file_extension in extractors:
            extractor, file_type = extractors[file_extension]
            text = extractor(file_path)
            return text, file_type
        else:
            raise ValueError(f"Unsupported file type: {file_extension}")
