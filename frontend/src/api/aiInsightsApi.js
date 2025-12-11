import apiClient from './client'

/**
 * AI Insights API - Connects to /api/ai endpoints
 */
export const aiInsightsApi = {
  /**
   * Generate AI insights for company data
   * POST /api/ai/generate-insights
   */
  generateInsights: async (companyName, data, insightType = 'general') => {
    try {
      console.log(`🤖 Generating ${insightType} insights for ${companyName}...`)
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
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to generate insights'
      }
    }
  },

  /**
   * Get drill-down data for specific metrics
   * GET /api/ai/drill-down
   */
  getDrillDown: async (companyName, metric, category = null, source = 'auto') => {
    try {
      console.log(`🔍 Getting drill-down for ${metric} in ${companyName}...`)
      const response = await apiClient.get('/ai/drill-down', {
        params: {
          company_name: companyName,
          metric: metric,
          category: category,
          source: source
        },
        timeout: 60000
      })
      return response.data
    } catch (error) {
      console.error('Error fetching drill-down data:', error)
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to fetch drill-down data'
      }
    }
  },

  /**
   * Check AI service health
   * GET /api/ai/health
   */
  checkHealth: async () => {
    try {
      const response = await apiClient.get('/ai/health', {
        timeout: 10000
      })
      return response.data
    } catch (error) {
      console.error('AI health check failed:', error)
      return {
        success: false,
        available: false,
        error: error.message
      }
    }
  }
}

export default aiInsightsApi

