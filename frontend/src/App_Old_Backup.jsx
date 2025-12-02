import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import useAuthStore from './store/authStore'

// Layout Components
import Navbar from './components/common/Navbar'
import Sidebar from './components/common/Sidebar'
import ProtectedRoute from './components/common/ProtectedRoute'

// Auth Pages
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

// App Pages
import Dashboard from './pages/Dashboard'
import ChatPage from './pages/ChatPage'
import AnalyticsPage from './pages/AnalyticsPage'
import DocumentsPage from './pages/DocumentsPage'
import TallyExplorer from './pages/TallyExplorer'
import SettingsPage from './pages/SettingsPage'
import GoogleDrivePage from './pages/GoogleDrivePage'
import TestPage from './pages/TestPage'
import DashboardHub from './pages/DashboardHub'
import MultiBillComparison from './components/documents/MultiBillComparison'

// Tally Components
import ConnectionSetup from './components/tally/ConnectionSetup'

import './App.css'

function App() {
  const { initAuth, isLoading } = useAuthStore()

  useEffect(() => {
    // Initialize authentication on app start
    initAuth()
  }, [initAuth])

  // Wait for auth initialization before rendering
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#667eea'
      }}>
        Loading...
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes - No Layout */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected Routes - With Layout */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <div className="flex h-screen bg-gray-50">
                <Sidebar />

                <div className="flex-1 flex flex-col overflow-hidden">
                  <Navbar />

                  <main className="flex-1 overflow-y-auto p-6">
                    <Routes>
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/chat" element={<ChatPage />} />
                      <Route path="/analytics" element={<AnalyticsPage />} />
                      <Route path="/documents" element={<DocumentsPage />} />
                      <Route path="/tally" element={<TallyExplorer />} />
                      <Route path="/tally/setup" element={<ConnectionSetup />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="/google-drive" element={<GoogleDrivePage />} />
                      <Route path="/test" element={<TestPage />} />
                      <Route path="/dashboards" element={<DashboardHub />} />
                      <Route path="/bill-comparison" element={<MultiBillComparison />} />
                    </Routes>
                  </main>
                </div>

                <Toaster position="top-right" />
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  )
}

export default App
