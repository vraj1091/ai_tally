import axios from 'axios'

// Get API URL from environment variable or use default
// Supports: EC2, Render, Hugging Face, local development
const getApiUrl = () => {
  const hostname = window.location.hostname
  
  // If VITE_API_URL is explicitly set, use it (highest priority)
  if (import.meta.env.VITE_API_URL) {
    console.log('📍 Using VITE_API_URL:', import.meta.env.VITE_API_URL)
    return import.meta.env.VITE_API_URL
  }
  
  // Check deployment environment
  const isRender = hostname.includes('onrender.com') || hostname.includes('render.com')
  const isEC2 = hostname.includes('amazonaws.com') || hostname.includes('compute.amazonaws.com')
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1'
  
  // Render deployment - use Hugging Face backend
  if (isRender) {
    return 'https://vraj1091-ai-tally-backend.hf.space/api'
  }
  
  // EC2 or other production (accessed via IP or domain)
  // Use relative /api path - nginx will proxy to backend
  if (!isLocalhost) {
    console.log('📍 Production mode - using relative /api path')
    return '/api'
  }
  
  // Local development - use /api for Vite proxy
  console.log('📍 Development mode - using Vite proxy')
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