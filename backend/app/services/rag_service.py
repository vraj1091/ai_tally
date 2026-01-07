"""
Combined RAG Service
Integrates Tally data + Documents with Phi4:14b
CPU-ONLY MODE - No GPU required
"""

import logging
import os
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

# Force CPU mode for all AI components
os.environ["CUDA_VISIBLE_DEVICES"] = ""
os.environ["TORCH_DEVICE"] = "cpu"

# Lazy imports to prevent failures
_langchain_available = None
HuggingFaceEmbeddings = None
Chroma = None
Ollama = None
RetrievalQA = None
Document = None

def _init_langchain():
    """Initialize langchain components lazily (CPU-only)"""
    global _langchain_available, HuggingFaceEmbeddings, Chroma, Ollama, RetrievalQA, Document
    
    if _langchain_available is not None:
        return _langchain_available
    
    try:
        # Force CPU before importing torch-dependent libraries
        try:
            import torch
            torch.set_default_device('cpu')
            logger.info(f"PyTorch set to CPU mode (CUDA available: {torch.cuda.is_available()})")
        except Exception as e:
            logger.warning(f"Could not set torch device: {e}")
        
        from langchain.embeddings import HuggingFaceEmbeddings as HFE
        from langchain.vectorstores import Chroma as ChromaVS
        from langchain.llms import Ollama as OllamaLLM
        from langchain.chains import RetrievalQA as RQA
        from langchain.schema import Document as Doc
        
        HuggingFaceEmbeddings = HFE
        Chroma = ChromaVS
        Ollama = OllamaLLM
        RetrievalQA = RQA
        Document = Doc
        _langchain_available = True
        logger.info("✓ LangChain loaded successfully (CPU mode)")
    except ImportError:
        try:
            from langchain_community.embeddings import HuggingFaceEmbeddings as HFE
            from langchain_community.vectorstores import Chroma as ChromaVS
            from langchain_community.llms import Ollama as OllamaLLM
            from langchain.chains import RetrievalQA as RQA
            from langchain_core.documents import Document as Doc
            
            HuggingFaceEmbeddings = HFE
            Chroma = ChromaVS
            Ollama = OllamaLLM
            RetrievalQA = RQA
            Document = Doc
            _langchain_available = True
            logger.info("✓ LangChain Community loaded successfully (CPU mode)")
        except Exception as e:
            logger.warning(f"LangChain not available: {e}")
            _langchain_available = False
            
            # Create mock implementations
            class MockDoc:
                def __init__(self, page_content, metadata=None):
                    self.page_content = page_content
                    self.metadata = metadata or {}
            Document = MockDoc
    
    return _langchain_available

# Simple Document class for when langchain isn't available
class SimpleDocument:
    def __init__(self, page_content, metadata=None):
        self.page_content = page_content
        self.metadata = metadata or {}

# Make Document available immediately with a simple version
Document = SimpleDocument

from app.config import Config

# Lazy import of services
def _get_tally_service():
    from app.services.tally_service import TallyDataService
    return TallyDataService

def _get_chunking_service():
    from app.services.chunking_service import ChunkingService
    return ChunkingService


class CombinedRAGService:
    """Combined RAG service for Tally data + Documents"""
    
    def __init__(self):
        self.config = Config
        self.embeddings = None
        self.vector_store = None
        self.qa_chain = None
        self.llm = None
        self.chunking_service = None
        self.tally_service = None
        self.available = False
        self._initialize()
    
    def _initialize(self):
        """Initialize RAG components"""
        try:
            # Initialize chunking service
            ChunkingService = _get_chunking_service()
            self.chunking_service = ChunkingService(
                chunk_size=getattr(self.config, 'CHUNK_SIZE', 1000),
                chunk_overlap=getattr(self.config, 'CHUNK_OVERLAP', 200)
            )
            
            # Try to initialize langchain (CPU-only)
            if _init_langchain() and HuggingFaceEmbeddings:
                try:
                    # Force CPU device for embeddings
                    self.embeddings = HuggingFaceEmbeddings(
                        model_name=getattr(self.config, 'EMBEDDINGS_MODEL', 'sentence-transformers/all-MiniLM-L6-v2'),
                        model_kwargs={'device': 'cpu'},
                        encode_kwargs={'device': 'cpu'}
                    )
                    self._initialize_llm()
                    self.available = True
                    logger.info("✓ RAG Service initialized with embeddings (CPU mode)")
                except Exception as e:
                    logger.warning(f"Could not initialize embeddings: {e}")
                    self.available = False
            else:
                logger.warning("RAG Service running in limited mode (no embeddings)")
                self.available = False
                
        except Exception as e:
            logger.error(f"Error initializing RAG service: {e}")
            self.available = False
    
    def _initialize_llm(self):
        """Initialize Phi4:14b via Ollama"""
        if not Ollama:
            return
        
        try:
            self.llm = Ollama(
                model=getattr(self.config, 'OLLAMA_MODEL', 'phi4:14b'),
                base_url=getattr(self.config, 'OLLAMA_BASE_URL', 'http://localhost:11434'),
                temperature=getattr(self.config, 'OLLAMA_TEMPERATURE', 0.7),
                top_p=getattr(self.config, 'OLLAMA_TOP_P', 0.9),
                top_k=getattr(self.config, 'OLLAMA_TOP_K', 40)
            )
            logger.info(f"✓ LLM initialized: {self.config.OLLAMA_MODEL}")
        except Exception as e:
            logger.error(f"Error initializing LLM: {e}")
    
    def set_tally_service(self, tally_url: str):
        """Set Tally service with custom URL"""
        TallyDataService = _get_tally_service()
        self.tally_service = TallyDataService(tally_url)
    
    def ingest_combined_data(
        self,
        company_name: str,
        documents: List = None,
        collection_name: str = "tally_combined",
        tally_url: str = None
    ) -> bool:
        """Ingest both Tally data and uploaded documents"""
        if not self.available:
            logger.warning("RAG Service not available for ingestion")
            return False
        
        try:
            all_docs = []
            TallyDataService = _get_tally_service()
            
            # Initialize Tally service
            if tally_url:
                self.set_tally_service(tally_url)
            elif not self.tally_service:
                self.tally_service = TallyDataService(self.config.TALLY_URL)
            
            # 1. Fetch and chunk Tally data
            logger.info(f"Fetching Tally data for company: {company_name}")
            tally_docs = self.tally_service.convert_tally_data_to_documents(company_name)
            
            if tally_docs:
                tally_chunks = self.chunking_service.chunk_tally_data(tally_docs)
                all_docs.extend(tally_chunks)
                logger.info(f"✓ Added {len(tally_chunks)} Tally data chunks")
            
            # 2. Chunk uploaded documents
            if documents:
                doc_chunks = self.chunking_service.chunk_uploaded_documents(documents)
                all_docs.extend(doc_chunks)
                logger.info(f"✓ Added {len(doc_chunks)} document chunks")
            
            # 3. Ingest into ChromaDB
            if all_docs and Chroma:
                self.vector_store = Chroma.from_documents(
                    documents=all_docs,
                    embedding=self.embeddings,
                    persist_directory=self.config.CHROMA_DB_PATH,
                    collection_name=collection_name,
                    collection_metadata={"hnsw:space": "cosine"}
                )
                
                self._create_qa_chain()
                
                logger.info(f"✓ Ingested {len(all_docs)} total chunks into {collection_name}")
                return True
            
            logger.warning("No documents to ingest")
            return False
            
        except Exception as e:
            logger.error(f"Error ingesting combined data: {e}")
            return False
    
    def _create_qa_chain(self):
        """Create RAG chain with Phi4"""
        if self.vector_store and RetrievalQA and self.llm:
            self.qa_chain = RetrievalQA.from_chain_type(
                llm=self.llm,
                chain_type="stuff",
                retriever=self.vector_store.as_retriever(
                    search_kwargs={"k": getattr(self.config, 'TOP_K_RETRIEVAL', 5)}
                ),
                return_source_documents=True,
                verbose=getattr(self.config, 'DEBUG', False)
            )
    
    def query(self, query_text: str, search_all_collections: bool = True, general_mode: bool = False) -> Dict:
        """Query combined data (Tally + Documents) or use general LLM chat"""
        try:
            # Try to auto-initialize if not already done
            if not self.qa_chain and search_all_collections and not general_mode and self.available:
                logger.info("Auto-initializing RAG with uploaded documents")
                self.load_all_documents()
            
            if not self.qa_chain:
                # Fallback to direct LLM for general chat
                logger.info("Using direct LLM for general chat (no documents loaded)")
                try:
                    import requests
                    ollama_url = getattr(self.config, 'OLLAMA_BASE_URL', 'http://localhost:11434')
                    ollama_response = requests.post(
                        f"{ollama_url}/api/generate",
                        json={
                            "model": getattr(self.config, 'OLLAMA_MODEL', 'phi4:14b'),
                            "prompt": f"You are a helpful AI assistant for TallyDash Pro, a business analytics platform. Answer the following question concisely and helpfully:\n\nQuestion: {query_text}\n\nAnswer:",
                            "stream": False
                        },
                        timeout=60
                    )
                    
                    if ollama_response.status_code == 200:
                        answer = ollama_response.json().get("response", "I couldn't generate a response.")
                        return {
                            "answer": answer,
                            "query": query_text,
                            "sources": [],
                            "tally_sources": [],
                            "document_sources": [],
                            "success": True
                        }
                except Exception as e:
                    logger.error(f"Error calling Ollama directly: {e}")
                
                return {
                    "answer": "RAG service not available. Please ensure sentence-transformers and chromadb are installed.",
                    "sources": [],
                    "tally_sources": [],
                    "document_sources": [],
                    "success": False
                }
            
            result = self.qa_chain({"query": query_text})
            
            # Separate sources by type
            tally_sources = []
            document_sources = []
            
            if "source_documents" in result:
                for doc in result["source_documents"]:
                    source_info = {
                        "content": doc.page_content[:200],
                        "metadata": doc.metadata
                    }
                    
                    source_type = doc.metadata.get("source_type", "unknown")
                    if source_type == "tally":
                        tally_sources.append(source_info)
                    else:
                        document_sources.append(source_info)
            
            return {
                "answer": result.get("result", ""),
                "sources": result.get("source_documents", []),
                "tally_sources": tally_sources,
                "document_sources": document_sources,
                "success": True,
                "query": query_text
            }
            
        except Exception as e:
            logger.error(f"Error querying: {e}")
            return {
                "answer": f"Error: {str(e)}",
                "sources": [],
                "tally_sources": [],
                "document_sources": [],
                "success": False
            }
    
    def load_all_documents(self) -> bool:
        """Load all available document collections"""
        if not self.available or not Chroma:
            return False
        
        try:
            logger.info("Loading all document collections...")
            
            self.vector_store = Chroma(
                collection_name="uploaded_documents",
                embedding_function=self.embeddings,
                persist_directory=self.config.CHROMA_DB_PATH
            )
            
            doc_count = self.vector_store._collection.count()
            
            if doc_count > 0:
                self._create_qa_chain()
                logger.info(f"✓ Loaded {doc_count} documents from uploaded_documents collection")
                return True
            else:
                logger.warning("uploaded_documents collection is empty")
                return False
                
        except Exception as e:
            logger.warning(f"Could not load uploaded_documents collection: {e}")
            return False
    
    def load_collection(self, collection_name: str):
        """Load existing ChromaDB collection"""
        if not self.available or not Chroma:
            return False
        
        try:
            self.vector_store = Chroma(
                collection_name=collection_name,
                embedding_function=self.embeddings,
                persist_directory=self.config.CHROMA_DB_PATH
            )
            self._create_qa_chain()
            logger.info(f"✓ Loaded collection: {collection_name}")
            return True
        except Exception as e:
            logger.error(f"Error loading collection: {e}")
            return False
    
    def list_collections(self) -> List[str]:
        """List all ChromaDB collections"""
        if not self.available or not Chroma:
            return []
        
        try:
            client = Chroma(
                persist_directory=self.config.CHROMA_DB_PATH,
                embedding_function=self.embeddings
            )._client
            collections = client.list_collections()
            return [c.name for c in collections]
        except Exception as e:
            logger.error(f"Error listing collections: {e}")
            return []
