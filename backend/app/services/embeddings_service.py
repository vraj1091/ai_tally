"""
Embeddings Service
Manages text embeddings for semantic search
"""

from typing import List, Optional
import logging

logger = logging.getLogger(__name__)

# Lazy import for sentence_transformers
SentenceTransformer = None

def _load_sentence_transformer():
    """Lazy load SentenceTransformer"""
    global SentenceTransformer
    if SentenceTransformer is None:
        try:
            from sentence_transformers import SentenceTransformer as ST
            SentenceTransformer = ST
        except ImportError:
            logger.warning("sentence-transformers not available - embeddings disabled")
            SentenceTransformer = None
    return SentenceTransformer

class EmbeddingsService:
    """Service for generating text embeddings"""
    
    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        self.model_name = model_name
        self.model = None
        self.available = False
        self._load_model()
    
    def _load_model(self):
        """Load the embedding model"""
        try:
            ST = _load_sentence_transformer()
            if ST is None:
                logger.warning("Embeddings service unavailable - sentence-transformers not installed")
                return
            
            logger.info(f"Loading embeddings model: {self.model_name}")
            self.model = ST(self.model_name)
            self.available = True
            logger.info(f"✓ Embeddings model loaded successfully")
        except Exception as e:
            logger.error(f"Error loading embeddings model: {e}")
            self.available = False
    
    def embed_text(self, text: str) -> List[float]:
        """
        Generate embedding for a single text
        
        Args:
            text: Input text string
            
        Returns:
            List of float values (embedding vector)
        """
        if not self.available or not self.model:
            return []
        
        try:
            if not text or not text.strip():
                return []
            
            embedding = self.model.encode(text, convert_to_numpy=True)
            return embedding.tolist()
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            return []
    
    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts
        
        Args:
            texts: List of text strings
            
        Returns:
            List of embedding vectors
        """
        if not self.available or not self.model:
            return []
        
        try:
            if not texts:
                return []
            
            # Filter out empty texts
            valid_texts = [t for t in texts if t and t.strip()]
            
            if not valid_texts:
                return []
            
            embeddings = self.model.encode(valid_texts, convert_to_numpy=True)
            return embeddings.tolist()
        except Exception as e:
            logger.error(f"Error generating embeddings: {e}")
            return []
    
    def compute_similarity(self, text1: str, text2: str) -> float:
        """
        Compute cosine similarity between two texts
        
        Args:
            text1: First text
            text2: Second text
            
        Returns:
            Similarity score (0 to 1)
        """
        if not self.available:
            return 0.0
        
        try:
            import numpy as np
            emb1 = np.array(self.embed_text(text1))
            emb2 = np.array(self.embed_text(text2))
            
            if len(emb1) == 0 or len(emb2) == 0:
                return 0.0
            
            # Cosine similarity
            similarity = np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2))
            return float(similarity)
        except Exception as e:
            logger.error(f"Error computing similarity: {e}")
            return 0.0
