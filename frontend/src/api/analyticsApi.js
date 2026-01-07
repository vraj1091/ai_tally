import apiClient from './client'

export const analyticsApi = {
  /**
   * Get company analytics (matches backend: GET /api/analytics/company/{company_name})
   */
  getCompanyAnalytics: async (companyName, source = 'auto', refresh = false) => {
    try {
      const response = await apiClient.get(`/analytics/company/${encodeURIComponent(companyName)}`, {
        params: { source, refresh },
        timeout: 60000
      })
      return response.data
    } catch (error) {
      console.error('Error fetching company analytics:', error)
      throw error
    }
  },

  /**
   * Get multi-company analytics (matches backend: GET /api/analytics/multi-company)
   */
  getMultiCompanyAnalytics: async (companyNames = [], source = 'auto') => {
    try {
      const response = await apiClient.get('/analytics/multi-company', {
        params: { 
          companies: companyNames.join(','),
          source 
        },
        timeout: 120000
      })
      return response.data
    } catch (error) {
      console.error('Error fetching multi-company analytics:', error)
      throw error
    }
  },

  /**
   * Compare companies (matches backend: POST /api/analytics/compare)
   */
  compareCompanies: async (companyNames, metrics = []) => {
    try {
      const response = await apiClient.post('/analytics/compare', {
        companies: companyNames,
        metrics: metrics
      }, {
        timeout: 60000
      })
      return response.data
    } catch (error) {
      console.error('Error comparing companies:', error)
      throw error
    }
  },

  /**
   * Refresh company analytics (matches backend: POST /api/analytics/refresh/{company_name})
   */
  refreshAnalytics: async (companyName) => {
    try {
      const response = await apiClient.post(`/analytics/refresh/${encodeURIComponent(companyName)}`, {}, {
        timeout: 120000
      })
      return response.data
    } catch (error) {
      console.error('Error refreshing analytics:', error)
      throw error
    }
  },

  /**
   * Get analytics summary (matches backend: GET /api/analytics/summary)
   */
  getSummary: async () => {
    try {
      const response = await apiClient.get('/analytics/summary', {
        timeout: 30000
      })
      return response.data
    } catch (error) {
      console.error('Error fetching analytics summary:', error)
      throw error
    }
  },

  /**
   * Generate AI insights (matches backend: POST /api/ai/generate-insights)
   */
  generateInsights: async (companyName, data, insightType = 'general') => {
    try {
      const response = await apiClient.post('/ai/generate-insights', {
        company_name: companyName,
        data: data,
        insight_type: insightType
      }, {
        timeout: 180000 // 3 minutes for AI processing
      })
      return response.data
    } catch (error) {
      console.error('Error generating insights:', error)
      throw error
    }
  },

  /**
   * Get drill-down data (matches backend: GET /api/ai/drill-down)
   */
  getDrillDown: async (companyName, metric, category = null) => {
    try {
      const response = await apiClient.get('/ai/drill-down', {
        params: {
          company_name: companyName,
          metric: metric,
          category: category
        },
        timeout: 60000
      })
      return response.data
    } catch (error) {
      console.error('Error fetching drill-down data:', error)
      throw error
    }
  }
}
 
