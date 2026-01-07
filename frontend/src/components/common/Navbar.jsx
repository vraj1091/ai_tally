import React from 'react'
import { useNavigate } from 'react-router-dom'
import { FiBell, FiSettings, FiUser, FiLogOut } from 'react-icons/fi'
import useUIStore from '../../store/uiStore'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

export default function Navbar() {
  const { toggleSidebar } = useUIStore()
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleSidebar}
            className="text-gray-600 hover:text-gray-900 lg:hidden"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-center space-x-3">
            <img src="/logo.svg" alt="TallyDash Pro" className="w-10 h-10" />
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                TallyDash Pro
              </h1>
              <p className="text-xs text-gray-500 -mt-1">AI-Powered Analytics</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button 
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full relative"
            title="Notifications"
            onClick={() => navigate('/notifications')}
          >
            <FiBell className="w-5 h-5" />
            {/* Notification badge */}
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          <button 
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
            onClick={() => navigate('/settings')}
            title="Settings"
          >
            <FiSettings className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3 border-l border-gray-200 pl-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                <FiUser className="w-5 h-5 text-white" />
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-700">
                  {user?.username || user?.email || 'User'}
                </p>
                <p className="text-xs text-gray-500">
                  {user?.email && user?.username ? user.email : 'Administrator'}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full"
              title="Logout"
            >
              <FiLogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}