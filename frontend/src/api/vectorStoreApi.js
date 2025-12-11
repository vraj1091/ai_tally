import apiClient from './client'

/**
 * Vector Store API - Connects to /api/vector-store endpoints
 * Manages ChromaDB collections for RAG (Retrieval Augmented Generation)
 */
export const vectorStoreApi = {
  /**
   * List all collections
   * GET /api/vector-store/collections
   */
  listCollections: async () => {
    try {
      const response = await apiClient.get('/vector-store/collections', {
        timeout: 30000
      })
      return response.data
    } catch (error) {
      console.error('Error listing collections:', error)
      return { collections: [], error: error.message }
    }
  },

  /**
   * Create a new collection
   * POST /api/vector-store/collections
   */
  createCollection: async (collectionName, metadata = {}) => {
    try {
      const response = await apiClient.post('/vector-store/collections', {
        collection_name: collectionName,
        metadata: metadata
      }, {
        timeout: 30000
      })
      return response.data
    } catch (error) {
      console.error('Error creating collection:', error)
      throw error
    }
  },

  /**
   * Get collection info
   * GET /api/vector-store/collections/{collection_name}
   */
  getCollection: async (collectionName) => {
    try {
      const response = await apiClient.get(`/vector-store/collections/${encodeURIComponent(collectionName)}`, {
        timeout: 30000
      })
      return response.data
    } catch (error) {
      console.error('Error getting collection:', error)
      throw error
    }
  },

  /**
   * Delete a collection
   * DELETE /api/vector-store/collections/{collection_name}
   */
  deleteCollection: async (collectionName) => {
    try {
      const response = await apiClient.delete(`/vector-store/collections/${encodeURIComponent(collectionName)}`, {
        timeout: 30000
      })
      return response.data
    } catch (error) {
      console.error('Error deleting collection:', error)
      throw error
    }
  },

  /**
   * Add documents to collection
   * POST /api/vector-store/documents
   */
  addDocuments: async (collectionName, documents, metadatas = null, ids = null) => {
    try {
      const response = await apiClient.post('/vector-store/documents', {
        collection_name: collectionName,
        documents: documents,
        metadatas: metadatas,
        ids: ids
      }, {
        timeout: 120000 // 2 minutes for large document sets
      })
      return response.data
    } catch (error) {
      console.error('Error adding documents:', error)
      throw error
    }
  },

  /**
   * Query the vector store
   * POST /api/vector-store/query
   */
  query: async (collectionName, queryText, nResults = 5) => {
    try {
      const response = await apiClient.post('/vector-store/query', {
        collection_name: collectionName,
        query_text: queryText,
        n_results: nResults
      }, {
        timeout: 30000
      })
      return response.data
    } catch (error) {
      console.error('Error querying vector store:', error)
      throw error
    }
  },

  /**
   * Get vector store statistics
   * GET /api/vector-store/stats
   */
  getStats: async () => {
    try {
      const response = await apiClient.get('/vector-store/stats', {
        timeout: 30000
      })
      return response.data
    } catch (error) {
      console.error('Error getting stats:', error)
      return { error: error.message }
    }
  }
}

export default vectorStoreApi

