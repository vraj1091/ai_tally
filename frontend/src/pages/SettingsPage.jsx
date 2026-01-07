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
    <div className="p-6 lg:p-8" style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Settings</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Configure your Tally connection and preferences</p>
        </div>
        <button
          onClick={fetchTallyStatus}
          className="btn-ghost flex items-center gap-2"
        >
          <FiRefreshCw className="w-4 h-4" />
          Refresh Status
        </button>
      </div>

      {/* Current Status */}
      <div className="card p-6 mb-6 animate-fade-up">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <FiDatabase className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>📡 Current Tally Connection Status</h2>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Live connection monitoring</p>
          </div>
        </div>

        {tallyStatus ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-xl" style={{ 
              background: tallyStatus.is_connected 
                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%)' 
                : 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%)', 
              border: `2px solid ${tallyStatus.is_connected ? '#10B981' : '#EF4444'}` 
            }}>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  {tallyStatus.is_connected ? (
                    <>
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#10B981' }}>
                        <FiCheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <span className="text-lg font-bold" style={{ color: '#10B981' }}>Connected</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Live connection active</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#EF4444' }}>
                        <FiAlertCircle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <span className="text-lg font-bold" style={{ color: '#EF4444' }}>Not Connected</span>
                        <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Connection unavailable</div>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--bg-surface)' }}>
                  <FiServer className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  <span className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {tallyStatus.url || 'No connection configured'}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center px-6 py-4 rounded-lg" style={{ background: 'var(--bg-surface)' }}>
                <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Companies Found</div>
                <div className="text-4xl font-bold" style={{ color: 'var(--primary)' }}>
                  {tallyStatus.company_count || 0}
                </div>
              </div>
            </div>

            {!tallyStatus.is_connected && (
              <div className="rounded-xl p-5" style={{ background: 'rgba(251, 191, 36, 0.1)', border: '2px solid rgba(251, 191, 36, 0.3)' }}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#F59E0B' }}>
                    <FiAlertCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold mb-2" style={{ color: '#F59E0B' }}>⚠️ Connection Issue</p>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {tallyStatus.message || 'Cannot reach Tally at http://localhost:9000'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full border-3 animate-spin mx-auto mb-4" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--primary)' }} />
            <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>Loading status...</p>
          </div>
        )}
      </div>

      {/* Quick Fix Button */}
      <div className="card p-6 mb-6 animate-fade-up" style={{ 
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(99, 102, 241, 0.1) 100%)', 
        border: '2px solid rgba(139, 92, 246, 0.3)',
        boxShadow: '0 4px 20px rgba(139, 92, 246, 0.1)'
      }}>
        <div className="flex flex-col md:flex-row items-start gap-5">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)'
          }}>
            <FiRefreshCw className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                🚀 Quick Fix: Reset to Localhost
              </h3>
              <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ background: '#8B5CF6', color: 'white' }}>
                Recommended
              </span>
            </div>
            <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              Having connection issues? Click here to reset your Tally connection to <span className="font-mono font-semibold" style={{ color: 'var(--primary)' }}>localhost:9000</span>.
              <br />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>✓ Works when Tally is running on this computer</span>
            </p>
            <button
              onClick={handleResetToLocalhost}
              disabled={resetting}
              className="btn-primary flex items-center gap-2"
              style={{
                background: resetting ? 'var(--bg-secondary)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                boxShadow: resetting ? 'none' : '0 4px 15px rgba(139, 92, 246, 0.4)'
              }}
            >
              {resetting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Resetting...
                </>
              ) : (
                <>
                  <FiRefreshCw className="w-4 h-4" />
                  Reset to Localhost Now
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Connection Configuration */}
      <div className="card p-6 animate-fade-up">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #06B6D4 0%, #0EA5E9 100%)' }}>
            <FiServer className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>🔧 Configure Tally Connection</h2>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Set up your Tally ERP connection</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Connection Type */}
          <div>
            <label className="block text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Connection Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => setConnectionType('localhost')}
                className="p-6 rounded-xl border-2 transition-all hover:scale-105"
                style={{
                  borderColor: connectionType === 'localhost' ? '#8B5CF6' : 'var(--border-color)',
                  background: connectionType === 'localhost' 
                    ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(99, 102, 241, 0.1) 100%)' 
                    : 'var(--bg-tertiary)',
                  boxShadow: connectionType === 'localhost' ? '0 4px 20px rgba(139, 92, 246, 0.2)' : 'none'
                }}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ 
                    background: connectionType === 'localhost' ? '#8B5CF6' : 'var(--bg-surface)' 
                  }}>
                    <FiDatabase 
                      className="w-6 h-6" 
                      style={{ color: connectionType === 'localhost' ? 'white' : 'var(--text-muted)' }}
                    />
                  </div>
                  <div className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Localhost</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Tally running on this computer</div>
                  {connectionType === 'localhost' && (
                    <div className="mt-3">
                      <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: '#8B5CF6', color: 'white' }}>
                        ✓ Selected
                      </span>
                    </div>
                  )}
                </div>
              </button>

              <button
                onClick={() => setConnectionType('server')}
                className="p-6 rounded-xl border-2 transition-all hover:scale-105"
                style={{
                  borderColor: connectionType === 'server' ? '#8B5CF6' : 'var(--border-color)',
                  background: connectionType === 'server' 
                    ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(99, 102, 241, 0.1) 100%)' 
                    : 'var(--bg-tertiary)',
                  boxShadow: connectionType === 'server' ? '0 4px 20px rgba(139, 92, 246, 0.2)' : 'none'
                }}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ 
                    background: connectionType === 'server' ? '#8B5CF6' : 'var(--bg-surface)' 
                  }}>
                    <FiServer 
                      className="w-6 h-6" 
                      style={{ color: connectionType === 'server' ? 'white' : 'var(--text-muted)' }}
                    />
                  </div>
                  <div className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Remote Server</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Tally on network/remote PC</div>
                  {connectionType === 'server' && (
                    <div className="mt-3">
                      <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: '#8B5CF6', color: 'white' }}>
                        ✓ Selected
                      </span>
                    </div>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Remote Server Configuration */}
          {connectionType === 'server' && (
            <div className="space-y-4 p-5 rounded-xl" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
              <div>
                <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  🌐 Server IP Address
                </label>
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="e.g., 192.168.1.100"
                  className="input-neon w-full"
                  style={{ fontSize: '16px' }}
                />
                <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg" style={{ background: 'var(--bg-surface)' }}>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    💡 Enter the IP address of the computer running Tally
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Port Configuration */}
          <div>
            <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              🔌 Port Number
            </label>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder="9000"
              className="input-neon w-full"
              style={{ fontSize: '16px' }}
            />
            <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                ℹ️ Default Tally Gateway port is 9000
              </span>
            </div>
          </div>

          {/* Connect Button */}
          <div className="pt-4">
            <button
              onClick={handleConnect}
              disabled={loading || (connectionType === 'server' && !serverUrl)}
              className="btn-primary w-full flex items-center justify-center gap-3 py-4 text-lg"
              style={{
                background: loading ? 'var(--bg-secondary)' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(16, 185, 129, 0.4)',
                cursor: (loading || (connectionType === 'server' && !serverUrl)) ? 'not-allowed' : 'pointer',
                opacity: (loading || (connectionType === 'server' && !serverUrl)) ? 0.6 : 1
              }}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                  Connecting...
                </>
              ) : (
                <>
                  <FiCheckCircle className="w-5 h-5" />
                  Connect to Tally
                </>
              )}
            </button>
          </div>

          {/* Troubleshooting Tips */}
          <div className="rounded-xl p-5" style={{ 
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(14, 165, 233, 0.05) 100%)', 
            border: '2px solid rgba(6, 182, 212, 0.3)' 
          }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#06B6D4' }}>
                <span className="text-lg">💡</span>
              </div>
              <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Troubleshooting Tips</h4>
            </div>
            <ul className="text-sm space-y-3" style={{ color: 'var(--text-secondary)' }}>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: '#06B6D4', color: 'white', fontSize: '10px' }}>✓</span>
                <span>Ensure Tally is running and a company is open</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: '#06B6D4', color: 'white', fontSize: '10px' }}>✓</span>
                <span>Enable Gateway in Tally: <span className="font-mono font-semibold" style={{ color: 'var(--primary)' }}>F1 → Settings → Connectivity</span></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: '#06B6D4', color: 'white', fontSize: '10px' }}>✓</span>
                <span>Check firewall allows port <span className="font-mono font-semibold" style={{ color: 'var(--primary)' }}>{port}</span></span>
              </li>
              {connectionType === 'server' && (
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: '#06B6D4', color: 'white', fontSize: '10px' }}>✓</span>
                  <span>Verify you can ping <span className="font-mono font-semibold" style={{ color: 'var(--primary)' }}>{serverUrl || 'the server'}</span></span>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

