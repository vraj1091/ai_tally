import apiClient from './client'

export const chatApi = {
  // Initialize chat with Tally company
  initialize: async (companyName, tallyUrl = null) => {
    try {
      const response = await apiClient.post(`/chat/initialize/${companyName}`, null, {
        params: { tally_url: tallyUrl },
        timeout: 60000 // 60 seconds for initialization
      })
      return response.data
    } catch (error) {
      console.error('Chat initialization error:', error)
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to initialize chat'
      }
    }
  },

  // Upload and ingest document
  uploadDocument: async (companyName, file, tallyUrl = null) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await apiClient.post(
        `/chat/upload-and-ingest/${companyName}`,
        formData,
        {
          params: { tally_url: tallyUrl },
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 120000 // 2 minutes for file upload
        }
      )
      return response.data
    } catch (error) {
      console.error('Document upload error:', error)
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to upload document'
      }
    }
  },

  // Send chat message
  chat: async (query, companyName, collectionName = 'tally_combined', tallyUrl = null) => {
    try {
      console.log('💬 Sending chat query:', query)
      const response = await apiClient.post('/chat/chat', {
        query,
        company_name: companyName || 'Demo Company',
        collection_name: collectionName,
        tally_url: tallyUrl
      }, {
        timeout: 180000 // 3 minutes for AI response (phi4:14b can be slow)
      })
      console.log('💬 Chat response received:', response.data?.success)
      return response.data
    } catch (error) {
      console.error('Chat error:', error)
      return {
        success: false,
        answer: `Sorry, I encountered an error: ${error.response?.data?.detail || error.message || 'Unknown error'}. Please try again.`,
        query: query,
        tally_sources: [],
        document_sources: []
      }
    }
  },

  // List collections
  listCollections: async () => {
    try {
      const response = await apiClient.get('/chat/collections')
      return response.data
    } catch (error) {
      console.error('List collections error:', error)
      return { collections: [], count: 0 }
    }
  },

  // Load collection
  loadCollection: async (collectionName) => {
    try {
      const response = await apiClient.post(`/chat/load-collection/${collectionName}`)
      return response.data
    } catch (error) {
      console.error('Load collection error:', error)
      return { success: false, error: error.message }
    }
  },

  // Delete collection
  deleteCollection: async (collectionName) => {
    try {
      const response = await apiClient.delete(`/chat/collection/${collectionName}`)
      return response.data
    } catch (error) {
      console.error('Delete collection error:', error)
      return { success: false, error: error.message }
    }
  }
}
 
