import apiClient from './client'

export const chatApi = {
  // Initialize chat with Tally company
  initialize: async (companyName, tallyUrl = null) => {
    const response = await apiClient.post(`/chat/initialize/${companyName}`, null, {
      params: { tally_url: tallyUrl }
    })
    return response.data
  },

  // Upload and ingest document
  uploadDocument: async (companyName, file, tallyUrl = null) => {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await apiClient.post(
      `/chat/upload-and-ingest/${companyName}`,
      formData,
      {
        params: { tally_url: tallyUrl },
        headers: { 'Content-Type': 'multipart/form-data' }
      }
    )
    return response.data
  },

  // Send chat message
  chat: async (query, companyName, collectionName = 'tally_combined', tallyUrl = null) => {
    const response = await apiClient.post('/chat/chat', {
      query,
      company_name: companyName,
      collection_name: collectionName,
      tally_url: tallyUrl
    })
    return response.data
  },

  // List collections
  listCollections: async () => {
    const response = await apiClient.get('/chat/collections')
    return response.data
  },

  // Load collection
  loadCollection: async (collectionName) => {
    const response = await apiClient.post(`/chat/load-collection/${collectionName}`)
    return response.data
  },

  // Delete collection
  deleteCollection: async (collectionName) => {
    const response = await apiClient.delete(`/chat/collection/${collectionName}`)
    return response.data
  }
}
 
