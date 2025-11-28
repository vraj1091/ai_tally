import axios from 'axios'

// Get API URL from environment variable or use default
const API_URL = import.meta.env.VITE_API_URL || '/api'

const apiClient = axios.create({
  baseURL: API_URL, // <-- CHANGED
  timeout: 600000, // 10 minutes for large file uploads and batch processing
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
      console.error('API Error:', error.response.data)

      // Handle 401 Unauthorized (token expired or invalid)
      if (error.response.status === 401) {
        console.warn('Authentication failed. Redirecting to login...')

        // Clear auth data
        localStorage.removeItem('token')
        localStorage.removeItem('user')

        // Redirect to login (only if not already on login page)
        if (!window.location.pathname.includes('/login') &&
          !window.location.pathname.includes('/register')) {
          window.location.href = '/login'
        }
      }

      // Handle 403 Forbidden
      if (error.response.status === 403) {
        console.error('Access forbidden')
      }

      // Handle 500 Server Error
      if (error.response.status === 500) {
        console.error('Internal server error')
      }
    } else if (error.request) {
      // Request made but no response
      console.error('Network Error:', error.request)
    } else {
      // Something else happened
      console.error('Error:', error.message)
    }
    return Promise.reject(error)
  }
)

export default apiClient