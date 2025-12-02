"""
Enhanced Caching Service with Offline Support
Saves Tally data when connected, serves cached data when offline
"""
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from pathlib import Path
import sqlite3
from contextlib import contextmanager

logger = logging.getLogger(__name__)

class EnhancedCacheService:
    """Advanced caching with persistence and offline support"""
    
    def __init__(self, cache_dir: str = "./cache"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(exist_ok=True)
        self.db_path = self.cache_dir / "tally_cache.db"
        self._init_database()
        
    def _init_database(self):
        """Initialize SQLite database for persistent caching"""
        with self._get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS cache_entries (
                    cache_key TEXT PRIMARY KEY,
                    user_id INTEGER,
                    data_type TEXT,
                    data TEXT,
                    created_at TIMESTAMP,
                    expires_at TIMESTAMP,
                    connection_status TEXT,
                    metadata TEXT
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS tally_connection_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    connected BOOLEAN,
                    timestamp TIMESTAMP,
                    details TEXT
                )
            """)
            
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_cache_user 
                ON cache_entries(user_id)
            """)
            
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_cache_type 
                ON cache_entries(data_type)
            """)
            
            conn.commit()
            logger.info("✓ Cache database initialized")
    
    @contextmanager
    def _get_connection(self):
        """Context manager for database connections"""
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()
    
    def save_tally_data(
        self,
        user_id: int,
        data_type: str,
        data: Any,
        key: str,
        ttl_hours: int = 24,
        metadata: Optional[Dict] = None
    ) -> bool:
        """
        Save Tally data to cache when connected
        
        Args:
            user_id: User ID
            data_type: Type of data (companies, ledgers, vouchers, etc.)
            data: Actual data to cache
            key: Cache key
            ttl_hours: Time to live in hours
            metadata: Additional metadata
            
        Returns:
            Success status
        """
        try:
            created_at = datetime.now()
            expires_at = created_at + timedelta(hours=ttl_hours)
            
            cache_key = f"user_{user_id}:{data_type}:{key}"
            
            with self._get_connection() as conn:
                # Delete old entry if exists
                conn.execute("DELETE FROM cache_entries WHERE cache_key = ?", (cache_key,))
                
                # Insert new entry
                conn.execute("""
                    INSERT INTO cache_entries 
                    (cache_key, user_id, data_type, data, created_at, expires_at, connection_status, metadata)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    cache_key,
                    user_id,
                    data_type,
                    json.dumps(data),
                    created_at,
                    expires_at,
                    'connected',
                    json.dumps(metadata or {})
                ))
                
                conn.commit()
                
            logger.info(f"✓ Cached {data_type} for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"✗ Cache save error: {e}")
            return False
    
    def get_cached_data(
        self,
        user_id: int,
        data_type: str,
        key: str,
        allow_expired: bool = False
    ) -> Optional[Any]:
        """
        Retrieve cached data (for offline mode)
        
        Args:
            user_id: User ID
            data_type: Type of data
            key: Cache key
            allow_expired: Return expired data if no connection
            
        Returns:
            Cached data or None
        """
        try:
            cache_key = f"user_{user_id}:{data_type}:{key}"
            
            with self._get_connection() as conn:
                query = """
                    SELECT data, created_at, expires_at, metadata
                    FROM cache_entries
                    WHERE cache_key = ? AND user_id = ?
                """
                
                if not allow_expired:
                    query += " AND expires_at > datetime('now')"
                
                result = conn.execute(query, (cache_key, user_id)).fetchone()
                
                if result:
                    data = json.loads(result['data'])
                    age = datetime.now() - datetime.fromisoformat(result['created_at'])
                    
                    logger.info(f"✓ Cache hit for {data_type} (age: {age.seconds}s)")
                    return {
                        'data': data,
                        'cached_at': result['created_at'],
                        'expires_at': result['expires_at'],
                        'age_seconds': age.seconds,
                        'metadata': json.loads(result['metadata'])
                    }
                
                logger.warning(f"⚠ Cache miss for {data_type}")
                return None
                
        except Exception as e:
            logger.error(f"✗ Cache retrieval error: {e}")
            return None
    
    def get_latest_cached(
        self,
        user_id: int,
        data_type: str
    ) -> Optional[List[Dict]]:
        """Get all latest cached data of a type for offline mode"""
        try:
            with self._get_connection() as conn:
                results = conn.execute("""
                    SELECT cache_key, data, created_at, expires_at
                    FROM cache_entries
                    WHERE user_id = ? AND data_type = ?
                    ORDER BY created_at DESC
                """, (user_id, data_type)).fetchall()
                
                return [
                    {
                        'key': r['cache_key'],
                        'data': json.loads(r['data']),
                        'cached_at': r['created_at'],
                        'expires_at': r['expires_at']
                    }
                    for r in results
                ]
                
        except Exception as e:
            logger.error(f"✗ Error fetching latest cache: {e}")
            return None
    
    def log_connection_status(
        self,
        user_id: int,
        connected: bool,
        details: Optional[Dict] = None
    ):
        """Log Tally connection status changes"""
        try:
            with self._get_connection() as conn:
                conn.execute("""
                    INSERT INTO tally_connection_log (user_id, connected, timestamp, details)
                    VALUES (?, ?, ?, ?)
                """, (
                    user_id,
                    connected,
                    datetime.now(),
                    json.dumps(details or {})
                ))
                conn.commit()
                
            logger.info(f"✓ Logged connection status: {'Connected' if connected else 'Disconnected'}")
            
        except Exception as e:
            logger.error(f"✗ Connection log error: {e}")
    
    def clear_expired_cache(self, user_id: Optional[int] = None):
        """Remove expired cache entries"""
        try:
            with self._get_connection() as conn:
                if user_id:
                    deleted = conn.execute("""
                        DELETE FROM cache_entries
                        WHERE user_id = ? AND expires_at < datetime('now')
                    """, (user_id,)).rowcount
                else:
                    deleted = conn.execute("""
                        DELETE FROM cache_entries
                        WHERE expires_at < datetime('now')
                    """).rowcount
                    
                conn.commit()
                logger.info(f"✓ Cleared {deleted} expired cache entries")
                
        except Exception as e:
            logger.error(f"✗ Cache cleanup error: {e}")
    
    def get_cache_stats(self, user_id: int) -> Dict[str, Any]:
        """Get cache statistics for user"""
        try:
            with self._get_connection() as conn:
                stats = {}
                
                # Total entries
                result = conn.execute("""
                    SELECT COUNT(*) as count FROM cache_entries WHERE user_id = ?
                """, (user_id,)).fetchone()
                stats['total_entries'] = result['count']
                
                # By type
                results = conn.execute("""
                    SELECT data_type, COUNT(*) as count
                    FROM cache_entries
                    WHERE user_id = ?
                    GROUP BY data_type
                """, (user_id,)).fetchall()
                stats['by_type'] = {r['data_type']: r['count'] for r in results}
                
                # Expired entries
                result = conn.execute("""
                    SELECT COUNT(*) as count 
                    FROM cache_entries 
                    WHERE user_id = ? AND expires_at < datetime('now')
                """, (user_id,)).fetchone()
                stats['expired'] = result['count']
                
                # Last connection
                result = conn.execute("""
                    SELECT connected, timestamp
                    FROM tally_connection_log
                    WHERE user_id = ?
                    ORDER BY timestamp DESC
                    LIMIT 1
                """, (user_id,)).fetchone()
                
                if result:
                    stats['last_connection'] = {
                        'connected': bool(result['connected']),
                        'timestamp': result['timestamp']
                    }
                
                return stats
                
        except Exception as e:
            logger.error(f"✗ Stats error: {e}")
            return {}
    
    def clear_user_cache(self, user_id: int):
        """Clear all cache for a user"""
        try:
            with self._get_connection() as conn:
                conn.execute("DELETE FROM cache_entries WHERE user_id = ?", (user_id,))
                conn.commit()
                logger.info(f"✓ Cleared all cache for user {user_id}")
                
        except Exception as e:
            logger.error(f"✗ Cache clear error: {e}")

# Global instance
cache_service = EnhancedCacheService()

