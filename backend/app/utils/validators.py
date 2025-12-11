"""
Input Validators
Validation utilities for API requests
"""

import re
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class Validators:
    """Input validation utilities"""
    
    @staticmethod
    def validate_url(url: str) -> bool:
        """Validate URL format"""
        pattern = re.compile(
            r'^https?://'  # http:// or https://
            r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain
            r'localhost|'  # localhost
            r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # IP
            r'(?::\d+)?'  # optional port
            r'(?:/?|[/?]\S+)$', re.IGNORECASE)
        return pattern.match(url) is not None
    
    @staticmethod
    def validate_filename(filename: str, allowed_extensions: list) -> bool:
        """Validate filename and extension"""
        if not filename:
            return False
        
        ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
        return ext in allowed_extensions
    
    @staticmethod
    def validate_company_name(name: str) -> bool:
        """Validate company name"""
        if not name or not name.strip():
            return False
        
        # Check length
        if len(name) > 255:
            return False
        
        # Check for invalid characters
        if re.search(r'[<>:"/\\|?*]', name):
            return False
        
        return True
    
    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """Sanitize filename"""
        # Remove invalid characters
        filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
        
        # Limit length
        if len(filename) > 255:
            name, ext = filename.rsplit('.', 1) if '.' in filename else (filename, '')
            filename = name[:240] + ('.' + ext if ext else '')
        
        return filename
 
