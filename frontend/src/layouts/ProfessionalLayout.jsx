import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  FiHome, FiGrid, FiBarChart2, FiFileText, FiDatabase, 
  FiMessageCircle, FiUser, FiLogOut, FiMenu, FiX,
  FiActivity, FiBell
} from 'react-icons/fi';
import { Toaster } from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { TallyStatusIndicator } from '../components/common/StatusIndicators';
import { tallyApi } from '../api/tallyApi';

const ProfessionalLayout = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tallyStatus, setTallyStatus] = useState({ connected: false, lastSync: null });
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Check Tally connection status - supports both Bridge and Direct modes
  useEffect(() => {
    const checkTallyStatus = async () => {
      try {
        // Check if Bridge mode is configured
        const connectionType = localStorage.getItem('tally_connection_type');
        const bridgeToken = localStorage.getItem('tally_bridge_token') || 'user_tally_bridge';
        
        if (connectionType === 'BRIDGE') {
          // Bridge mode - check bridge status
          const bridgeStatus = await tallyApi.getBridgeStatus(bridgeToken);
          if (bridgeStatus && bridgeStatus.connected) {
            setTallyStatus({
              connected: bridgeStatus.tally_connected || false,
              lastSync: new Date().toLocaleTimeString(),
              viaBridge: true
            });
            return;
          }
        }
        
        // Direct mode or Bridge not connected - check direct Tally status
        const status = await tallyApi.getStatus();
        if (status && status.connected !== undefined) {
          setTallyStatus({
            connected: status.connected || status.is_connected || false,
            lastSync: status.last_sync ? new Date(status.last_sync).toLocaleTimeString() : null,
            viaBridge: false
          });
        }
      } catch (error) {
        // Silently handle errors - don't spam console
        if (error.response?.status !== 404) {
          console.debug('Tally status check failed (non-critical):', error.message);
        }
        setTallyStatus({ connected: false, lastSync: null, viaBridge: false });
      }
    };

    // Initial check with delay to avoid blocking page load
    const timeoutId = setTimeout(checkTallyStatus, 1000);
    
    // Then check every 30 seconds
    const interval = setInterval(checkTallyStatus, 30000);
    
    return () => {
      clearTimeout(timeoutId);
      clearInterval(interval);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Home', path: '/dashboard', icon: FiHome },
    { name: 'Dashboards', path: '/dashboards', icon: FiGrid },
    { name: 'Analytics', path: '/analytics', icon: FiBarChart2 },
    { name: 'Tally Data', path: '/tally', icon: FiDatabase },
    { name: 'Documents', path: '/documents', icon: FiFileText },
    { name: 'AI Assistant', path: '/chat', icon: FiMessageCircle },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Left: Logo & Brand */}
            <div className="flex items-center">
              <div className="flex items-center gap-3">
                <img src="/logo.svg" alt="TallyDash Pro" className="w-10 h-10" />
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">TallyDash Pro</h1>
                  <p className="text-xs text-gray-500">AI-Powered Analytics</p>
                </div>
              </div>
            </div>

            {/* Center: Navigation Links (Desktop) */}
            <div className="hidden md:flex items-center space-x-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                );
              })}
            </div>

            {/* Right: Status & User Menu */}
            <div className="flex items-center gap-4">
              {/* Tally Status - Desktop */}
              <div className="hidden lg:block">
                <TallyStatusIndicator 
                  connected={tallyStatus.connected} 
                  lastSync={tallyStatus.lastSync || 'Never'} 
                />
              </div>

              {/* Notifications */}
              <button 
                className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                onClick={() => navigate('/notifications')}
                title="Notifications"
              >
                <FiBell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* User Menu */}
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-gray-900">{user?.name || 'User'}</p>
                  <p className="text-xs text-gray-500">{user?.email || 'user@example.com'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold shadow-lg">
                    {(user?.name || 'U')[0].toUpperCase()}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                    title="Logout"
                  >
                    <FiLogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                {mobileMenuOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-3 space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Toast Notifications */}
      <Toaster position="top-right" />
    </div>
  );
};

export default ProfessionalLayout;

