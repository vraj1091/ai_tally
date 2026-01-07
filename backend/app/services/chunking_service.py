 
"""
Chunking Service
Intelligent text chunking for both Tally data and documents
"""

from typing import List, Dict
try:
    from langchain.text_splitter import RecursiveCharacterTextSplitter
    from langchain.schema import Document
except ImportError:
    # Fallback for newer langchain versions
    try:
        from langchain_text_splitters import RecursiveCharacterTextSplitter
        from langchain_core.documents import Document
    except ImportError:
        # If langchain is not available, create mock implementations
        class RecursiveCharacterTextSplitter:
            def __init__(self, **kwargs):
                self.chunk_size = kwargs.get('chunk_size', 512)
                self.chunk_overlap = kwargs.get('chunk_overlap', 50)
            def split_text(self, text):
                # Simple splitting by chunks
                chunks = []
                for i in range(0, len(text), self.chunk_size - self.chunk_overlap):
                    chunks.append(text[i:i + self.chunk_size])
                return chunks
        class Document:
            def __init__(self, page_content, metadata=None):
                self.page_content = page_content
                self.metadata = metadata or {}
import logging

logger = logging.getLogger(__name__)

class ChunkingService:
    """Service for intelligent text chunking"""
    
    def __init__(self, chunk_size: int = 512, chunk_overlap: int = 50):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", ". ", " ", ""],
            length_function=len
        )
    
    def chunk_text(self, text: str, metadata: Dict = None) -> List[Document]:
        """Split text into chunks with metadata"""
        if not text or not text.strip():
            return []
        
        chunks = self.text_splitter.split_text(text)
        
        documents = []
        for i, chunk in enumerate(chunks):
            doc_metadata = metadata.copy() if metadata else {}
            doc_metadata["chunk_id"] = i
            doc_metadata["chunk_count"] = len(chunks)
            
            doc = Document(
                page_content=chunk,
                metadata=doc_metadata
            )
            documents.append(doc)
        
        return documents
    
    def chunk_tally_data(self, tally_docs: List[Document]) -> List[Document]:
        """Chunk Tally data intelligently"""
        chunked_docs = []
        
        for doc in tally_docs:
            metadata = {
                **doc.metadata,
                "source_type": "tally",
                "original_source": doc.metadata.get("source", "unknown")
            }
            
            chunks = self.chunk_text(doc.page_content, metadata)
            chunked_docs.extend(chunks)
        
        logger.info(f"Chunked {len(tally_docs)} Tally documents into {len(chunked_docs)} chunks")
        return chunked_docs
    
    def chunk_uploaded_documents(self, doc_list: List[Document]) -> List[Document]:
        """Chunk uploaded documents"""
        chunked_docs = []
        
        for doc in doc_list:
            metadata = {
                **doc.metadata,
                "source_type": "uploaded",
                "document_type": doc.metadata.get("type", "unknown")
            }
            
            chunks = self.chunk_text(doc.page_content, metadata)
            chunked_docs.extend(chunks)
        
        logger.info(f"Chunked {len(doc_list)} uploaded documents into {len(chunked_docs)} chunks")
        return chunked_docs
