import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  FiHome, FiGrid, FiBarChart2, FiFileText, FiDatabase, 
  FiMessageCircle, FiLogOut, FiMenu, FiX, FiChevronRight,
  FiBell, FiSettings, FiZap, FiCpu, FiWifi, FiWifiOff
} from 'react-icons/fi';
import { Toaster } from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { tallyApi } from '../api/tallyApi';

const ProfessionalLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tallyStatus, setTallyStatus] = useState({ connected: false });
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkTallyStatus = async () => {
      try {
        const connectionType = localStorage.getItem('tally_connection_type');
        const bridgeToken = localStorage.getItem('tally_bridge_token') || 'user_tally_bridge';
        
        if (connectionType === 'BRIDGE') {
          const bridgeStatus = await tallyApi.getBridgeStatus(bridgeToken);
          if (bridgeStatus?.connected) {
            setTallyStatus({ connected: bridgeStatus.tally_connected || false, viaBridge: true });
            return;
          }
        }
        
        const status = await tallyApi.getStatus();
        setTallyStatus({ connected: status?.connected || status?.is_connected || false, viaBridge: false });
      } catch {
        setTallyStatus({ connected: false });
      }
    };

    const timeout = setTimeout(checkTallyStatus, 1000);
    const interval = setInterval(checkTallyStatus, 30000);
    return () => { clearTimeout(timeout); clearInterval(interval); };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', path: '/dashboard', icon: FiHome },
    { name: 'Analytics', path: '/analytics', icon: FiBarChart2 },
    { name: 'Dashboards', path: '/dashboards', icon: FiGrid },
    { name: 'Tally Data', path: '/tally', icon: FiDatabase },
    { name: 'Documents', path: '/documents', icon: FiFileText },
    { name: 'AI Chat', path: '/chat', icon: FiMessageCircle },
    { name: 'Settings', path: '/settings', icon: FiSettings },
  ];

  return (
    <div className="min-h-screen bg-[#050505] flex">
      {/* Ambient Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-[#00F5FF]/5 rounded-full blur-4xl" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-[#BF00FF]/5 rounded-full blur-4xl" />
        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-[#FF00E5]/5 rounded-full blur-4xl" />
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />
      </div>

      {/* Sidebar - Desktop */}
      <aside className={`hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-50 transition-all duration-500 ${sidebarOpen ? 'w-72' : 'w-20'}`}>
        <div className="flex-1 flex flex-col bg-[#0a0a0a]/80 backdrop-blur-2xl border-r border-white/5">
          {/* Logo */}
          <div className="p-6 flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00F5FF] to-[#BF00FF] flex items-center justify-center shadow-lg animate-pulse-glow">
                <FiZap className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-[#00F5FF] to-[#BF00FF] opacity-30 blur-lg -z-10" />
            </div>
            {sidebarOpen && (
              <div className="animate-fade-up">
                <h1 className="text-xl font-bold text-gradient">TallyDash</h1>
                <p className="text-xs text-white/40">AI-Powered Analytics</p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item, i) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && <span className="font-medium">{item.name}</span>}
                  {sidebarOpen && isActive && <FiChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              );
            })}
          </nav>

          {/* Status Card */}
          {sidebarOpen && (
            <div className="px-4 pb-4">
              <div className="glass-card p-4">
                <div className="flex items-center gap-3 mb-3">
                  {tallyStatus.connected ? (
                    <div className="w-10 h-10 rounded-xl bg-[#00FF88]/20 flex items-center justify-center">
                      <FiWifi className="w-5 h-5 text-[#00FF88]" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-[#FF6B00]/20 flex items-center justify-center">
                      <FiWifiOff className="w-5 h-5 text-[#FF6B00]" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold">{tallyStatus.connected ? 'Connected' : 'Disconnected'}</p>
                    <p className="text-xs text-white/40">{tallyStatus.viaBridge ? 'Via Bridge' : 'Direct'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <FiCpu className="w-3 h-3 text-[#00F5FF]" />
                  <span className="text-xs text-white/50">Phi4:14b Ready</span>
                </div>
              </div>
            </div>
          )}

          {/* User Section */}
          <div className="p-4 border-t border-white/5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#BF00FF] to-[#FF00E5] flex items-center justify-center font-bold text-white">
                  {(user?.username || user?.name || 'U')[0].toUpperCase()}
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#00FF88] rounded-full border-2 border-[#0a0a0a]" />
              </div>
              {sidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{user?.username || user?.name || 'User'}</p>
                  <p className="text-xs text-white/40 truncate">{user?.email || 'user@example.com'}</p>
                </div>
              )}
              <button onClick={handleLogout} className="p-2 text-white/40 hover:text-[#FF6B00] hover:bg-[#FF6B00]/10 rounded-lg transition-all">
                <FiLogOut className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Toggle Button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="absolute -right-3 top-8 w-6 h-6 bg-[#0a0a0a] border border-white/10 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:border-[#00F5FF]/50 transition-all"
          >
            <FiChevronRight className={`w-3 h-3 transition-transform ${sidebarOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-2xl border-b border-white/5">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00F5FF] to-[#BF00FF] flex items-center justify-center">
              <FiZap className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-gradient">TallyDash</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-white/50 hover:text-white" onClick={() => navigate('/notifications')}>
              <FiBell className="w-5 h-5" />
            </button>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-white/50 hover:text-white">
              {mobileMenuOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="absolute top-16 left-0 right-0 bg-[#0a0a0a]/95 backdrop-blur-2xl border-b border-white/5 p-4 space-y-2 animate-fade-up">
            {navigation.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
            <button onClick={handleLogout} className="nav-item w-full text-left text-[#FF6B00]">
              <FiLogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className={`flex-1 min-h-screen transition-all duration-500 ${sidebarOpen ? 'lg:ml-72' : 'lg:ml-20'} pt-16 lg:pt-0`}>
        <div className="relative">
          {children}
        </div>
      </main>

      {/* Toast */}
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'rgba(10, 10, 10, 0.95)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            padding: '16px',
          },
          success: {
            iconTheme: { primary: '#00FF88', secondary: '#050505' }
          },
          error: {
            iconTheme: { primary: '#FF6B00', secondary: '#050505' }
          }
        }}
      />
    </div>
  );
};

export default ProfessionalLayout;
