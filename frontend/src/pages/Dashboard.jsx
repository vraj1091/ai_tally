import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiMessageCircle, FiBarChart2, FiFileText, FiDatabase, FiSettings } from 'react-icons/fi'
import Card from '../components/common/Card'
import Modal from '../components/common/Modal'
import ConnectionSetup from '../components/tally/ConnectionSetup'
import useTallyStore from '../store/tallyStore'
import useAuthStore from '../store/authStore'
import { tallyApi } from '../api/tallyApi'
import toast from 'react-hot-toast'

export default function Dashboard() {
  const { companies, connected, setCompanies, setConnected } = useTallyStore()
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [showConnectionModal, setShowConnectionModal] = useState(false) // NEW

  useEffect(() => {
    checkTallyConnection()
  }, [])

  const checkTallyConnection = async () => {
    setLoading(true)
    try {
      const status = await tallyApi.getStatus()
      const isConnected = status.is_connected || status.connected || false
      setConnected(isConnected)
      
      if (isConnected) {
        try {
          const companiesData = await tallyApi.getCompanies()
          const companyList = companiesData.companies || companiesData.data?.companies || []
          setCompanies(companyList)
          toast.success('Connected to Tally')
        } catch (error) {
          console.error('Error fetching companies:', error)
          toast.error('Connected to Tally, but could not load companies')
        }
      } else {
        toast.error('Could not connect to Tally. Please check if Tally is running.')
      }
    } catch (error) {
      console.error('Error checking Tally connection:', error)
      setConnected(false)
      
      if (error.response?.status === 404) {
        toast.error('Backend routes not configured. Please check your backend.')
      } else if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.')
        logout()
        navigate('/login')
      } else {
        toast.error('Could not connect to Tally')
      }
      setRetryCount(prev => prev + 1)
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = () => {
    checkTallyConnection()
  }

  const features = [
    {
      icon: FiMessageCircle,
      title: 'AI Chat',
      description: 'Chat with your Tally data using Phi4:14b',
      link: '/chat',
      color: 'bg-blue-500'
    },
    {
      icon: FiBarChart2,
      title: 'Analytics',
      description: 'View financial insights and forecasts',
      link: '/analytics',
      color: 'bg-green-500'
    },
    {
      icon: FiFileText,
      title: 'Documents',
      description: 'Upload and process financial documents',
      link: '/documents',
      color: 'bg-purple-500'
    },
    {
      icon: FiDatabase,
      title: 'Tally Data',
      description: 'Explore companies, ledgers, and vouchers',
      link: '/tally',
      color: 'bg-orange-500'
    }
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, {user?.username || user?.email || 'User'}!</p>
        </div>
        
        {/* NEW: Tally Connection Button */}
        <button
          onClick={() => setShowConnectionModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <FiSettings className="w-5 h-5" />
          Configure Tally Connection
        </button>
      </div>

      {/* Tally Connection Status */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-primary-500">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Tally Connection</h3>
            <p className="text-sm text-gray-600 mt-1">
              {connected 
                ? `Connected - ${companies.length} ${companies.length === 1 ? 'company' : 'companies'} found` 
                : 'Not connected to Tally'}
            </p>
            {retryCount > 0 && !connected && (
              <p className="text-xs text-red-600 mt-1">
                Failed {retryCount} {retryCount === 1 ? 'time' : 'times'}. Check if Tally is running on port 9000.
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {!connected && (
              <button
                onClick={handleRetry}
                disabled={loading}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Checking...' : 'Retry Connection'}
              </button>
            )}
            <button
              onClick={() => setShowConnectionModal(true)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Settings
            </button>
          </div>
        </div>

        {/* Connection Instructions */}
        {!connected && (
          <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
            <p className="text-sm font-medium text-gray-900 mb-2">Make sure:</p>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>Tally ERP is running</li>
              <li>ODBC Server is enabled in Tally (F12 → Advanced Config)</li>
              <li>Port is set to 9000</li>
              <li>Backend server is running on localhost:8000</li>
            </ul>
          </div>
        )}
      </Card>

      {/* System Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary-600">
              {loading ? '...' : companies.length}
            </div>
            <p className="text-sm text-gray-600 mt-2">Total Companies</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="text-4xl font-bold text-green-600">
              {connected ? '✓' : '✗'}
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {connected ? 'System Online' : 'System Offline'}
            </p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">Phi4:14b</div>
            <p className="text-sm text-gray-600 mt-2">AI Model Active</p>
          </div>
        </Card>
      </div>

      {/* Features Grid */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature, index) => (
            <Link key={index} to={feature.link}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <div className="flex flex-col items-center text-center p-4">
                  <div className={`${feature.color} text-white p-4 rounded-full mb-4`}>
                    <feature.icon className="w-8 h-8" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Companies List */}
      {connected && companies.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Companies</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.slice(0, 6).map((company, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <h3 className="font-semibold text-gray-900">{company.name || 'Unnamed Company'}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {company.financial_year || company.guid || 'No details available'}
                </p>
              </Card>
            ))}
          </div>
          {companies.length > 6 && (
            <div className="mt-4 text-center">
              <Link to="/tally" className="text-primary-600 hover:text-primary-700 font-medium">
                View all {companies.length} companies →
              </Link>
            </div>
          )}
        </div>
      )}

      {connected && companies.length === 0 && (
        <Card>
          <p className="text-gray-600 text-center">
            No companies were found in your Tally installation.
          </p>
        </Card>
      )}

      {/* Error Troubleshooting */}
      {retryCount >= 3 && !connected && (
        <Card className="bg-red-50 border-l-4 border-red-500">
          <h3 className="font-semibold text-red-900 mb-2">Connection Issues Detected</h3>
          <p className="text-sm text-red-800 mb-3">
            Multiple connection attempts failed. This might be due to:
          </p>
          <ul className="text-sm text-red-800 space-y-1 list-disc list-inside mb-3">
            <li>Tally ERP not running or ODBC disabled</li>
            <li>Backend server not running (should be on localhost:8000)</li>
            <li>Firewall blocking connections</li>
            <li>Incorrect port configuration</li>
          </ul>
          <p className="text-sm font-medium text-red-900">
            **Solution:** Check backend logs for 404 errors and ensure all routes are registered in main.py
          </p>
        </Card>
      )}

      {/* NEW: Connection Setup Modal */}
      <Modal
        isOpen={showConnectionModal}
        onClose={() => setShowConnectionModal(false)}
        title="Configure Tally Connection"
      >
        <ConnectionSetup />
      </Modal>
    </div>
  )
}
