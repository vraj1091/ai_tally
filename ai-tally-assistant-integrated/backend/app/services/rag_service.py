"""
Combined RAG Service
Integrates Tally data + Documents with Phi4:14b
"""

try:
    from langchain.embeddings import HuggingFaceEmbeddings
    from langchain.vectorstores import Chroma
    from langchain.llms import Ollama
    from langchain.chains import RetrievalQA
    from langchain.schema import Document
except ImportError:
    # Fallback for newer langchain versions or missing modules
    try:
        from langchain_community.embeddings import HuggingFaceEmbeddings
        from langchain_community.vectorstores import Chroma
        from langchain_community.llms import Ollama
        from langchain.chains import RetrievalQA
        from langchain_core.documents import Document
    except ImportError:
        # Create mock implementations if langchain is not available
        class HuggingFaceEmbeddings:
            def __init__(self, **kwargs):
                pass
        class Chroma:
            def __init__(self, **kwargs):
                pass
        class Ollama:
            def __init__(self, **kwargs):
                pass
        class RetrievalQA:
            @staticmethod
            def from_chain_type(**kwargs):
                return None
        class Document:
            def __init__(self, page_content, metadata=None):
                self.page_content = page_content
                self.metadata = metadata or {}

from app.config import Config
from app.services.tally_service import TallyDataService
from app.services.chunking_service import ChunkingService
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)

class CombinedRAGService:
    """Combined RAG service for Tally data + Documents"""
    
    def __init__(self):
        self.config = Config
        self.embeddings = HuggingFaceEmbeddings(
            model_name=self.config.EMBEDDINGS_MODEL
        )
        self.vector_store = None
        self.qa_chain = None
        self.llm = None
        self.chunking_service = ChunkingService(
            chunk_size=self.config.CHUNK_SIZE,
            chunk_overlap=self.config.CHUNK_OVERLAP
        )
        self.tally_service = None
        self._initialize_llm()
    
    def _initialize_llm(self):
        """Initialize Phi4:14b via Ollama"""
        try:
            self.llm = Ollama(
                model=self.config.OLLAMA_MODEL,
                base_url=self.config.OLLAMA_BASE_URL,
                temperature=self.config.OLLAMA_TEMPERATURE,
                top_p=self.config.OLLAMA_TOP_P,
                top_k=self.config.OLLAMA_TOP_K
            )
            logger.info(f"✓ LLM initialized: {self.config.OLLAMA_MODEL}")
        except Exception as e:
            logger.error(f"Error initializing LLM: {e}")
            raise
    
    def set_tally_service(self, tally_url: str):
        """Set Tally service with custom URL"""
        self.tally_service = TallyDataService(tally_url)
    
    def ingest_combined_data(
        self,
        company_name: str,
        documents: List[Document] = None,
        collection_name: str = "tally_combined",
        tally_url: str = None
    ) -> bool:
        """
        Ingest both Tally data and uploaded documents
        """
        try:
            all_docs = []
            
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
            if all_docs:
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
        if self.vector_store:
            self.qa_chain = RetrievalQA.from_chain_type(
                llm=self.llm,
                chain_type="stuff",
                retriever=self.vector_store.as_retriever(
                    search_kwargs={"k": self.config.TOP_K_RETRIEVAL}
                ),
                return_source_documents=True,
                verbose=self.config.DEBUG
            )
    
    def query(self, query_text: str, search_all_collections: bool = True) -> Dict:
        """
        Query combined data (Tally + Documents)
        
        Args:
            query_text: User's query
            search_all_collections: If True, searches across all available collections
        """
        try:
            # Try to auto-initialize if not already done
            if not self.qa_chain and search_all_collections:
                logger.info("Auto-initializing RAG with uploaded documents")
                self.load_all_documents()
            
            if not self.qa_chain:
                return {
                    "answer": "No documents available. Please upload documents or connect to Tally first.",
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
        """
        Load all available document collections (uploaded_documents, etc.)
        """
        try:
            logger.info("Loading all document collections...")
            
            # Try to load uploaded documents collection
            try:
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
                
        except Exception as e:
            logger.error(f"Error loading all documents: {e}")
            return False
    
    def load_collection(self, collection_name: str):
        """Load existing ChromaDB collection"""
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