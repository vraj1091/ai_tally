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
          const storedToken = localStorage.getItem('token')
          const storedUser = localStorage.getItem('user')

          if (storedToken && storedUser) {
            set({
              token: storedToken,
              user: JSON.parse(storedUser),
              isAuthenticated: true,
              isLoading: false
            })
          } else {
            set({ isLoading: false })
          }
        } catch (error) {
          console.error('Auth initialization error:', error)
          set({ isLoading: false })
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

          set({
            user: null,
            token: null,
            isAuthenticated: false
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
