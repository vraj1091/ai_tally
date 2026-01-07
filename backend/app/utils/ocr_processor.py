"""
OCR Processor
Image text extraction using Tesseract
"""

from PIL import Image
import pytesseract
from typing import Dict
import logging

logger = logging.getLogger(__name__)

class OCRProcessor:
    """OCR text extraction from images"""
    
    @staticmethod
    def extract_text(image_path: str, lang: str = 'eng') -> str:
        """Extract text from image using OCR"""
        try:
            image = Image.open(image_path)
            text = pytesseract.image_to_string(image, lang=lang)
            return text
        except Exception as e:
            logger.error(f"Error in OCR: {e}")
            return ""
    
    @staticmethod
    def extract_with_confidence(image_path: str) -> Dict:
        """Extract text with confidence scores"""
        try:
            image = Image.open(image_path)
            data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
            
            text = " ".join([
                word for word, conf in zip(data['text'], data['conf'])
                if int(conf) > 0
            ])
            
            avg_confidence = sum(
                int(c) for c in data['conf'] if int(c) > 0
            ) / len([c for c in data['conf'] if int(c) > 0]) if data['conf'] else 0
            
            return {
                "text": text,
                "confidence": avg_confidence,
                "word_count": len([w for w in data['text'] if w.strip()])
            }
        except Exception as e:
            logger.error(f"Error in OCR with confidence: {e}")
            return {"text": "", "confidence": 0, "word_count": 0}
 
