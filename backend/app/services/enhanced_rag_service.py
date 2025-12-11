"""
Enhanced RAG Service with Tally Data Integration
Combines uploaded documents with real-time Tally data for intelligent responses
"""
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import json

logger = logging.getLogger(__name__)

class EnhancedRAGService:
    """
    Enhanced RAG combining:
    1. Uploaded documents (PDFs, Excel, CSV)
    2. Real-time Tally data
    3. Cached Tally data (offline mode)
    4. ChromaDB vector search
    """
    
    def __init__(self, chromadb_service, tally_service, cache_service, embeddings_service):
        self.chromadb = chromadb_service
        self.tally = tally_service
        self.cache = cache_service
        self.embeddings = embeddings_service
        logger.info("✓ Enhanced RAG Service initialized")
    
    async def query(
        self,
        user_query: str,
        user_id: int,
        include_tally: bool = True,
        include_documents: bool = True,
        top_k: int = 5
    ) -> Dict[str, Any]:
        """
        Enhanced query that searches both documents and Tally data
        
        Args:
            user_query: User's question
            user_id: User ID for context
            include_tally: Include Tally data in search
            include_documents: Include uploaded documents
            top_k: Number of results
            
        Returns:
            Combined results with sources
        """
        try:
            results = {
                'query': user_query,
                'timestamp': datetime.now().isoformat(),
                'sources': [],
                'tally_data': [],
                'documents': [],
                'answer': None
            }
            
            # 1. Search uploaded documents
            if include_documents:
                doc_results = await self._search_documents(user_query, user_id, top_k)
                results['documents'] = doc_results
                results['sources'].extend([
                    {
                        'type': 'document',
                        'title': doc.get('filename', 'Unknown'),
                        'content': doc.get('content', ''),
                        'score': doc.get('score', 0)
                    }
                    for doc in doc_results
                ])
            
            # 2. Search Tally data
            if include_tally:
                tally_results = await self._search_tally_data(user_query, user_id)
                results['tally_data'] = tally_results
                results['sources'].extend([
                    {
                        'type': 'tally',
                        'title': f"Tally: {item.get('type', 'data')}",
                        'content': json.dumps(item.get('data', {})),
                        'score': item.get('relevance', 0)
                    }
                    for item in tally_results
                ])
            
            # 3. Generate answer using combined context
            if results['sources']:
                results['answer'] = await self._generate_answer(
                    user_query,
                    results['sources']
                )
            
            logger.info(f"✓ Query processed: {len(results['sources'])} sources found")
            return results
            
        except Exception as e:
            logger.error(f"✗ Query error: {e}")
            return {
                'query': user_query,
                'error': str(e),
                'sources': []
            }
    
    async def _search_documents(
        self,
        query: str,
        user_id: int,
        top_k: int
    ) -> List[Dict]:
        """Search uploaded documents using vector similarity"""
        try:
            # Get query embedding
            query_embedding = self.embeddings.embed_query(query)
            
            # Search in ChromaDB
            results = self.chromadb.search(
                collection_name=f"user_{user_id}_documents",
                query_embedding=query_embedding,
                top_k=top_k
            )
            
            return [
                {
                    'filename': r.get('metadata', {}).get('filename', 'Unknown'),
                    'content': r.get('document', ''),
                    'score': r.get('distance', 0),
                    'metadata': r.get('metadata', {})
                }
                for r in (results or [])
            ]
            
        except Exception as e:
            logger.error(f"✗ Document search error: {e}")
            return []
    
    async def _search_tally_data(
        self,
        query: str,
        user_id: int
    ) -> List[Dict]:
        """
        Search Tally data (real-time or cached)
        Intelligently determines what data is relevant to the query
        """
        try:
            query_lower = query.lower()
            relevant_data = []
            
            # Determine what type of data is needed based on query
            data_types = self._identify_data_types(query_lower)
            
            for data_type in data_types:
                # Try real-time data first
                if self.tally.connected:
                    data = await self._fetch_realtime_tally(data_type, user_id)
                    if data:
                        relevant_data.append({
                            'type': data_type,
                            'source': 'realtime',
                            'data': data,
                            'relevance': self._calculate_relevance(query_lower, data)
                        })
                else:
                    # Fall back to cached data
                    cached = self.cache.get_cached_data(user_id, data_type, 'latest', allow_expired=True)
                    if cached:
                        relevant_data.append({
                            'type': data_type,
                            'source': 'cached',
                            'data': cached['data'],
                            'cached_at': cached['cached_at'],
                            'relevance': self._calculate_relevance(query_lower, cached['data'])
                        })
            
            # Sort by relevance
            relevant_data.sort(key=lambda x: x['relevance'], reverse=True)
            return relevant_data[:5]  # Top 5 most relevant
            
        except Exception as e:
            logger.error(f"✗ Tally search error: {e}")
            return []
    
    def _identify_data_types(self, query: str) -> List[str]:
        """Identify what Tally data types are relevant to the query"""
        data_types = []
        
        # Keywords mapping
        keywords_map = {
            'companies': ['company', 'companies', 'firm', 'business'],
            'ledgers': ['ledger', 'account', 'balance', 'accounts'],
            'vouchers': ['voucher', 'transaction', 'entry', 'entries', 'invoice'],
            'sales': ['sales', 'revenue', 'income', 'sold'],
            'purchases': ['purchase', 'bought', 'procurement', 'expense'],
            'inventory': ['stock', 'inventory', 'items', 'products'],
            'customers': ['customer', 'client', 'debtor', 'receivable'],
            'vendors': ['vendor', 'supplier', 'creditor', 'payable']
        }
        
        for data_type, keywords in keywords_map.items():
            if any(keyword in query for keyword in keywords):
                data_types.append(data_type)
        
        # If no specific type identified, include general ones
        if not data_types:
            data_types = ['ledgers', 'vouchers']
        
        return data_types
    
    async def _fetch_realtime_tally(
        self,
        data_type: str,
        user_id: int
    ) -> Optional[Dict]:
        """Fetch real-time data from Tally"""
        try:
            if data_type == 'companies':
                return self.tally.get_companies()
            elif data_type == 'ledgers':
                companies = self.tally.get_companies()
                if companies:
                    return self.tally.get_ledgers_for_company(companies[0].get('name'))
            elif data_type == 'vouchers':
                companies = self.tally.get_companies()
                if companies:
                    return self.tally.get_vouchers_for_company(companies[0].get('name'))
            
            return None
            
        except Exception as e:
            logger.error(f"✗ Realtime fetch error: {e}")
            return None
    
    def _calculate_relevance(self, query: str, data: Any) -> float:
        """Calculate relevance score between query and data"""
        try:
            if not data:
                return 0.0
            
            # Convert data to string for matching
            data_str = json.dumps(data).lower() if isinstance(data, (dict, list)) else str(data).lower()
            
            # Count keyword matches
            query_words = set(query.split())
            matches = sum(1 for word in query_words if word in data_str)
            
            # Normalize score
            score = matches / len(query_words) if query_words else 0.0
            return min(score, 1.0)
            
        except Exception as e:
            logger.error(f"✗ Relevance calculation error: {e}")
            return 0.0
    
    async def _generate_answer(
        self,
        query: str,
        sources: List[Dict]
    ) -> str:
        """Generate answer using LLM with combined context"""
        try:
            # Build context from sources
            context_parts = []
            
            for idx, source in enumerate(sources[:5], 1):  # Top 5 sources
                source_type = source.get('type', 'unknown')
                title = source.get('title', 'Unknown')
                content = source.get('content', '')
                
                # Truncate long content
                if len(content) > 500:
                    content = content[:500] + "..."
                
                context_parts.append(
                    f"Source {idx} ({source_type} - {title}):\n{content}\n"
                )
            
            context = "\n".join(context_parts)
            
            # Build prompt
            prompt = f"""Based on the following information, answer the user's question.

Context from documents and Tally data:
{context}

User Question: {query}

Answer (be specific, use data from context, cite sources):"""
            
            # Here you would call your LLM (Ollama Phi4)
            # For now, return a structured response
            answer = f"Based on the provided sources, here's the answer to: {query}\n\n"
            answer += f"I found {len(sources)} relevant sources:\n"
            
            for source in sources[:3]:
                answer += f"- {source.get('title')} ({source.get('type')})\n"
            
            return answer
            
        except Exception as e:
            logger.error(f"✗ Answer generation error: {e}")
            return "I encountered an error generating the answer. Please try rephrasing your question."
    
    def index_document(
        self,
        user_id: int,
        filename: str,
        content: str,
        metadata: Optional[Dict] = None
    ) -> bool:
        """Index a document for vector search"""
        try:
            # Generate embedding
            embedding = self.embeddings.embed_text(content)
            
            # Store in ChromaDB
            self.chromadb.add_document(
                collection_name=f"user_{user_id}_documents",
                document_id=f"{user_id}_{filename}_{datetime.now().timestamp()}",
                document=content,
                embedding=embedding,
                metadata={
                    'filename': filename,
                    'indexed_at': datetime.now().isoformat(),
                    **(metadata or {})
                }
            )
            
            logger.info(f"✓ Indexed document: {filename}")
            return True
            
        except Exception as e:
            logger.error(f"✗ Document indexing error: {e}")
            return False
    
    def get_stats(self, user_id: int) -> Dict[str, Any]:
        """Get RAG statistics"""
        try:
            return {
                'documents_indexed': self.chromadb.count_documents(f"user_{user_id}_documents"),
                'tally_connected': self.tally.connected,
                'cache_stats': self.cache.get_cache_stats(user_id)
            }
        except Exception as e:
            logger.error(f"✗ Stats error: {e}")
            return {}


