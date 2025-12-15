import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { FiActivity, FiTrendingUp, FiAlertCircle, FiRefreshCw, FiClock, FiUsers } from 'react-icons/fi';
import RupeeIcon from '../common/RupeeIcon';
import { tallyApi } from '../../api/tallyApi';
import toast from 'react-hot-toast';
import { fetchDashboardData } from '../../utils/dashboardHelper';

const RealtimeOperationsDashboard = ({ dataSource = 'live' }) => {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [realtimeData, setRealtimeData] = useState(null);

  useEffect(() => {
    loadCompanies();
  }, [dataSource]);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      let response;
      if (dataSource === 'backup') {
        response = await tallyApi.getBackupCompanies();
      } else if (dataSource === 'bridge') {
        response = await tallyApi.getCompaniesViaBridge();
      } else {
        response = await tallyApi.getCompanies();
      }
      const companyList = response.companies || [];
      setCompanies(companyList);
      if (companyList.length > 0) {
        setSelectedCompany(companyList[0].name);
      } else {
        setSelectedCompany('');
        setRealtimeData(null);
      }
      setLoading(false);
    } catch (error) {
      console.error(`Failed to load companies from ${dataSource}:`, error);
      setCompanies([]);
      setSelectedCompany('');
      setRealtimeData(null);
      if (dataSource === 'live') {
        toast.error(`Failed to load companies from ${dataSource}`);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCompany && companies.length > 0) {
      loadRealtimeData();
      const interval = setInterval(() => {
        if (selectedCompany && companies.length > 0) {
          loadRealtimeData();
        }
      }, 30000);
      return () => clearInterval(interval);
    } else if (!selectedCompany) {
      setRealtimeData(null);
    }
  }, [selectedCompany, dataSource, companies.length]);

  const loadRealtimeData = async () => {
    if (!selectedCompany) {
      setRealtimeData(null);
      return;
    }
    
    setLoading(true);
    try {
      const currentSource = dataSource || 'live';
      const response = await fetchDashboardData('realtime-operations', selectedCompany, currentSource);
      setRealtimeData(response.data.data);
    } catch (error) {
      console.error('Error loading Real-time Operations data:', error);
      if (error.response?.status === 401 && dataSource === 'live') {
        toast.error('Authentication required for live data. Please login or use backup data.');
      } else {
        toast.error('Failed to load Real-time Operations data');
      }
      setRealtimeData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    if (!value && value !== 0) return '₹0';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '₹0';
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(2)}L`;
    if (num >= 1000) return `₹${(num / 1000).toFixed(2)}K`;
    return `₹${num.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-4 animate-spin mx-auto" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--primary)' }} />
          <p className="mt-4 font-medium" style={{ color: 'var(--text-secondary)' }}>Loading Real-time Operations...</p>
        </div>
      </div>
    );
  }

  if (!realtimeData) {
    return (
      <div className="card p-12 text-center">
        <FiAlertCircle className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
        <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>No Data Available</h3>
        <p style={{ color: 'var(--text-secondary)' }}>Please connect to Tally or select a company with data</p>
      </div>
    );
  }

  const liveMetrics = realtimeData.live_metrics || {
    transactions_today: realtimeData.daily_transactions || realtimeData.today_summary?.transactions || 0,
    revenue_today: realtimeData.daily_revenue || realtimeData.today_summary?.revenue || 0,
    expenses_today: realtimeData.daily_expense || realtimeData.today_summary?.expenses || 0,
    profit_today: realtimeData.daily_profit || realtimeData.today_summary?.profit || 0
  };
  const operationalKPIs = realtimeData.operational_kpis || realtimeData.current_status || {};
  const activitySummary = realtimeData.activity_summary || realtimeData.today_summary || {};

  const activityData = [
    { time: '9 AM', transactions: liveMetrics.transactions_today * 0.2 },
    { time: '12 PM', transactions: liveMetrics.transactions_today * 0.4 },
    { time: '3 PM', transactions: liveMetrics.transactions_today * 0.7 },
    { time: '6 PM', transactions: liveMetrics.transactions_today }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Real-time Operations</h2>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Live Activity Monitoring & Operational Metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="input-neon"
          >
            {companies.map((company, idx) => (
              <option key={idx} value={company.name}>{company.name}</option>
            ))}
          </select>
          <button
            onClick={loadRealtimeData}
            className="btn-primary flex items-center gap-2"
          >
            <FiRefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Live Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6 text-white" style={{ background: 'linear-gradient(135deg, #06B6D4 0%, #0EA5E9 100%)', boxShadow: '0 8px 32px rgba(6, 182, 212, 0.3)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">
              {realtimeData.is_estimated ? 'Avg Daily Transactions' : 'Transactions Today'}
            </p>
            <FiActivity className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{liveMetrics.transactions_today || 0}</p>
          <p className="text-sm opacity-75">
            {realtimeData.is_estimated 
              ? (realtimeData.data_source === 'backup' ? 'From backup data' : 'No transactions yet') 
              : "Today's activity"}
          </p>
        </div>

        <div className="card p-6 text-white" style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', boxShadow: '0 8px 32px rgba(16, 185, 129, 0.3)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">
              {realtimeData.is_estimated ? 'Avg Daily Revenue' : 'Revenue Today'}
            </p>
            <RupeeIcon className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(liveMetrics.revenue_today)}</p>
          <p className="text-sm opacity-75">
            {realtimeData.is_estimated 
              ? (realtimeData.data_source === 'backup' ? 'From backup data' : 'Estimated') 
              : "Today's revenue"}
          </p>
        </div>

        <div className="card p-6 text-white" style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', boxShadow: '0 8px 32px rgba(245, 158, 11, 0.3)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Pending Invoices</p>
            <FiClock className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{liveMetrics.pending_invoices || 0}</p>
          <p className="text-sm opacity-75">Awaiting payment</p>
        </div>

        <div className="card p-6 text-white" style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', boxShadow: '0 8px 32px rgba(239, 68, 68, 0.3)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Pending Payments</p>
            <RupeeIcon className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{liveMetrics.pending_payments || 0}</p>
          <p className="text-sm opacity-75">Bills to pay</p>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Activity Timeline (Today)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={activityData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
            <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
            <Tooltip 
              contentStyle={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
              labelStyle={{ color: 'var(--text-primary)' }}
              itemStyle={{ color: 'var(--text-secondary)' }}
            />
            <Area type="monotone" dataKey="transactions" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.6} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Operational KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Operational KPIs</h3>
          <div className="space-y-4">
            <div className="p-5 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.1) 100%)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Cash Position</p>
                <p className="text-2xl font-bold" style={{ color: '#3B82F6' }}>{formatCurrency(operationalKPIs.cash_position)}</p>
              </div>
            </div>
            <div className="p-5 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.1) 100%)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Accounts Receivable</p>
                <p className="text-2xl font-bold" style={{ color: '#10B981' }}>{formatCurrency(operationalKPIs.accounts_receivable)}</p>
              </div>
            </div>
            <div className="p-5 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.1) 100%)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Accounts Payable</p>
                <p className="text-2xl font-bold" style={{ color: '#EF4444' }}>{formatCurrency(operationalKPIs.accounts_payable)}</p>
              </div>
            </div>
            <div className="p-5 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(99, 102, 241, 0.1) 100%)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Inventory Value</p>
                <p className="text-2xl font-bold" style={{ color: '#8B5CF6' }}>{formatCurrency(operationalKPIs.inventory_value)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Activity Summary</h3>
          <div className="space-y-4">
            <div className="p-5 rounded-xl" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--primary)' }}>
                  <FiActivity className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Recent Transactions</p>
                  <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{activitySummary.recent_transactions || 0}</p>
                </div>
              </div>
            </div>
            <div className="p-5 rounded-xl" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--primary)' }}>
                  <FiUsers className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Active Customers</p>
                  <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{activitySummary.active_customers || 0}</p>
                </div>
              </div>
            </div>
            <div className="p-5 rounded-xl" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--primary)' }}>
                  <RupeeIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Active Vendors</p>
                  <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{activitySummary.active_vendors || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealtimeOperationsDashboard;
