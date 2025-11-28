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

// NEW Real Dashboards
import RealCEODashboard from './pages/dashboards/RealCEODashboard';
import RealSalesDashboard from './pages/dashboards/RealSalesDashboard';

// Enhanced Components
import EnhancedTallyExplorer from './components/tally/EnhancedTallyExplorer';
import MultiBillComparison from './components/documents/MultiBillComparison';
import DocumentAnalysisDashboard from './components/documents/DocumentAnalysisDashboard';

// Analytics with real data
import AnalyticsPage from './pages/AnalyticsPage';

import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <ProfessionalLayout>{children}</ProfessionalLayout>;
};

function App() {
  const { initAuth } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

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
            <RealCEODashboard />
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
      </Routes>
    </Router>
  );
}

export default App;

