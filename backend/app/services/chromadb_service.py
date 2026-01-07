"""
ChromaDB Service
Vector database management
"""

from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)

# Lazy imports
_chromadb = None
_chromadb_available = None

def _load_chromadb():
    """Lazy load ChromaDB"""
    global _chromadb, _chromadb_available
    if _chromadb_available is None:
        try:
            import chromadb
            _chromadb = chromadb
            _chromadb_available = True
            logger.info("✓ ChromaDB loaded successfully")
        except ImportError as e:
            logger.warning(f"ChromaDB not available: {e}")
            _chromadb_available = False
    return _chromadb if _chromadb_available else None

class ChromaDBService:
    """Service for ChromaDB vector database operations"""
    
    def __init__(self, persist_directory: str = "./chroma_db"):
        self.persist_directory = persist_directory
        self.client = None
        self.available = False
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize ChromaDB persistent client"""
        chromadb = _load_chromadb()
        if chromadb is None:
            logger.warning("ChromaDB not available - vector store disabled")
            return
        
        try:
            from chromadb.config import Settings
            # Use PersistentClient for data persistence
            self.client = chromadb.PersistentClient(
                path=self.persist_directory,
                settings=Settings(
                    anonymized_telemetry=False,
                    allow_reset=True
                )
            )
            self.available = True
            logger.info(f"✓ ChromaDB persistent client initialized at {self.persist_directory}")
        except Exception as e:
            logger.error(f"Error initializing ChromaDB: {e}")
            self.available = False
    
    def _get_embedding_function(self):
        """Get embedding function if available"""
        try:
            from chromadb.utils import embedding_functions
            return embedding_functions.SentenceTransformerEmbeddingFunction(
                model_name="sentence-transformers/all-MiniLM-L6-v2"
            )
        except Exception as e:
            logger.warning(f"Embedding function not available: {e}")
            return None
    
    def create_collection(self, name: str, metadata: Optional[Dict] = None):
        """Create a new collection with default embedding function"""
        if not self.available or not self.client:
            logger.warning("ChromaDB not available")
            return None
        
        try:
            embedding_function = self._get_embedding_function()
            
            if embedding_function:
                collection = self.client.create_collection(
                    name=name,
                    metadata=metadata or {},
                    embedding_function=embedding_function
                )
            else:
                collection = self.client.create_collection(
                    name=name,
                    metadata=metadata or {}
                )
            logger.info(f"✓ Collection created: {name}")
            return collection
        except Exception as e:
            logger.error(f"Error creating collection: {e}")
            return None
    
    def get_collection(self, name: str):
        """Get an existing collection with embedding function"""
        if not self.available or not self.client:
            return None
        
        try:
            embedding_function = self._get_embedding_function()
            
            if embedding_function:
                collection = self.client.get_collection(
                    name=name,
                    embedding_function=embedding_function
                )
            else:
                collection = self.client.get_collection(name=name)
            logger.info(f"✓ Collection retrieved: {name}")
            return collection
        except Exception as e:
            logger.error(f"Error getting collection: {e}")
            return None
    
    def delete_collection(self, name: str):
        """Delete a collection"""
        if not self.available or not self.client:
            return False
        
        try:
            self.client.delete_collection(name=name)
            logger.info(f"✓ Collection deleted: {name}")
            return True
        except Exception as e:
            logger.error(f"Error deleting collection: {e}")
            return False
    
    def list_collections(self) -> List[str]:
        """List all collections"""
        if not self.available or not self.client:
            return []
        
        try:
            collections = self.client.list_collections()
            return [c.name for c in collections]
        except Exception as e:
            logger.error(f"Error listing collections: {e}")
            return []
    
    def add_documents(
        self,
        collection_name: str,
        documents: List[str],
        metadatas: List[Dict],
        ids: List[str]
    ):
        """Add documents to a collection"""
        if not self.available:
            return False
        
        try:
            collection = self.get_collection(collection_name)
            if not collection:
                collection = self.create_collection(collection_name)
            
            if not collection:
                return False
            
            collection.add(
                documents=documents,
                metadatas=metadatas,
                ids=ids
            )
            logger.info(f"✓ Added {len(documents)} documents to {collection_name}")
            return True
        except Exception as e:
            logger.error(f"Error adding documents: {e}")
            return False
    
    def query_collection(
        self,
        collection_name: str,
        query_texts: List[str],
        n_results: int = 5
    ) -> Dict:
        """Query a collection with embedding-based search"""
        if not self.available:
            return {}
        
        try:
            collection = self.get_collection(collection_name)
            if not collection:
                logger.warning(f"Collection not found: {collection_name}")
                return {}
            
            results = collection.query(
                query_texts=query_texts,
                n_results=n_results
            )
            logger.info(f"✓ Queried {collection_name}, found {len(results.get('documents', [[]])[0])} results")
            return results
        except Exception as e:
            logger.error(f"Error querying collection: {e}")
            return {}
    
    def get_collection_count(self, collection_name: str) -> int:
        """Get document count in a collection"""
        if not self.available:
            return 0
        
        try:
            collection = self.get_collection(collection_name)
            if collection:
                return collection.count()
            return 0
        except Exception as e:
            logger.error(f"Error getting collection count: {e}")
            return 0
