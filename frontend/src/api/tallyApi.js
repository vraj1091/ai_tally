import apiClient from './client'

export const tallyApi = {
  // Configure Tally connection
  configureConnection: async (connectionType, serverUrl = null, port = 9000) => {
    try {
      console.log('🌐 API: Sending POST to /tally/connect')
      console.log('   Payload:', { connection_type: connectionType, server_url: serverUrl, port: port })
      
      const response = await apiClient.post('/tally/connect', {
        connection_type: connectionType,
        server_url: serverUrl,
        port: port
      })
      
      console.log('📥 API: Response received:', response.data)
      return { success: true, data: response.data }
    } catch (error) {
      console.error('❌ API: Request failed:', error)
      console.error('   Response:', error.response?.data)
      console.error('   Status:', error.response?.status)
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Connection failed'
      }
    }
  },

  // Connect to Tally (Legacy)
  connect: async (url) => {
    try {
      const response = await apiClient.post('/tally/connect', { url })
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Get all companies
  getCompanies: async (tallyUrl = null, useCache = true) => {
    try {
      const params = {}
      if (tallyUrl) params.tally_url = tallyUrl
      params.use_cache = useCache

      const response = await apiClient.get('/tally/companies', { 
        params,
        timeout: 30000  // 30 seconds - company list should be fast
      })
      return response.data
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout - Tally may be slow or not responding. Try using cached data.');
      }
      throw error
    }
  },

  // Get ledgers
  getLedgers: async (companyName, tallyUrl = null, useCache = true) => {
    try {
      const params = {}
      if (tallyUrl) params.tally_url = tallyUrl
      params.use_cache = useCache

      const response = await apiClient.get(`/tally/ledgers/${encodeURIComponent(companyName)}`, { params })
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Get vouchers
  getVouchers: async (companyName, fromDate, toDate, voucherType, tallyUrl = null, useCache = true) => {
    try {
      const params = {
        from_date: fromDate,
        to_date: toDate,
        voucher_type: voucherType,
        use_cache: useCache
      }
      if (tallyUrl) params.tally_url = tallyUrl

      const response = await apiClient.get(`/tally/vouchers/${encodeURIComponent(companyName)}`, { params })
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Get connection status - with graceful error handling
  getStatus: async (tallyUrl = null) => {
    try {
      const params = {}
      if (tallyUrl) params.tally_url = tallyUrl

      const response = await apiClient.get('/tally/status', { 
        params,
        timeout: 5000  // 5 second timeout - should be fast
      })
      return response.data
    } catch (error) {
      // Return default status instead of throwing - allows app to work without Tally
      if (error.response?.status === 404) {
        // Endpoint not found - return disconnected status
        return {
          success: false,
          connected: false,
          is_connected: false,
          message: "Tally status endpoint not available - using backup mode",
          connection_type: "unknown"
        }
      }
      // For other errors, return disconnected status
      return {
        success: false,
        connected: false,
        is_connected: false,
        message: error.message || "Unable to check Tally status",
        connection_type: "unknown"
      }
    }
  },

  // Get financial summary
  getSummary: async (companyName, tallyUrl = null, useCache = true) => {
    try {
      const params = {}
      if (tallyUrl) params.tally_url = tallyUrl
      params.use_cache = useCache

      const response = await apiClient.get(`/tally/summary/${encodeURIComponent(companyName)}`, { params })
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Get ALL data for a company (ledgers, vouchers, stock items, summary) - COMPREHENSIVE
  getAllCompanyData: async (companyName, useCache = true) => {
    try {
      const params = { use_cache: useCache }
      const response = await apiClient.get(`/tally/all-data/${encodeURIComponent(companyName)}`, { params })
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Get stock items
  getStockItems: async (companyName, tallyUrl = null, useCache = true) => {
    try {
      const params = {}
      if (tallyUrl) params.tally_url = tallyUrl
      params.use_cache = useCache

      const response = await apiClient.get(`/tally/stock-items/${encodeURIComponent(companyName)}`, { params })
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Get connection info
  getConnectionInfo: async () => {
    try {
      const response = await apiClient.get('/tally/connection/info')
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Get cache info
  getCacheInfo: async () => {
    try {
      const response = await apiClient.get('/tally/cache/info')
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Clear cache
  clearCache: async (cacheKey = null) => {
    try {
      const params = {}
      if (cacheKey) params.cache_key = cacheKey

      const response = await apiClient.delete('/tally/cache', { params })
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Specialized Dashboards
  getCEODashboardData: async (companyName, refresh = false) => {
    try {
      const response = await apiClient.get(`/dashboards/ceo/${encodeURIComponent(companyName)}?refresh=${refresh}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching CEO dashboard data:", error);
      throw error;
    }
  },

  getSalesDashboardData: async (companyName, refresh = false) => {
    try {
      const response = await apiClient.get(`/dashboards/sales/${encodeURIComponent(companyName)}?refresh=${refresh}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching Sales dashboard data:", error);
      throw error;
    }
  },

  getCFODashboardData: async (companyName, refresh = false) => {
    try {
      const response = await apiClient.get(`/dashboards/cfo/${encodeURIComponent(companyName)}?refresh=${refresh}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching CFO dashboard data:", error);
      throw error;
    }
  },

  getCashFlowDashboardData: async (companyName, refresh = false) => {
    try {
      const response = await apiClient.get(`/dashboards/cashflow/${encodeURIComponent(companyName)}?refresh=${refresh}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching Cash Flow dashboard data:", error);
      throw error;
    }
  },

  getInventoryDashboardData: async (companyName, refresh = false) => {
    try {
      const response = await apiClient.get(`/dashboards/inventory/${encodeURIComponent(companyName)}?refresh=${refresh}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching Inventory dashboard data:", error);
      throw error;
    }
  },

  // Backup file management
  uploadBackupFile: async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiClient.post('/backup/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 600000  // 10 minutes for large file uploads and parsing
      });
      return response.data;
    } catch (error) {
      console.error("Error uploading backup file:", error);
      if (error.code === 'ECONNABORTED') {
        throw new Error('Upload timeout - file is too large or server is processing. Please try a smaller file or wait longer.');
      }
      throw error;
    }
  },

  getBackupCompanies: async () => {
    try {
      const response = await apiClient.get('/backup/companies', {
        timeout: 5000  // 5 seconds - should be very fast (database query only)
      });
      return response.data;
    } catch (error) {
      // Silently handle errors to prevent console spam
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        // Return empty result instead of throwing error
        return {
          success: false,
          companies: [],
          source: "backup",
          message: "Request timeout - please try again"
        };
      }
      // Return empty result for any error to prevent UI blocking
      return {
        success: false,
        companies: [],
        source: "backup",
        error: error.message || "Unknown error",
        message: "Error fetching backup companies. Please try again."
      };
    }
  },

  getBackupData: async (companyName) => {
    try {
      const response = await apiClient.get(`/backup/data/${encodeURIComponent(companyName)}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching backup data:", error);
      throw error;
    }
  },

  clearBackupData: async () => {
    try {
      const response = await apiClient.delete('/backup/clear');
      return response.data;
    } catch (error) {
      console.error("Error clearing backup data:", error);
      throw error;
    }
  }
}

export default tallyApi;