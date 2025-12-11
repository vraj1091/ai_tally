import React, { useState, useEffect } from 'react'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import toast from 'react-hot-toast'
import { tallyApi } from '../api/tallyApi'
import { FiDatabase, FiRefreshCw, FiServer, FiCheckCircle, FiAlertCircle } from 'react-icons/fi'

export default function SettingsPage() {
  const [tallyStatus, setTallyStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [connectionType, setConnectionType] = useState('localhost')
  const [serverUrl, setServerUrl] = useState('')
  const [port, setPort] = useState('9000')
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    fetchTallyStatus()
  }, [])

  const fetchTallyStatus = async () => {
    try {
      const response = await tallyApi.getStatus()
      setTallyStatus(response)
    } catch (error) {
      console.error('Failed to fetch Tally status:', error)
    }
  }

  const handleConnect = async () => {
    setLoading(true)
    try {
      const response = await tallyApi.connect({
        connection_type: connectionType,
        server_url: connectionType === 'server' ? serverUrl : null,
        port: parseInt(port)
      })

      if (response.connected) {
        toast.success('✅ Connected to Tally successfully!')
        
        // Wait then refresh status
        setTimeout(() => {
          fetchTallyStatus()
        }, 1000)
        
        // Suggest page reload
        setTimeout(() => {
          if (window.confirm('Connection updated! Reload page to apply changes everywhere?')) {
            window.location.reload()
          }
        }, 2000)
      } else {
        toast.error('❌ ' + response.message)
      }
    } catch (error) {
      console.error('Connection error:', error)
      toast.error('❌ Connection failed: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResetToLocalhost = async () => {
    if (!window.confirm('Reset Tally connection to localhost:9000?')) {
      return
    }

    setResetting(true)
    try {
      const response = await fetch('/api/tally/reset-to-localhost', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      const data = await response.json()

      if (data.success) {
        toast.success('✅ ' + data.message)
        
        // Show connection test result
        if (data.connected) {
          toast.success('✅ Successfully connected to localhost!')
        } else {
          toast.error('⚠️ Reset complete but connection test failed: ' + data.test_message)
        }
        
        // Update local state
        setConnectionType('localhost')
        setServerUrl('')
        setPort('9000')
        
        // Wait a bit then refresh status
        setTimeout(() => {
          fetchTallyStatus()
        }, 1000)
        
        // Suggest page reload for full refresh
        setTimeout(() => {
          if (window.confirm('Connection updated! Reload page to apply changes everywhere?')) {
            window.location.reload()
          }
        }, 2000)
      } else {
        toast.error('❌ Reset failed: ' + (data.message || 'Unknown error'))
      }
    } catch (error) {
      console.error('Reset error:', error)
      toast.error('❌ Error: ' + error.message)
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <Button
          onClick={fetchTallyStatus}
          variant="secondary"
          size="sm"
        >
          <FiRefreshCw className="w-4 h-4 mr-2" />
          Refresh Status
        </Button>
      </div>

      {/* Current Status */}
      <Card title="📊 Current Tally Connection Status">
        {tallyStatus ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="flex items-center space-x-2">
                  {tallyStatus.is_connected ? (
                    <>
                      <FiCheckCircle className="w-5 h-5 text-green-500" />
                      <span className="font-semibold text-green-700">Connected</span>
                    </>
                  ) : (
                    <>
                      <FiAlertCircle className="w-5 h-5 text-red-500" />
                      <span className="font-semibold text-red-700">Not Connected</span>
                    </>
                  )}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {tallyStatus.url || 'No connection configured'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Companies</div>
                <div className="text-2xl font-bold text-indigo-600">
                  {tallyStatus.company_count || 0}
                </div>
              </div>
            </div>

            {!tallyStatus.is_connected && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <FiAlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-yellow-800">Connection Issue</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      {tallyStatus.message || 'Unable to connect to Tally'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>Loading status...</p>
          </div>
        )}
      </Card>

      {/* Quick Fix Button */}
      <Card>
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-indigo-900 mb-2">
                🚀 Quick Fix: Reset to Localhost
              </h3>
              <p className="text-sm text-indigo-700 mb-4">
                If you're having connection issues, click here to reset your Tally connection to localhost:9000.
                This works if Tally is running on THIS computer.
              </p>
              <Button
                onClick={handleResetToLocalhost}
                disabled={resetting}
                loading={resetting}
                variant="primary"
              >
                {resetting ? 'Resetting...' : '🔧 Reset to Localhost Now'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Connection Configuration */}
      <Card title="🔧 Configure Tally Connection">
        <div className="space-y-6">
          {/* Connection Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Connection Type
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setConnectionType('localhost')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  connectionType === 'localhost'
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-center mb-2">
                  <FiDatabase className={`w-6 h-6 ${
                    connectionType === 'localhost' ? 'text-indigo-600' : 'text-gray-400'
                  }`} />
                </div>
                <div className="font-semibold text-gray-900">Localhost</div>
                <div className="text-xs text-gray-500 mt-1">Tally on this computer</div>
              </button>

              <button
                onClick={() => setConnectionType('server')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  connectionType === 'server'
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-center mb-2">
                  <FiServer className={`w-6 h-6 ${
                    connectionType === 'server' ? 'text-indigo-600' : 'text-gray-400'
                  }`} />
                </div>
                <div className="font-semibold text-gray-900">Remote Server</div>
                <div className="text-xs text-gray-500 mt-1">Tally on network</div>
              </button>
            </div>
          </div>

          {/* Remote Server Configuration */}
          {connectionType === 'server' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Server IP Address
                </label>
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="e.g., 192.168.1.100"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the IP address of the computer running Tally
                </p>
              </div>
            </div>
          )}

          {/* Port Configuration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Port Number
            </label>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder="9000"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Default Tally port is 9000
            </p>
          </div>

          {/* Connect Button */}
          <div className="pt-4">
            <Button
              onClick={handleConnect}
              disabled={loading || (connectionType === 'server' && !serverUrl)}
              loading={loading}
              className="w-full"
            >
              {loading ? 'Connecting...' : '🔗 Connect to Tally'}
            </Button>
          </div>

          {/* Troubleshooting Tips */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">💡 Troubleshooting Tips</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Ensure Tally is running and a company is open</li>
              <li>• Enable Gateway in Tally: F1 → Settings → Connectivity</li>
              <li>• Check firewall allows port {port}</li>
              {connectionType === 'server' && (
                <li>• Verify you can ping {serverUrl || 'the server'}</li>
              )}
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}

