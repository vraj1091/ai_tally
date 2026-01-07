import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true, // Start as true to prevent premature rendering

      // Initialize authentication from localStorage
      initAuth: () => {
        try {
          // First check if zustand persist already restored valid state
          const currentState = get()
          if (currentState.token && currentState.user && currentState.isAuthenticated) {
            // Zustand persist already restored - just update isLoading
            console.log('Auth: Restored from zustand persist')
            set({ isLoading: false })
            return
          }

          // Fallback: check direct localStorage
          const storedToken = localStorage.getItem('token')
          const storedUser = localStorage.getItem('user')

          if (storedToken && storedUser) {
            // Safely parse user data
            let userData = null
            try {
              userData = JSON.parse(storedUser)
            } catch (parseError) {
              console.warn('Failed to parse user data from localStorage:', parseError)
              // Clear invalid data
              localStorage.removeItem('user')
              localStorage.removeItem('token')
              localStorage.removeItem('auth-storage')
              set({ isLoading: false, isAuthenticated: false, user: null, token: null })
              return
            }
            
            console.log('Auth: Restored from direct localStorage')
            set({
              token: storedToken,
              user: userData,
              isAuthenticated: true,
              isLoading: false
            })
          } else {
            console.log('Auth: No stored credentials found')
            set({ isLoading: false, isAuthenticated: false })
          }
        } catch (error) {
          console.error('Auth initialization error:', error)
          // Clear potentially corrupted data
          try {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            localStorage.removeItem('auth-storage')
          } catch (clearError) {
            console.error('Error clearing localStorage:', clearError)
          }
          set({ isLoading: false, isAuthenticated: false, user: null, token: null })
        }
      },

      // Login function - called after successful API login
      login: (userData, userToken) => {
        try {
          localStorage.setItem('token', userToken)
          localStorage.setItem('user', JSON.stringify(userData))

          set({
            user: userData,
            token: userToken,
            isAuthenticated: true,
            isLoading: false
          })
        } catch (error) {
          console.error('Login error:', error)
        }
      },

      // Logout function
      logout: () => {
        try {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          localStorage.removeItem('auth-storage') // Also clear zustand persist storage

          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false
          })
        } catch (error) {
          console.error('Logout error:', error)
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)

export { useAuthStore }
export default useAuthStore
