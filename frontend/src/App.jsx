import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';

// Layout
import ProfessionalLayout from './layouts/ProfessionalLayout';

// Auth Pages (No Layout)
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// App Pages (With Professional Layout)
import Dashboard from './pages/Dashboard';
import ChatPage from './pages/ChatPage';
import DocumentsPage from './pages/DocumentsPage';
import SettingsPage from './pages/SettingsPage';
import NotificationsPage from './pages/NotificationsPage';

// NEW Real Dashboards
import RealCEODashboard from './pages/dashboards/RealCEODashboard';
import RealSalesDashboard from './pages/dashboards/RealSalesDashboard';
import DashboardHub from './pages/DashboardHub';

// Enhanced Components
import EnhancedTallyExplorer from './components/tally/EnhancedTallyExplorer';
import MultiBillComparison from './components/documents/MultiBillComparison';
import DocumentAnalysisDashboard from './components/documents/DocumentAnalysisDashboard';

// Analytics with real data
import AnalyticsPage from './pages/AnalyticsPage';

import './App.css';

// Protected Route Component - Requires authentication
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  
  // Also check localStorage directly as a fallback (handles race conditions)
  const hasLocalToken = localStorage.getItem('token');
  const hasLocalUser = localStorage.getItem('user');
  const hasStoredAuth = hasLocalToken && hasLocalUser;

  // Show loading if auth is still initializing AND we might have stored credentials
  if (isLoading && hasStoredAuth) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show loading during initial auth check
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // SECURITY: Redirect to login if not authenticated
  if (!isAuthenticated && !hasStoredAuth) {
    return <Navigate to="/login" replace />;
  }

  return <ProfessionalLayout>{children}</ProfessionalLayout>;
};

function App() {
  const initAuth = useAuthStore((state) => state.initAuth);

  useEffect(() => {
    // Initialize auth only once on app mount
    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected Routes with Professional Layout */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />

        <Route path="/dashboards" element={
          <ProtectedRoute>
            <DashboardHub />
          </ProtectedRoute>
        } />

        <Route path="/dashboards/ceo" element={
          <ProtectedRoute>
            <RealCEODashboard />
          </ProtectedRoute>
        } />

        <Route path="/dashboards/sales" element={
          <ProtectedRoute>
            <RealSalesDashboard />
          </ProtectedRoute>
        } />

        <Route path="/analytics" element={
          <ProtectedRoute>
            <AnalyticsPage />
          </ProtectedRoute>
        } />

        <Route path="/tally" element={
          <ProtectedRoute>
            <EnhancedTallyExplorer />
          </ProtectedRoute>
        } />

        <Route path="/documents" element={
          <ProtectedRoute>
            <DocumentsPage />
          </ProtectedRoute>
        } />

        <Route path="/documents/analysis" element={
          <ProtectedRoute>
            <DocumentAnalysisDashboard />
          </ProtectedRoute>
        } />

        <Route path="/bill-comparison" element={
          <ProtectedRoute>
            <MultiBillComparison />
          </ProtectedRoute>
        } />

        <Route path="/chat" element={
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        } />

        <Route path="/settings" element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        } />
        
        <Route path="/notifications" element={
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;

