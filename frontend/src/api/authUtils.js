export const isAuthenticated = () => {
  return !!localStorage.getItem('token')
}

/**
 * Get stored token
 */
export const getToken = () => {
  return localStorage.getItem('token')
}

/**
 * Get stored user (FIXED)
 */
export const getUser = () => {
  const userStr = localStorage.getItem('user')

  // Check for null, undefined, or the literal string "undefined"
  if (!userStr || userStr === 'undefined') {
    return null
  }

  // Add a try...catch block in case the JSON is corrupted
  try {
    return JSON.parse(userStr)
  } catch (error) {
    console.error("Failed to parse user from localStorage:", error)
    localStorage.removeItem('user') // Clean up the bad data
    return null
  }
}

/**
 * Store authentication data
 */
export const setAuthData = (token, user) => {
  localStorage.setItem('token', token)
  localStorage.setItem('user', JSON.stringify(user))
}

/**
 * Clear authentication data
 */
export const clearAuthData = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

/**
 * Initialize auth header (call on app start)
 */
export const initAuthHeader = () => {
  const token = getToken()
  if (token) {
    // Token will be automatically added by interceptor
    return true
  }
  return false
}