import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  FiMessageCircle, FiBarChart2, FiFileText, FiDatabase, FiSettings, FiRefreshCw,
  FiTrendingUp, FiActivity, FiZap, FiServer, FiCloud, FiArrowRight, FiCheck,
  FiX, FiClock, FiCpu, FiHardDrive, FiGrid
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
      if (isConn) toast.success('Connected!')
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
      toast.success('Refreshed!')
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
    { icon: FiMessageCircle, title: 'AI Assistant', desc: 'Chat with your data using Phi4', link: '/chat', color: 'from-violet-500 to-purple-600' },
    { icon: FiBarChart2, title: 'Analytics', desc: 'Financial insights & forecasts', link: '/analytics', color: 'from-emerald-500 to-teal-600' },
    { icon: FiGrid, title: 'Dashboards', desc: '20 specialized dashboards', link: '/dashboards', color: 'from-orange-500 to-red-500' },
    { icon: FiDatabase, title: 'Tally Explorer', desc: 'Browse your Tally data', link: '/tally', color: 'from-blue-500 to-indigo-600' },
    { icon: FiFileText, title: 'Documents', desc: 'Upload & analyze files', link: '/documents', color: 'from-pink-500 to-rose-600' },
    { icon: FiSettings, title: 'Settings', desc: 'Configure your workspace', link: '/settings', color: 'from-slate-500 to-slate-700' }
  ]

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white overflow-hidden">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[150px]" />
        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-rose-600/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-12">
          <div>
            <p className="text-white/50 text-sm font-medium uppercase tracking-wider">{time.toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
            <h1 className="text-5xl font-black mt-2">
              {getGreeting()}, <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">{user?.username || 'User'}</span>
            </h1>
          </div>
          <button onClick={() => setShowConnectionModal(true)}
            className="group flex items-center gap-3 px-5 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl hover:bg-white/10 transition-all">
            <FiSettings className="w-5 h-5 text-white/60 group-hover:rotate-90 transition-transform duration-500" />
            <span className="font-medium text-white/80">Configure</span>
          </button>
        </header>

        {/* Connection Status */}
        <div className={`mb-10 p-6 rounded-3xl backdrop-blur-xl border ${connected ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${connected ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
                {connected ? <FiCheck className="w-7 h-7 text-emerald-400" /> : <FiX className="w-7 h-7 text-amber-400" />}
              </div>
              <div>
                <h3 className="text-xl font-bold">{connected ? 'Tally Connected' : 'Tally Disconnected'}</h3>
                <p className="text-white/50 text-sm mt-0.5">
                  {connected 
                    ? `${companies.filter(c => c.source === 'live').length} live + ${companies.filter(c => c.source === 'backup').length} backup`
                    : 'Connect to Tally or upload backup'}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleRefresh} disabled={refreshing}
                className="px-5 py-2.5 bg-white/10 rounded-xl font-medium hover:bg-white/20 transition-all flex items-center gap-2 disabled:opacity-50">
                <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Syncing...' : 'Sync'}
              </button>
              <button onClick={() => setShowConnectionModal(true)}
                className="px-5 py-2.5 bg-white/10 rounded-xl font-medium hover:bg-white/20 transition-all">
                Settings
              </button>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Companies', value: companies.length, icon: FiDatabase, color: 'text-blue-400' },
            { label: 'Status', value: connected ? 'Online' : 'Offline', icon: FiActivity, color: connected ? 'text-emerald-400' : 'text-amber-400' },
            { label: 'AI Model', value: 'Phi4:14b', icon: FiCpu, color: 'text-purple-400' },
            { label: 'System', value: systemHealth?.status === 'healthy' ? 'Healthy' : 'Checking', icon: FiServer, color: 'text-cyan-400' }
          ].map((stat, i) => (
            <div key={i} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                <div className={`w-2 h-2 rounded-full ${stat.color.replace('text-', 'bg-')} animate-pulse`} />
              </div>
              <p className="text-white/50 text-xs uppercase tracking-wider">{stat.label}</p>
              <p className="text-2xl font-bold mt-1">{loading ? '...' : stat.value}</p>
            </div>
          ))}
        </div>

        {/* Features Grid */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-6">Quick Access</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <Link key={i} to={f.link} className="group">
                <div className="relative h-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 overflow-hidden hover:border-white/20 transition-all duration-500">
                  <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br ${f.color} opacity-10 group-hover:opacity-20 blur-2xl transition-opacity duration-500`} />
                  <div className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                    <f.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 group-hover:text-white transition-colors">{f.title}</h3>
                  <p className="text-white/50 text-sm mb-4">{f.desc}</p>
                  <div className="flex items-center text-sm font-medium text-white/40 group-hover:text-white/80 transition-colors">
                    Open <FiArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Companies */}
        {companies.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Your Companies</h2>
              <Link to="/tally" className="text-white/50 hover:text-white text-sm flex items-center gap-1">
                View All <FiArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {companies.slice(0, 6).map((c, i) => (
                <Link key={i} to={`/analytics?company=${encodeURIComponent(c.name)}`}
                  className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 hover:border-white/20 hover:bg-white/10 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${c.source === 'live' ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
                      {c.source === 'live' ? <FiCloud className="w-6 h-6 text-emerald-400" /> : <FiHardDrive className="w-6 h-6 text-amber-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold truncate group-hover:text-white transition-colors">{c.name}</h4>
                      <p className="text-white/40 text-sm">{c.source === 'live' ? 'Live Connection' : 'Backup Data'}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold ${c.source === 'live' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      {c.source === 'live' ? 'Live' : 'Backup'}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {companies.length === 0 && !loading && (
          <div className="text-center py-16 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl">
            <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-amber-500/20 flex items-center justify-center">
              <FiDatabase className="w-10 h-10 text-amber-400" />
            </div>
            <h3 className="text-2xl font-bold mb-2">No Companies Found</h3>
            <p className="text-white/50 mb-6">Connect to Tally or upload a backup file</p>
            <div className="flex gap-4 justify-center">
              <button onClick={() => setShowConnectionModal(true)}
                className="px-6 py-3 bg-white text-slate-900 rounded-xl font-semibold hover:bg-white/90 transition-all">
                Setup Connection
              </button>
              <Link to="/documents"
                className="px-6 py-3 bg-white/10 rounded-xl font-semibold hover:bg-white/20 transition-all">
                Upload Backup
              </Link>
            </div>
          </div>
        )}

        {/* Footer Stats */}
        {systemHealth && (
          <footer className="mt-12 pt-8 border-t border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-white/30">
              <div className="flex items-center gap-6">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  DB: {systemHealth.database_status || 'Connected'}
                </span>
                <span>CPU: {systemHealth.system?.cpu_percent || 0}%</span>
                <span>RAM: {systemHealth.system?.memory_percent || 0}%</span>
              </div>
              <span>TallyDash Pro v{systemHealth.version || '2.0.0'}</span>
            </div>
          </footer>
        )}
      </div>

      <Modal isOpen={showConnectionModal} onClose={() => setShowConnectionModal(false)} title="Configure Connection">
        <ConnectionSetup />
      </Modal>
    </div>
  )
}
