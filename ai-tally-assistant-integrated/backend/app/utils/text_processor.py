"""
Text Processor
Text cleaning and preprocessing utilities
"""

import re
from typing import List
import logging

logger = logging.getLogger(__name__)

class TextProcessor:
    """Text processing and cleaning utilities"""
    
    @staticmethod
    def clean_text(text: str) -> str:
        """Clean and normalize text"""
        if not text:
            return ""
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove special characters (keep basic punctuation)
        text = re.sub(r'[^\w\s.,!?-]', '', text)
        
        # Strip leading/trailing whitespace
        text = text.strip()
        
        return text
    
    @staticmethod
    def remove_urls(text: str) -> str:
        """Remove URLs from text"""
        return re.sub(r'http[s]?://\S+', '', text)
    
    @staticmethod
    def remove_emails(text: str) -> str:
        """Remove email addresses from text"""
        return re.sub(r'\S+@\S+', '', text)
    
    @staticmethod
    def normalize_whitespace(text: str) -> str:
        """Normalize whitespace"""
        return re.sub(r'\s+', ' ', text).strip()
    
    @staticmethod
    def split_sentences(text: str) -> List[str]:
        """Split text into sentences"""
        sentences = re.split(r'[.!?]+', text)
        return [s.strip() for s in sentences if s.strip()]
    
    @staticmethod
    def extract_numbers(text: str) -> List[float]:
        """Extract numbers from text"""
        numbers = re.findall(r'-?\d+\.?\d*', text)
        return [float(n) for n in numbers]
 
