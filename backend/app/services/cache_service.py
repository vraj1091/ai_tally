"""
Cache Service
In-memory and persistent caching for Tally data
"""

from cachetools import TTLCache
from typing import Dict, Any, Optional
import json
import os
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class CacheService:
    """Service for caching Tally data"""
    
    def __init__(self, ttl: int = 300, maxsize: int = 1000):
        """
        Initialize cache service
        
        Args:
            ttl: Time-to-live in seconds
            maxsize: Maximum cache size
        """
        self.memory_cache = TTLCache(maxsize=maxsize, ttl=ttl)
        self.cache_dir = "./cache"
        os.makedirs(self.cache_dir, exist_ok=True)
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        # Try memory cache first
        if key in self.memory_cache:
            logger.debug(f"Cache hit (memory): {key}")
            return self.memory_cache[key]
        
        # Try disk cache
        cache_file = os.path.join(self.cache_dir, f"{key}.json")
        if os.path.exists(cache_file):
            try:
                with open(cache_file, 'r') as f:
                    data = json.load(f)
                    
                # Check expiry
                if 'expiry' in data:
                    expiry = datetime.fromisoformat(data['expiry'])
                    if datetime.now() > expiry:
                        os.remove(cache_file)
                        return None
                
                logger.debug(f"Cache hit (disk): {key}")
                return data.get('value')
            except Exception as e:
                logger.error(f"Error reading cache: {e}")
        
        return None
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None):
        """Set value in cache"""
        # Store in memory cache
        self.memory_cache[key] = value
        
        # Store in disk cache
        try:
            cache_file = os.path.join(self.cache_dir, f"{key}.json")
            
            data = {
                'value': value,
                'created': datetime.now().isoformat()
            }
            
            if ttl:
                from datetime import timedelta
                expiry = datetime.now() + timedelta(seconds=ttl)
                data['expiry'] = expiry.isoformat()
            
            with open(cache_file, 'w') as f:
                json.dump(data, f)
            
            logger.debug(f"Cache set: {key}")
        except Exception as e:
            logger.error(f"Error writing cache: {e}")
    
    def delete(self, key: str):
        """Delete value from cache"""
        # Remove from memory
        if key in self.memory_cache:
            del self.memory_cache[key]
        
        # Remove from disk
        cache_file = os.path.join(self.cache_dir, f"{key}.json")
        if os.path.exists(cache_file):
            os.remove(cache_file)
        
        logger.debug(f"Cache deleted: {key}")
    
    def clear(self):
        """Clear all cache"""
        self.memory_cache.clear()
        
        # Clear disk cache
        for file in os.listdir(self.cache_dir):
            if file.endswith('.json'):
                os.remove(os.path.join(self.cache_dir, file))
        
        logger.info("Cache cleared")
    
    def get_stats(self) -> Dict:
        """Get cache statistics"""
        disk_files = [f for f in os.listdir(self.cache_dir) if f.endswith('.json')]
        
        return {
            "memory_size": len(self.memory_cache),
            "disk_size": len(disk_files),
            "cache_dir": self.cache_dir
        }
 
