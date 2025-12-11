import axios from 'axios'

// Get API URL from environment variable or use default
// In production (Render), this should be set to Hugging Face backend URL
// In development, use /api for Vite proxy
const getApiUrl = () => {
  // Check if we're in production (deployed on Render)
  const isProduction = window.location.hostname.includes('onrender.com') || 
                       window.location.hostname.includes('render.com')
  
  // If VITE_API_URL is explicitly set, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  
  // In production, default to Hugging Face backend
  if (isProduction) {
    // Default Hugging Face backend URL - update this with your actual HF Space URL
    return 'https://vraj1091-ai-tally-backend.hf.space/api'
  }
  
  // In development, use /api for Vite proxy
  return '/api'
}

const API_URL = getApiUrl()

console.log('🌐 API Client initialized:', {
  baseURL: API_URL,
  hostname: window.location.hostname,
  isProduction: window.location.hostname.includes('onrender.com')
})

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 1800000, // 30 minutes for very large file uploads (1GB+) and batch processing
  maxContentLength: 2 * 1024 * 1024 * 1024,  // 2GB max content
  maxBodyLength: 2 * 1024 * 1024 * 1024,     // 2GB max body
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response) {
      // Server responded with error
      // Don't log 404s for status checks (expected when backend unavailable)
      const isStatusCheck = error.config?.url?.includes('/tally/status') || 
                           error.config?.url?.includes('/backup/companies')
      
      if (!isStatusCheck || error.response.status !== 404) {
        console.error('API Error:', error.response.status, error.response.data)
      }

      // Handle 401 Unauthorized (token expired or invalid)
      if (error.response.status === 401) {
        // In demo mode, don't auto-redirect on 401 - just log and continue
        // The app works with demo tokens that backend doesn't validate
        console.warn('API returned 401 - endpoint requires authentication:', error.config?.url)
        
        // Only redirect if user explicitly clicked something that requires auth
        // Don't auto-redirect on background API calls
        // This allows the app to work in demo mode without real backend auth
      }

      // Handle 403 Forbidden
      if (error.response.status === 403) {
        console.error('Access forbidden')
      }

      // Handle 500 Server Error
      if (error.response.status === 500) {
        console.error('Internal server error')
      }
      
      // Handle 404 - don't spam console for expected 404s
      if (error.response.status === 404 && isStatusCheck) {
        // Silently handle - these are expected when backend is not available
        return Promise.reject(error)
      }
    } else if (error.request) {
      // Request made but no response - network error
      const isStatusCheck = error.config?.url?.includes('/tally/status')
      if (!isStatusCheck) {
        console.error('Network Error:', error.request)
      }
    } else {
      // Something else happened
      console.error('Error:', error.message)
    }
    return Promise.reject(error)
  }
)

export default apiClient