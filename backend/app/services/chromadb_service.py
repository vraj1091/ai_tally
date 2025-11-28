"""
ChromaDB Service
Vector database management
"""

import chromadb
from chromadb.config import Settings
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)

class ChromaDBService:
    """Service for ChromaDB vector database operations"""
    
    def __init__(self, persist_directory: str = "./chroma_db"):
        self.persist_directory = persist_directory
        self.client = None
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize ChromaDB persistent client"""
        try:
            # Use PersistentClient for data persistence
            self.client = chromadb.PersistentClient(
                path=self.persist_directory,
                settings=Settings(
                    anonymized_telemetry=False,
                    allow_reset=True
                )
            )
            logger.info(f"✓ ChromaDB persistent client initialized at {self.persist_directory}")
        except Exception as e:
            logger.error(f"Error initializing ChromaDB: {e}")
            raise
    
    def create_collection(self, name: str, metadata: Optional[Dict] = None):
        """Create a new collection with default embedding function"""
        try:
            # Use sentence-transformers embedding function (default for ChromaDB)
            from chromadb.utils import embedding_functions
            
            # Use all-MiniLM-L6-v2 model (same as our EmbeddingsService)
            embedding_function = embedding_functions.SentenceTransformerEmbeddingFunction(
                model_name="sentence-transformers/all-MiniLM-L6-v2"
            )
            
            collection = self.client.create_collection(
                name=name,
                metadata=metadata or {},
                embedding_function=embedding_function
            )
            logger.info(f"✓ Collection created with embeddings: {name}")
            return collection
        except Exception as e:
            logger.error(f"Error creating collection: {e}")
            raise
    
    def get_collection(self, name: str):
        """Get an existing collection with embedding function"""
        try:
            from chromadb.utils import embedding_functions
            
            # Use same embedding function
            embedding_function = embedding_functions.SentenceTransformerEmbeddingFunction(
                model_name="sentence-transformers/all-MiniLM-L6-v2"
            )
            
            collection = self.client.get_collection(
                name=name,
                embedding_function=embedding_function
            )
            logger.info(f"✓ Collection retrieved: {name}")
            return collection
        except Exception as e:
            logger.error(f"Error getting collection: {e}")
            return None
    
    def delete_collection(self, name: str):
        """Delete a collection"""
        try:
            self.client.delete_collection(name=name)
            logger.info(f"✓ Collection deleted: {name}")
            return True
        except Exception as e:
            logger.error(f"Error deleting collection: {e}")
            return False
    
    def list_collections(self) -> List[str]:
        """List all collections"""
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
        try:
            collection = self.get_collection(collection_name)
            if not collection:
                collection = self.create_collection(collection_name)
            
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
        try:
            collection = self.get_collection(collection_name)
            if collection:
                return collection.count()
            return 0
        except Exception as e:
            logger.error(f"Error getting collection count: {e}")
            return 0
 
