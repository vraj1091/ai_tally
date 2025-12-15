import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  FiMessageCircle, FiBarChart2, FiFileText, FiDatabase, FiSettings, FiRefreshCw,
  FiTrendingUp, FiActivity, FiZap, FiServer, FiCloud, FiArrowRight, FiCheck,
  FiX, FiCpu, FiHardDrive, FiGrid, FiUsers, FiDollarSign
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
    { icon: FiMessageCircle, title: 'AI Assistant', desc: 'Chat with your financial data', link: '/chat', color: '#8B5CF6' },
    { icon: FiBarChart2, title: 'Analytics', desc: 'Deep insights & forecasts', link: '/analytics', color: '#10B981' },
    { icon: FiGrid, title: 'Dashboards', desc: '20+ specialized dashboards', link: '/dashboards', color: '#06B6D4' },
    { icon: FiDatabase, title: 'Tally Explorer', desc: 'Browse your Tally data', link: '/tally', color: '#0EA5E9' },
    { icon: FiFileText, title: 'Documents', desc: 'Upload & analyze files', link: '/documents', color: '#F59E0B' },
    { icon: FiSettings, title: 'Settings', desc: 'Configure preferences', link: '/settings', color: '#718096' }
  ]

  const stats = [
    { label: 'Companies', value: companies.length, icon: FiDatabase, color: '#0EA5E9' },
    { label: 'Status', value: connected ? 'Online' : 'Offline', icon: FiActivity, color: connected ? '#10B981' : '#EF4444' },
    { label: 'AI Model', value: 'Phi4:14b', icon: FiCpu, color: '#8B5CF6' },
    { label: 'System', value: systemHealth?.status === 'healthy' ? 'Healthy' : '...', icon: FiServer, color: '#06B6D4' }
  ]

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <header className="mb-8 animate-fade-up">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
              {time.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {getGreeting()}, <span className="text-gradient">{user?.username || 'User'}</span>
            </h1>
            <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Your performance summary this week</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={handleRefresh} disabled={refreshing} className="btn-ghost flex items-center gap-2">
              <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Syncing...' : 'Refresh'}
            </button>
            <button onClick={() => setShowConnectionModal(true)} className="btn-primary flex items-center gap-2">
              <FiSettings className="w-4 h-4" /> Configure
            </button>
          </div>
        </div>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <div key={i} className="stat-card animate-fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{loading ? '...' : stat.value}</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: `${stat.color}15` }}>
                <stat.icon className="w-6 h-6" style={{ color: stat.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Connection Status */}
      <div className="card p-5 mb-8 animate-fade-up" style={{ borderLeft: `4px solid ${connected ? '#10B981' : '#EF4444'}` }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: connected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' }}>
              {connected ? <FiCheck className="w-6 h-6" style={{ color: '#10B981' }} /> : <FiX className="w-6 h-6" style={{ color: '#EF4444' }} />}
            </div>
            <div>
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{connected ? 'Tally Connected' : 'Tally Disconnected'}</h3>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {connected ? `${companies.filter(c => c.source === 'live').length} live • ${companies.filter(c => c.source === 'backup').length} backup` : 'Connect to Tally or upload backup'}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowConnectionModal(true)} className="btn-ghost text-sm">{connected ? 'Manage' : 'Setup'}</button>
            <Link to="/documents" className="btn-ghost text-sm flex items-center gap-2"><FiFileText className="w-4 h-4" /> Upload</Link>
          </div>
        </div>
      </div>

      {/* Feature Cards */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Quick Access</h2>
          <span className="badge badge-primary text-xs">6 Features</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <Link key={i} to={f.link} className="card p-5 group animate-fade-up" style={{ animationDelay: `${0.1 + i * 0.05}s` }}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: f.color }}>
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors" style={{ color: 'var(--text-primary)' }}>{f.title}</h3>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
                </div>
                <FiArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" style={{ color: 'var(--primary)' }} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Companies */}
      {companies.length > 0 && (
        <section className="animate-fade-up" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Your Companies</h2>
            <Link to="/tally" className="text-sm font-medium flex items-center gap-1" style={{ color: 'var(--primary)' }}>View All <FiArrowRight className="w-4 h-4" /></Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {companies.slice(0, 6).map((c, i) => (
              <Link key={i} to={`/analytics?company=${encodeURIComponent(typeof c.name === 'string' ? c.name : 'Unknown')}`} className="card p-4 group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: c.source === 'live' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(6, 182, 212, 0.15)' }}>
                    {c.source === 'live' ? <FiCloud className="w-5 h-5" style={{ color: '#10B981' }} /> : <FiHardDrive className="w-5 h-5" style={{ color: '#06B6D4' }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{typeof c.name === 'string' ? c.name : 'Unknown'}</h4>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.source === 'live' ? 'Live' : 'Backup'}</p>
                  </div>
                  <span className={`badge text-xs ${c.source === 'live' ? 'badge-green' : 'badge-cyan'}`}>{c.source === 'live' ? 'LIVE' : 'BACKUP'}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {companies.length === 0 && !loading && (
        <div className="card p-12 text-center animate-fade-up">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
            <FiDatabase className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>No Companies Found</h3>
          <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>Connect to Tally or upload a backup file</p>
          <div className="flex gap-4 justify-center">
            <button onClick={() => setShowConnectionModal(true)} className="btn-primary">Setup Connection</button>
            <Link to="/documents" className="btn-ghost">Upload Backup</Link>
          </div>
        </div>
      )}

      <Modal isOpen={showConnectionModal} onClose={() => setShowConnectionModal(false)} title="Configure Connection">
        <ConnectionSetup />
      </Modal>
    </div>
  )
}
