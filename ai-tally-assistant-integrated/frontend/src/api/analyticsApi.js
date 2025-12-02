import apiClient from './client'

export const analyticsApi = {
  // Get company analytics
  getCompanyAnalytics: async (companyName, tallyUrl = null) => {
    const response = await apiClient.get(`/analytics/company/${companyName}`, {
      params: { tally_url: tallyUrl }
    })
    return response.data
  },

  // Get all companies analytics
  getAllCompaniesAnalytics: async (tallyUrl = null) => {
    const response = await apiClient.get('/analytics/all-companies', {
      params: { tally_url: tallyUrl }
    })
    return response.data
  },

  // Get health score
  getHealthScore: async (companyName, tallyUrl = null) => {
    const response = await apiClient.get(`/analytics/health-score/${companyName}`, {
      params: { tally_url: tallyUrl }
    })
    return response.data
  },

  // Compare companies
  compareCompanies: async (companies, tallyUrl = null) => {
    const response = await apiClient.get('/analytics/compare', {
      params: { 
        companies: companies.join(','),
        tally_url: tallyUrl
      }
    })
    return response.data
  }
}
 
