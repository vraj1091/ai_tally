import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  FiMessageCircle, FiBarChart2, FiFileText, FiDatabase, FiSettings, FiRefreshCw,
  FiTrendingUp, FiActivity, FiZap, FiServer, FiCloud, FiArrowRight, FiCheck,
  FiX, FiCpu, FiHardDrive, FiGrid, FiPlay, FiExternalLink
} from 'react-icons/fi'
import Modal from '../components/common/Modal'
import ConnectionSetup from '../components/tally/ConnectionSetup'
import useTallyStore from '../store/tallyStore'
import useAuthStore from '../store/authStore'
import { tallyApi } from '../api/tallyApi'
import toast from 'react-hot-toast'

export default function Dashboard() {
  const { companies, connected, setCompanies, setConnected } = useTallyStore()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [showConnectionModal, setShowConnectionModal] = useState(false)
  const [systemHealth, setSystemHealth] = useState(null)
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    checkTallyConnection()
    checkSystemHealth()
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const checkSystemHealth = async () => {
    try {
      const res = await fetch('/api/health')
      setSystemHealth(await res.json())
    } catch (e) {}
  }

  const checkTallyConnection = async () => {
    setLoading(true)
    try {
      const connType = localStorage.getItem('tally_connection_type')
      const token = localStorage.getItem('tally_bridge_token') || 'user_tally_bridge'
      let isConn = false

      if (connType === 'BRIDGE') {
        try {
          const bs = await tallyApi.getBridgeStatus(token)
          if (bs?.connected && bs?.tally_connected) isConn = true
        } catch (e) {}
      }

      if (!isConn) {
        const status = await tallyApi.getStatus()
        isConn = status.is_connected || status.connected || false
      }

      setConnected(isConn)

      let all = []
      if (isConn) {
        try {
          const data = await tallyApi.getCompanies()
          all = (data.companies || []).map(c => ({ name: c.name || c, source: 'live' }))
        } catch (e) {}
      }

      try {
        const backup = await tallyApi.getBackupCompanies()
        const b = (backup.companies || []).filter(c => !all.some(x => x.name === (c.name || c))).map(c => ({ name: c.name || c, source: 'backup' }))
        all = [...all, ...b]
      } catch (e) {}

      setCompanies(all)
      if (isConn) toast.success('Connected to Tally!')
    } catch (e) {
      setConnected(false)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await checkTallyConnection()
      toast.success('Data refreshed!')
    } finally {
      setRefreshing(false)
    }
  }

  const getGreeting = () => {
    const h = time.getHours()
    if (h < 12) return 'Good Morning'
    if (h < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  const features = [
    { icon: FiMessageCircle, title: 'AI Assistant', desc: 'Chat with your financial data using Phi4 AI model', link: '/chat', gradient: 'from-[#00F5FF] to-[#0066FF]' },
    { icon: FiBarChart2, title: 'Analytics', desc: 'Deep insights, forecasts & financial intelligence', link: '/analytics', gradient: 'from-[#00FF88] to-[#00F5FF]' },
    { icon: FiGrid, title: 'Dashboards', desc: '20+ specialized business dashboards', link: '/dashboards', gradient: 'from-[#BF00FF] to-[#FF00E5]' },
    { icon: FiDatabase, title: 'Tally Explorer', desc: 'Browse and search your Tally data', link: '/tally', gradient: 'from-[#FF6B00] to-[#FF00E5]' },
    { icon: FiFileText, title: 'Documents', desc: 'Upload & analyze bills, invoices & reports', link: '/documents', gradient: 'from-[#FF00E5] to-[#BF00FF]' },
    { icon: FiSettings, title: 'Settings', desc: 'Configure connections & preferences', link: '/settings', gradient: 'from-[#0066FF] to-[#00F5FF]' }
  ]

  const stats = [
    { label: 'Companies', value: companies.length, icon: FiDatabase, color: '#00F5FF' },
    { label: 'Status', value: connected ? 'Online' : 'Offline', icon: FiActivity, color: connected ? '#00FF88' : '#FF6B00' },
    { label: 'AI Model', value: 'Phi4:14b', icon: FiCpu, color: '#BF00FF' },
    { label: 'System', value: systemHealth?.status === 'healthy' ? 'Healthy' : '...', icon: FiServer, color: '#FF00E5' }
  ]

  return (
    <div className="min-h-screen p-6 lg:p-10">
      {/* Header Section */}
      <header className="mb-12 animate-fade-up">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <p className="text-white/40 text-sm font-medium uppercase tracking-widest mb-2">
              {time.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <h1 className="text-4xl lg:text-5xl font-black">
              {getGreeting()}, <span className="text-gradient">{user?.username || 'User'}</span>
            </h1>
            <p className="text-white/50 mt-2 text-lg">Welcome back to your AI-powered analytics dashboard</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={handleRefresh} disabled={refreshing}
              className="btn-ghost flex items-center gap-2 disabled:opacity-50">
              <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Syncing...' : 'Refresh'}
            </button>
            <button onClick={() => setShowConnectionModal(true)} className="btn-neon flex items-center gap-2">
              <FiSettings className="w-4 h-4" />
              Configure
            </button>
          </div>
        </div>
      </header>

      {/* Connection Status Banner */}
      <div className={`glass-card p-6 mb-10 animate-fade-up stagger-1 ${connected ? 'border-[#00FF88]/30' : 'border-[#FF6B00]/30'}`} style={{ borderWidth: '1px' }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${connected ? 'bg-[#00FF88]/20' : 'bg-[#FF6B00]/20'}`}>
              {connected ? <FiCheck className="w-7 h-7 text-[#00FF88]" /> : <FiX className="w-7 h-7 text-[#FF6B00]" />}
            </div>
            <div>
              <h3 className="text-xl font-bold">{connected ? 'Tally Connected' : 'Tally Disconnected'}</h3>
              <p className="text-white/50">
                {connected 
                  ? `${companies.filter(c => c.source === 'live').length} live companies • ${companies.filter(c => c.source === 'backup').length} backup`
                  : 'Connect to Tally or upload a backup file to get started'}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowConnectionModal(true)} className="btn-ghost text-sm">
              {connected ? 'Manage Connection' : 'Setup Connection'}
            </button>
            <Link to="/documents" className="btn-ghost text-sm flex items-center gap-2">
              <FiFileText className="w-4 h-4" /> Upload Backup
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {stats.map((stat, i) => (
          <div key={i} className="glass-card p-5 animate-fade-up" style={{ animationDelay: `${0.1 + i * 0.05}s` }}>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${stat.color}20` }}>
                <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
              </div>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: stat.color }} />
            </div>
            <p className="text-white/40 text-xs uppercase tracking-wider font-medium">{stat.label}</p>
            <p className="text-2xl font-bold mt-1">{loading ? '...' : stat.value}</p>
          </div>
        ))}
      </div>

      {/* Feature Cards Grid */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Quick Access</h2>
          <span className="stat-badge">6 Features</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <Link key={i} to={f.link} className="group animate-fade-up" style={{ animationDelay: `${0.2 + i * 0.05}s` }}>
              <div className="glass-card p-6 h-full relative overflow-hidden">
                {/* Gradient Orb */}
                <div className={`absolute -top-16 -right-16 w-40 h-40 rounded-full bg-gradient-to-br ${f.gradient} opacity-10 group-hover:opacity-25 blur-2xl transition-opacity duration-700`} />
                
                {/* Icon */}
                <div className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                  <f.icon className="w-7 h-7 text-white" />
                </div>
                
                {/* Content */}
                <h3 className="text-xl font-bold mb-2 group-hover:text-gradient transition-all">{f.title}</h3>
                <p className="text-white/50 text-sm mb-5 leading-relaxed">{f.desc}</p>
                
                {/* Action */}
                <div className="flex items-center text-sm font-medium text-white/40 group-hover:text-[#00F5FF] transition-colors">
                  <FiPlay className="w-4 h-4 mr-2" />
                  Open
                  <FiArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-2 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Companies Section */}
      {companies.length > 0 && (
        <section className="animate-fade-up" style={{ animationDelay: '0.5s' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Your Companies</h2>
            <Link to="/tally" className="flex items-center gap-2 text-white/50 hover:text-[#00F5FF] text-sm transition-colors">
              View All <FiExternalLink className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {companies.slice(0, 6).map((c, i) => (
              <Link key={i} to={`/analytics?company=${encodeURIComponent(c.name)}`}
                className="glass-card p-5 group">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${c.source === 'live' ? 'bg-[#00FF88]/20' : 'bg-[#FF6B00]/20'}`}>
                    {c.source === 'live' ? <FiCloud className="w-6 h-6 text-[#00FF88]" /> : <FiHardDrive className="w-6 h-6 text-[#FF6B00]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold truncate group-hover:text-gradient transition-all">{c.name}</h4>
                    <p className="text-white/40 text-sm">{c.source === 'live' ? 'Live Connection' : 'Backup Data'}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${c.source === 'live' ? 'bg-[#00FF88]/20 text-[#00FF88] border border-[#00FF88]/30' : 'bg-[#FF6B00]/20 text-[#FF6B00] border border-[#FF6B00]/30'}`}>
                    {c.source === 'live' ? 'LIVE' : 'BACKUP'}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {companies.length === 0 && !loading && (
        <div className="glass-card p-12 text-center animate-fade-up">
          <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-[#FF6B00] to-[#FF00E5] flex items-center justify-center">
            <FiDatabase className="w-12 h-12 text-white" />
          </div>
          <h3 className="text-2xl font-bold mb-3">No Companies Found</h3>
          <p className="text-white/50 mb-8 max-w-md mx-auto">Connect to Tally ERP or upload a backup file to start analyzing your financial data</p>
          <div className="flex gap-4 justify-center">
            <button onClick={() => setShowConnectionModal(true)} className="btn-neon">
              Setup Tally Connection
            </button>
            <Link to="/documents" className="btn-ghost">
              Upload Backup File
            </Link>
          </div>
        </div>
      )}

      {/* System Footer */}
      {systemHealth && (
        <footer className="mt-12 pt-8 border-t border-white/5">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-white/30">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00FF88] animate-pulse" />
                DB: {systemHealth.database_status || 'Connected'}
              </span>
              <span>CPU: {systemHealth.system?.cpu_percent || 0}%</span>
              <span>RAM: {systemHealth.system?.memory_percent || 0}%</span>
            </div>
            <span className="text-gradient font-semibold">TallyDash Pro v{systemHealth.version || '2.0.0'}</span>
          </div>
        </footer>
      )}

      <Modal isOpen={showConnectionModal} onClose={() => setShowConnectionModal(false)} title="Configure Connection">
        <ConnectionSetup />
      </Modal>
    </div>
  )
}
