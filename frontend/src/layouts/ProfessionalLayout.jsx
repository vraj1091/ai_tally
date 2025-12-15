import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  FiHome, FiGrid, FiBarChart2, FiFileText, FiDatabase, 
  FiMessageCircle, FiLogOut, FiMenu, FiX, FiChevronRight,
  FiBell, FiSettings, FiZap, FiCpu, FiWifi, FiWifiOff,
  FiSun, FiMoon, FiSearch
} from 'react-icons/fi';
import { Toaster } from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { tallyApi } from '../api/tallyApi';

const ProfessionalLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tallyStatus, setTallyStatus] = useState({ connected: false });
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

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

  const handleLogout = () => { logout(); navigate('/login'); };
  const toggleTheme = () => setDarkMode(!darkMode);

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
    <div className="min-h-screen flex" style={{ background: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <aside className={`hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-50 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'}`}
             style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)' }}>
        
        {/* Logo */}
        <div className="h-16 flex items-center px-6 gap-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--gradient-primary)' }}>
            <FiZap className="w-5 h-5 text-white" />
          </div>
          {sidebarOpen && (
            <div>
              <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>TallyDash</h1>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Analytics Pro</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link key={item.name} to={item.path} className={`nav-item ${isActive ? 'active' : ''}`} title={item.name}>
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Connection Status */}
        {sidebarOpen && (
          <div className="px-4 py-4" style={{ borderTop: '1px solid var(--border-color)' }}>
            <div className="card p-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" 
                     style={{ background: tallyStatus.connected ? 'rgba(40, 199, 111, 0.15)' : 'rgba(234, 84, 85, 0.15)' }}>
                  {tallyStatus.connected ? <FiWifi className="w-4 h-4" style={{ color: 'var(--green)' }} /> : <FiWifiOff className="w-4 h-4" style={{ color: 'var(--red)' }} />}
                </div>
                <div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{tallyStatus.connected ? 'Connected' : 'Disconnected'}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{tallyStatus.viaBridge ? 'Bridge Mode' : 'Direct'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User */}
        <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center font-semibold text-white flex-shrink-0" style={{ background: 'var(--gradient-dark)' }}>
              {(user?.username || user?.name || 'U')[0].toUpperCase()}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{user?.username || 'User'}</p>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user?.email || 'user@example.com'}</p>
              </div>
            )}
            <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" style={{ color: 'var(--red)' }}>
              <FiLogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Toggle */}
        <button onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-all"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
          <FiChevronRight className={`w-3 h-3 transition-transform ${sidebarOpen ? 'rotate-180' : ''}`} />
        </button>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-4"
              style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
            <FiZap className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>TallyDash</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="theme-toggle">
            {darkMode ? <FiSun className="w-4 h-4" /> : <FiMoon className="w-4 h-4" />}
          </button>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 rounded-lg" style={{ color: 'var(--text-secondary)' }}>
            {mobileMenuOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="absolute top-16 left-0 right-0 p-4 space-y-1 shadow-lg animate-fade-up"
               style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
            {navigation.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link key={item.name} to={item.path} onClick={() => setMobileMenuOpen(false)} className={`nav-item ${isActive ? 'active' : ''}`}>
                  <Icon className="w-5 h-5" /><span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* Top Bar */}
      <div className={`hidden lg:flex fixed top-0 right-0 z-40 h-16 items-center gap-4 px-6 transition-all duration-300 ${sidebarOpen ? 'left-64' : 'left-20'}`}
           style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
        
        {/* Search */}
        <div className="flex-1 max-w-md relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Search..." className="input-neon pl-10 py-2 text-sm" />
        </div>
        
        <div className="flex-1" />
        
        <button onClick={toggleTheme} className="theme-toggle" title={darkMode ? 'Light Mode' : 'Dark Mode'}>
          {darkMode ? <FiSun className="w-4 h-4" /> : <FiMoon className="w-4 h-4" />}
        </button>
        
        <button className="theme-toggle relative" onClick={() => navigate('/notifications')}>
          <FiBell className="w-4 h-4" />
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-xs flex items-center justify-center text-white" style={{ background: 'var(--red)' }}>3</span>
        </button>
        
        <div className="flex items-center gap-3 pl-4" style={{ borderLeft: '1px solid var(--border-color)' }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center font-semibold text-white" style={{ background: 'var(--gradient-primary)' }}>
            {(user?.username || 'U')[0].toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{user?.username || 'User'}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Admin</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className={`flex-1 min-h-screen transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} pt-16`}>
        {children}
      </main>

      <Toaster position="top-right" toastOptions={{
        style: { background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '8px' },
        success: { iconTheme: { primary: '#28C76F', secondary: 'white' } },
        error: { iconTheme: { primary: '#EA5455', secondary: 'white' } }
      }} />
    </div>
  );
};

export default ProfessionalLayout;
