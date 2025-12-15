import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  FiMessageCircle, FiBarChart2, FiFileText, FiDatabase, FiSettings, FiRefreshCw,
  FiTrendingUp, FiUsers, FiActivity, FiZap, FiShield, FiCpu, FiCheckCircle,
  FiAlertCircle, FiGrid, FiServer, FiCloud, FiGlobe, FiArrowRight
} from 'react-icons/fi'
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
  const [refreshing, setRefreshing] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [showConnectionModal, setShowConnectionModal] = useState(false)
  const [systemHealth, setSystemHealth] = useState(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    checkTallyConnection()
    checkSystemHealth()
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const checkSystemHealth = async () => {
    try {
      const response = await fetch('/api/health')
      const data = await response.json()
      setSystemHealth(data)
    } catch (e) {
      console.warn('Health check failed')
    }
  }

  const checkTallyConnection = async () => {
    setLoading(true)
    try {
      const connectionType = localStorage.getItem('tally_connection_type')
      const bridgeToken = localStorage.getItem('tally_bridge_token') || 'user_tally_bridge'
      
      let isConnected = false
      
      if (connectionType === 'BRIDGE') {
        try {
          const bridgeStatus = await tallyApi.getBridgeStatus(bridgeToken)
          if (bridgeStatus && bridgeStatus.connected && bridgeStatus.tally_connected) {
            isConnected = true
          }
        } catch (bridgeError) {
          console.warn('Bridge status check failed')
        }
      }
      
      if (!isConnected) {
        const status = await tallyApi.getStatus()
        isConnected = status.is_connected || status.connected || false
      }
      
      setConnected(isConnected)
      
      let allCompanies = []
      
      if (isConnected) {
        try {
          const companiesData = await tallyApi.getCompanies()
          const liveCompanies = (companiesData.companies || companiesData.data?.companies || [])
            .map(c => ({ ...c, name: c.name || c, source: 'live' }))
          allCompanies = [...liveCompanies]
        } catch (error) {
          console.error('Error fetching live companies')
        }
      }
      
      try {
        const backupData = await tallyApi.getBackupCompanies()
        const backupCompanies = (backupData.companies || [])
          .filter(c => !allCompanies.some(live => live.name === (c.name || c)))
          .map(c => ({ ...c, name: c.name || c, source: 'backup' }))
        allCompanies = [...allCompanies, ...backupCompanies]
      } catch (error) {
        console.warn('Backup companies not available')
      }
      
      setCompanies(allCompanies)
      
      if (isConnected) {
        toast.success('Connected to Tally', { duration: 2000 })
      } else if (allCompanies.length > 0) {
        toast.success(`Loaded ${allCompanies.length} companies`, { duration: 2000 })
      }
    } catch (error) {
      console.error('Error checking Tally connection:', error)
      setConnected(false)
      
      try {
        const backupData = await tallyApi.getBackupCompanies()
        const backupCompanies = (backupData.companies || [])
          .map(c => ({ ...c, name: c.name || c, source: 'backup' }))
        if (backupCompanies.length > 0) {
          setCompanies(backupCompanies)
          return
        }
      } catch (backupError) {}
      
      setRetryCount(prev => prev + 1)
    } finally {
      setLoading(false)
    }
  }

  const handleRefreshCompanies = async () => {
    setRefreshing(true)
    try {
      let allCompanies = []
      
      try {
        await tallyApi.clearCache('companies')
      } catch (e) {}
      
      try {
        const result = await tallyApi.refreshCompanies()
        if (result.success && result.companies) {
          const liveCompanies = result.companies.map(c => ({
            name: typeof c === 'object' ? c.name : c,
            source: 'live'
          })).filter(c => c.name)
          allCompanies = [...liveCompanies]
          setConnected(true)
        }
      } catch (error) {}
      
      try {
        const backupData = await tallyApi.getBackupCompanies()
        const backupCompanies = (backupData.companies || [])
          .filter(c => !allCompanies.some(live => live.name === (c.name || c)))
          .map(c => ({ name: c.name || c, source: 'backup' }))
        allCompanies = [...allCompanies, ...backupCompanies]
      } catch (error) {}
      
      if (allCompanies.length > 0) {
        setCompanies(allCompanies)
        toast.success(`Found ${allCompanies.length} companies`)
      } else {
        toast.error('No companies found')
      }
    } catch (error) {
      toast.error('Failed to refresh')
    } finally {
      setRefreshing(false)
    }
  }

  const features = [
    {
      icon: FiMessageCircle,
      title: 'AI Chat Assistant',
      description: 'Ask questions about your financial data using advanced AI',
      link: '/chat',
      gradient: 'from-blue-500 to-indigo-600',
      iconBg: 'bg-blue-500'
    },
    {
      icon: FiBarChart2,
      title: 'Analytics Dashboard',
      description: 'Visualize trends, forecasts, and financial insights',
      link: '/analytics',
      gradient: 'from-emerald-500 to-teal-600',
      iconBg: 'bg-emerald-500'
    },
    {
      icon: FiGrid,
      title: 'Dashboards Hub',
      description: 'Role-based dashboards for CEO, CFO, Sales & more',
      link: '/dashboards',
      gradient: 'from-purple-500 to-pink-600',
      iconBg: 'bg-purple-500'
    },
    {
      icon: FiDatabase,
      title: 'Tally Explorer',
      description: 'Browse companies, ledgers, and transaction data',
      link: '/tally',
      gradient: 'from-orange-500 to-red-500',
      iconBg: 'bg-orange-500'
    },
    {
      icon: FiFileText,
      title: 'Document Manager',
      description: 'Upload and analyze financial documents',
      link: '/documents',
      gradient: 'from-cyan-500 to-blue-500',
      iconBg: 'bg-cyan-500'
    },
    {
      icon: FiSettings,
      title: 'Settings',
      description: 'Configure connections and preferences',
      link: '/settings',
      gradient: 'from-slate-500 to-slate-700',
      iconBg: 'bg-slate-500'
    }
  ]

  const getGreeting = () => {
    const hour = currentTime.getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold text-slate-800">
                {getGreeting()}, <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{user?.username || user?.email?.split('@')[0] || 'User'}</span>! 👋
              </h1>
              <p className="text-slate-500 mt-2 text-lg">
                {currentTime.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            
            <button
              onClick={() => setShowConnectionModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25 font-medium"
            >
              <FiSettings className="w-4 h-4" />
              Configure Connection
            </button>
          </div>
        </div>

        {/* Connection Status Banner */}
        <div className={`mb-8 rounded-2xl p-6 ${connected ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-gradient-to-r from-amber-500 to-orange-500'} text-white shadow-xl`}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl ${connected ? 'bg-white/20' : 'bg-white/20'} flex items-center justify-center backdrop-blur-sm`}>
                {connected ? <FiCheckCircle className="w-7 h-7" /> : <FiAlertCircle className="w-7 h-7" />}
              </div>
              <div>
                <h3 className="text-xl font-bold">
                  {connected ? 'Tally Connected' : 'Tally Disconnected'}
                </h3>
                <p className="text-white/80 mt-0.5">
                  {connected 
                    ? `${companies.filter(c => c.source === 'live').length} live + ${companies.filter(c => c.source === 'backup').length} backup companies` 
                    : 'Connect to Tally or upload a backup file to get started'}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              {connected && (
                <button
                  onClick={handleRefreshCompanies}
                  disabled={refreshing}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors font-medium backdrop-blur-sm"
                >
                  <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
              )}
              {!connected && (
                <button
                  onClick={checkTallyConnection}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white text-amber-600 hover:bg-white/90 rounded-xl transition-colors font-medium"
                >
                  {loading ? 'Checking...' : 'Retry Connection'}
                </button>
              )}
              <button
                onClick={() => setShowConnectionModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors font-medium backdrop-blur-sm"
              >
                <FiSettings className="w-4 h-4" />
                Settings
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium">Companies</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{loading ? '...' : companies.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <FiDatabase className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium">Status</p>
                <p className={`text-2xl font-bold mt-1 ${connected ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {connected ? 'Online' : 'Offline'}
                </p>
              </div>
              <div className={`w-12 h-12 ${connected ? 'bg-emerald-100' : 'bg-amber-100'} rounded-xl flex items-center justify-center`}>
                <FiActivity className={`w-6 h-6 ${connected ? 'text-emerald-600' : 'text-amber-600'}`} />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium">AI Model</p>
                <p className="text-xl font-bold text-purple-600 mt-1">Phi4:14b</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <FiCpu className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium">System</p>
                <p className={`text-xl font-bold mt-1 ${systemHealth?.status === 'healthy' ? 'text-emerald-600' : 'text-slate-600'}`}>
                  {systemHealth?.status === 'healthy' ? 'Healthy' : 'Checking...'}
                </p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <FiShield className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">Quick Access</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Link key={index} to={feature.link} className="group">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-slate-500 mb-4">{feature.description}</p>
                  <div className="flex items-center text-blue-600 font-medium text-sm group-hover:gap-2 transition-all">
                    Open <FiArrowRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Companies List */}
        {companies.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Your Companies</h2>
              <Link to="/tally" className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                View All <FiArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {companies.slice(0, 6).map((company, index) => (
                <Link key={index} to={`/analytics?company=${encodeURIComponent(company.name)}`}>
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${company.source === 'live' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                          {company.source === 'live' ? <FiGlobe className="w-5 h-5" /> : <FiServer className="w-5 h-5" />}
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-800 truncate max-w-[180px]">{company.name || 'Unnamed'}</h3>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {company.source === 'live' ? 'Live Connection' : 'Backup Data'}
                          </p>
                        </div>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        company.source === 'live' 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {company.source === 'live' ? '● Live' : '○ Backup'}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {companies.length === 0 && !loading && (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-8 border border-amber-200">
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiDatabase className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-amber-900 mb-2">No Companies Found</h3>
              <p className="text-amber-700 mb-6 max-w-md mx-auto">
                Connect to live Tally ERP or upload a backup file (.tbk / .xml) to start analyzing your financial data.
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setShowConnectionModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors font-medium"
                >
                  <FiSettings className="w-4 h-4" />
                  Setup Connection
                </button>
                <Link
                  to="/documents"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-amber-700 border-2 border-amber-300 rounded-xl hover:bg-amber-50 transition-colors font-medium"
                >
                  <FiFileText className="w-4 h-4" />
                  Upload Backup
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* System Info Footer */}
        {systemHealth && (
          <div className="bg-white/50 rounded-2xl p-6 border border-slate-200 backdrop-blur-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-slate-500">
              <div className="flex items-center gap-6">
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  Database: {systemHealth.database_status || 'connected'}
                </span>
                <span className="flex items-center gap-2">
                  <FiCpu className="w-4 h-4" />
                  CPU: {systemHealth.system?.cpu_percent || 0}%
                </span>
                <span className="flex items-center gap-2">
                  <FiServer className="w-4 h-4" />
                  Memory: {systemHealth.system?.memory_percent || 0}%
                </span>
              </div>
              <span>TallyDash Pro v{systemHealth.version || '2.0.0'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Connection Setup Modal */}
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
