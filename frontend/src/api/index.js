/**
 * API Module Index
 * Central export point for all API clients
 * 
 * Usage:
 * import { tallyApi, chatApi, authApi } from './api'
 * // or
 * import api from './api'
 * api.tally.getCompanies()
 */

// Core API Client
export { default as apiClient } from './client'

// Authentication
export { default as authApi } from './authApi'

// Tally ERP Integration
export { default as tallyApi } from './tallyApi'
export { setTallyAuthToken } from './tallyApi'

// Chat & RAG
export { chatApi } from './chatApi'

// Analytics
export { analyticsApi } from './analyticsApi'

// Specialized Dashboards
export { dashboardsApi } from './dashboardsApi'

// AI Insights
export { aiInsightsApi } from './aiInsightsApi'

// Documents
export { documentApi } from './documentApi'

// Vector Store (ChromaDB)
export { vectorStoreApi } from './vectorStoreApi'

// Google Drive
export { googleDriveApi } from './googleDriveApi'

// WebSocket
export { default as tallyBridgeWebSocket } from './websocketClient'

// Re-import for default export object
import authApiDefault from './authApi'
import tallyApiDefault from './tallyApi'
import { chatApi as chatApiObj } from './chatApi'
import { analyticsApi as analyticsApiObj } from './analyticsApi'
import { dashboardsApi as dashboardsApiObj } from './dashboardsApi'
import { aiInsightsApi as aiInsightsApiObj } from './aiInsightsApi'
import { documentApi as documentApiObj } from './documentApi'
import { vectorStoreApi as vectorStoreApiObj } from './vectorStoreApi'
import { googleDriveApi as googleDriveApiObj } from './googleDriveApi'
import websocketDefault from './websocketClient'

// Default export with all APIs as an object
const api = {
  auth: authApiDefault,
  tally: tallyApiDefault,
  chat: chatApiObj,
  analytics: analyticsApiObj,
  dashboards: dashboardsApiObj,
  aiInsights: aiInsightsApiObj,
  documents: documentApiObj,
  vectorStore: vectorStoreApiObj,
  googleDrive: googleDriveApiObj,
  websocket: websocketDefault
}

export default api

