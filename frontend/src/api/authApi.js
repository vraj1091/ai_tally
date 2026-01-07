// src/api/authApi.js
import client from './client'

const authApi = {
  // Register new user
  register: async (email, username, password) => {
    try {
      const response = await client.post('/auth/register', {
        email,
        username,
        password
      })
      return { success: true, data: response.data }
    } catch (error) {
      console.error('Registration error:', error)
      let errorMessage = 'Registration failed'
      
      if (error.response?.data?.detail) {
        // Handle array of validation errors
        if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail.map(err => err.msg).join(', ')
        } else {
          errorMessage = error.response.data.detail
        }
      }
      
      return {
        success: false,
        error: errorMessage
      }
    }
  },

  // Login user
  login: async (email, password) => {
    try {
      const response = await client.post('/auth/login', {
        email,
        password
      })

      const { access_token } = response.data

      // Store token
      localStorage.setItem('token', access_token)

      // Set default auth header
      client.defaults.headers.common['Authorization'] = `Bearer ${access_token}`

      // Get user info
      const userInfo = await authApi.getCurrentUser()
      if (userInfo.success) {
        localStorage.setItem('user', JSON.stringify(userInfo.data))
      }

      return { success: true, token: access_token, user: userInfo.data }
    } catch (error) {
      console.error('Login error:', error)
      let errorMessage = 'Login failed'
      
      if (error.response?.data?.detail) {
        // Handle array of validation errors
        if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail.map(err => err.msg).join(', ')
        } else {
          errorMessage = error.response.data.detail
        }
      }
      
      return {
        success: false,
        error: errorMessage
      }
    }
  },

  // Get current user
  getCurrentUser: async () => {
    try {
      const response = await client.get('/auth/me')
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to get user info'
      }
    }
  },

  // Logout
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    delete client.defaults.headers.common['Authorization']
  },

  // Check if authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('token')
  },

  // Get stored user (FIXED)
  getUser: () => {
    const userStr = localStorage.getItem('user')

    if (!userStr || userStr === 'undefined') {
      return null
    }

    try {
      return JSON.parse(userStr)
    } catch (error) {
      console.error('Failed to parse user from localStorage:', error)
      localStorage.removeItem('user')
      return null
    }
  },

  // Initialize auth (call on app start)
  initAuth: () => {
    const token = localStorage.getItem('token')
    if (token) {
      client.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }
  }
};

export default authApi;