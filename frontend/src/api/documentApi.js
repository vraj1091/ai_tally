import apiClient from './client'

export const documentApi = {
  // Upload document
  upload: async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await apiClient.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  // Extract text from document
  extractText: async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await apiClient.post('/documents/extract-text', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  // List documents
  list: async () => {
    const response = await apiClient.get('/documents/list')
    return response.data
  },

  // Delete document
  delete: async (filename) => {
    const response = await apiClient.delete(`/documents/delete/${filename}`)
    return response.data
  },

  // Get RAG vector database statistics
  getRagStats: async () => {
    const response = await apiClient.get('/documents/rag-stats')
    return response.data
  }
}
 
