import apiClient from './client'

export const googleDriveApi = {
  listFiles: async (folderId = null) => {
    const response = await apiClient.get('/google-drive/files', {
      params: {
        folder_id: folderId || null
      }
    })
    return response.data
  },

  downloadFile: async (fileId) => {
    const response = await apiClient.get(`/google-drive/download/${fileId}`, {
      responseType: 'blob'
    })
    return response.data
  },

  ingestDriveFile: async (fileId, companyName = null) => {
    const response = await apiClient.post(`/google-drive/ingest/${fileId}`, null, {
      params: {
        company_name: companyName
      }
    })
    return response.data
  },

  ingestDriveFolder: async (folderId, companyName = null) => {
    const response = await apiClient.post(`/google-drive/ingest-folder/${folderId}`, null, {
      params: {
        company_name: companyName
      }
    })
    return response.data
  },

  getDriveStatus: async () => {
    const response = await apiClient.get('/google-drive/status')
    return response.data
  }
}
