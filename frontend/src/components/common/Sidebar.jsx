import React from 'react'
import { NavLink } from 'react-router-dom'
import { 
  FiHome, 
  FiMessageCircle, 
  FiBarChart2, 
  FiFileText, 
  FiDatabase,
  FiSettings,
  FiGrid
} from 'react-icons/fi'
import useUIStore from '../../store/uiStore'

const navItems = [
  { path: '/dashboard', icon: FiHome, label: 'Dashboard' },
  { path: '/dashboards', icon: FiGrid, label: 'Dashboards Hub' },
  { path: '/chat', icon: FiMessageCircle, label: 'Chat' },
  { path: '/analytics', icon: FiBarChart2, label: 'Analytics' },
  { path: '/documents', icon: FiFileText, label: 'Documents' },
  { path: '/tally', icon: FiDatabase, label: 'Tally Explorer' },
  { path: '/settings', icon: FiSettings, label: 'Settings' },
]

export default function Sidebar() {
  const { sidebarOpen } = useUIStore()

  return (
    <aside className={`
      bg-gray-900 text-white w-64 min-h-screen p-4
      transition-all duration-300 ease-in-out
      ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      lg:translate-x-0
      fixed lg:relative z-30
    `}>
      <div className="flex items-center space-x-2 mb-8 px-2">
        <img src="/logo.svg" alt="TallyDash Pro" className="w-10 h-10" />
        <div>
          <h2 className="font-bold text-lg">TallyDash Pro</h2>
          <p className="text-xs text-gray-400">AI-Powered Analytics</p>
        </div>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors
              ${isActive 
                ? 'bg-primary-600 text-white' 
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }
            `}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="absolute bottom-4 left-4 right-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-2">System Status</p>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm">All Systems Online</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
 
