import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../common/Card'
import { tallyApi } from '../../api/tallyApi'
import toast from 'react-hot-toast'
import { FiServer, FiCheckCircle, FiXCircle } from 'react-icons/fi'

export default function ConnectionSetup() {
  const [connectionType, setConnectionType] = useState('localhost')
  const [serverUrl, setServerUrl] = useState('')
  const [port, setPort] = useState(9000)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null)
  const [testing, setTesting] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    try {
      const result = await tallyApi.getStatus()
      setStatus(result)
    } catch (error) {
      console.error('Error checking status:', error)
    }
  }

  const handleTestConnection = async () => {
    setTesting(true)
    try {
      const testUrl = connectionType === 'localhost' 
        ? `http://localhost:${port}` 
        : `${serverUrl}:${port}`

      // Simple test to see if Tally is responding
      const result = await tallyApi.getStatus()

      if (result.connected || result.is_connected) {
        toast.success('Connection successful!')
        setStatus(result)
      } else {
        toast.error('Could not connect to Tally. Make sure Tally is running.')
      }
    } catch (error) {
      console.error('Connection test failed:', error)
      toast.error('Connection test failed. Check your settings.')
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    console.log('🔌 handleSave called')
    console.log('   connectionType:', connectionType)
    console.log('   serverUrl:', serverUrl)
    console.log('   port:', port)
    
    try {
      // If you have a configureConnection endpoint
      if (tallyApi.configureConnection) {
        console.log('📡 Calling tallyApi.configureConnection...')
        
        const result = await tallyApi.configureConnection(
          connectionType,
          connectionType === 'SERVER' ? serverUrl : null,
          port
        )
        
        console.log('📊 Result:', result)

        if (result.success) {
          console.log('✅ Success! Data:', result.data)
          toast.success('Connection configured successfully!')
          
          // Refresh status to show connection state
          console.log('🔄 Refreshing status...')
          await checkStatus()
          
          // Check if actually connected
          if (result.data && result.data.connected) {
            console.log('✅ Connected to Tally!')
            toast.success(`Connected to Tally at ${result.data.url}`)
            setTimeout(() => navigate('/dashboard'), 1000)
          } else {
            console.warn('⚠️ Saved but not connected:', result.data)
            toast.error(result.data?.message || 'Connection saved but Tally is not responding')
          }
        } else {
          console.error('❌ Configuration failed:', result.error)
          // Handle Pydantic validation errors (arrays) or string errors
          let errorMsg = 'Failed to configure connection'
          if (Array.isArray(result.error)) {
            errorMsg = result.error.map(e => e.msg || JSON.stringify(e)).join(', ')
          } else if (typeof result.error === 'string') {
            errorMsg = result.error
          }
          toast.error(errorMsg)
        }
      } else {
        console.warn('⚠️ configureConnection not available, using fallback')
        // Fallback: just test connection
        await handleTestConnection()
        setTimeout(() => navigate('/dashboard'), 1500)
      }
    } catch (error) {
      console.error('❌ Exception in handleSave:', error)
      toast.error('Failed to save connection settings: ' + error.message)
    } finally {
      setLoading(false)
      console.log('🏁 handleSave complete')
    }
  }

  const getStatusIcon = () => {
    if (!status) return <FiServer className="w-6 h-6 text-gray-400" />

    const isConnected = status.connected || status.is_connected
    return isConnected 
      ? <FiCheckCircle className="w-6 h-6 text-green-500" />
      : <FiXCircle className="w-6 h-6 text-red-500" />
  }

  const getStatusText = () => {
    if (!status) return 'Unknown'
    const isConnected = status.connected || status.is_connected
    return isConnected ? 'Connected' : 'Disconnected'
  }

  const getStatusColor = () => {
    if (!status) return 'text-gray-600'
    const isConnected = status.connected || status.is_connected
    return isConnected ? 'text-green-600' : 'text-red-600'
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tally Connection Setup</h1>
        <p className="text-gray-600 mt-2">Configure your Tally ERP connection</p>
      </div>

      {/* Current Status */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Current Status</h3>
            <p className={`text-sm mt-1 ${getStatusColor()}`}>
              {getStatusText()}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <button
              onClick={checkStatus}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              Refresh
            </button>
          </div>
        </div>
        {status && status.message && (
          <p className="text-sm text-gray-600 mt-2">{status.message}</p>
        )}
      </Card>

      {/* Connection Configuration */}
      <Card title="Connection Settings">
        <div className="space-y-4">
          {/* Connection Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Connection Type
            </label>
            <select
              value={connectionType}
              onChange={(e) => setConnectionType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="LOCALHOST">Localhost</option>
              <option value="SERVER">Remote Server</option>
            </select>
          </div>

          {/* Server URL (only for remote) */}
          {connectionType === 'SERVER' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Server URL
              </label>
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="http://192.168.1.100"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the IP address or hostname of the server running Tally
              </p>
            </div>
          )}

          {/* Port */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Port
            </label>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(parseInt(e.target.value) || 9000)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Default Tally ODBC port is 9000
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              onClick={handleTestConnection}
              disabled={testing || loading}
              className="flex-1 btn btn-outline disabled:opacity-50"
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              onClick={handleSave}
              disabled={loading || testing}
              className="flex-1 btn btn-primary disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save & Continue'}
            </button>
          </div>
        </div>
      </Card>

      {/* Help Card */}
      <Card title="Connection Help">
        <div className="space-y-3 text-sm text-gray-600">
          <div>
            <h4 className="font-medium text-gray-900 mb-1">Localhost Connection</h4>
            <p>Connect to Tally running on your computer (http://localhost:9000)</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-1">Remote Server Connection</h4>
            <p>Connect to Tally running on another computer (e.g., http://192.168.1.100:9000)</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
            <h4 className="font-medium text-yellow-900 mb-2">Important:</h4>
            <ul className="list-disc list-inside space-y-1 text-yellow-800">
              <li>Tally must be running</li>
              <li>ODBC Server must be enabled in Tally</li>
              <li>Gateway of Tally → F1 (Help) → Press Y for Yes</li>
              <li>Default port is 9000</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}