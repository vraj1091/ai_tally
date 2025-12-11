import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { FiActivity, FiTrendingUp, FiAlertCircle, FiRefreshCw, FiClock, FiUsers } from 'react-icons/fi';
import RupeeIcon from '../common/RupeeIcon';
import { tallyApi } from '../../api/tallyApi';
import toast from 'react-hot-toast';
import { validateChartData, validateNumeric, validateArrayData } from '../../utils/chartDataValidator';
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
      // Auto-refresh every 30 seconds
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
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading Real-time Operations...</p>
        </div>
      </div>
    );
  }

  if (!realtimeData) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <FiAlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Data Available</h3>
        <p className="text-gray-600">Please connect to Tally or select a company with data</p>
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

  // Activity timeline data
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
          <h2 className="text-2xl font-bold text-gray-900">Real-time Operations</h2>
          <p className="text-gray-600 mt-1">Live Activity Monitoring & Operational Metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          >
            {companies.map((company, idx) => (
              <option key={idx} value={company.name}>{company.name}</option>
            ))}
          </select>
          <button
            onClick={loadRealtimeData}
            className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 flex items-center gap-2"
          >
            <FiRefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Live Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">
              {realtimeData.is_estimated ? 'Avg Daily Transactions' : 'Transactions Today'}
            </p>
            <FiActivity className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{liveMetrics.transactions_today || 0}</p>
          <p className="text-sm opacity-75">
            {realtimeData.is_estimated 
              ? (realtimeData.data_source === 'backup' 
                  ? 'Average daily transactions (from backup data)' 
                  : 'No transactions yet today')
              : "Today's activity"}
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">
              {realtimeData.is_estimated ? 'Avg Daily Revenue' : 'Revenue Today'}
            </p>
            <RupeeIcon className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(liveMetrics.revenue_today)}</p>
          <p className="text-sm opacity-75">
            {realtimeData.is_estimated 
              ? (realtimeData.data_source === 'backup' 
                  ? 'Average daily revenue (from backup data)' 
                  : 'Estimated (no transactions yet today)')
              : "Today's revenue"}
          </p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Pending Invoices</p>
            <FiClock className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{liveMetrics.pending_invoices || 0}</p>
          <p className="text-sm opacity-75">Awaiting payment</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Pending Payments</p>
            <RupeeIcon className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{liveMetrics.pending_payments || 0}</p>
          <p className="text-sm opacity-75">Bills to pay</p>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Timeline (Today)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={activityData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="transactions" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.6} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Operational KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Operational KPIs</h3>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">Cash Position</p>
                <p className="text-2xl font-bold text-blue-700">{formatCurrency(operationalKPIs.cash_position)}</p>
              </div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">Accounts Receivable</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(operationalKPIs.accounts_receivable)}</p>
              </div>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">Accounts Payable</p>
                <p className="text-2xl font-bold text-red-700">{formatCurrency(operationalKPIs.accounts_payable)}</p>
              </div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">Inventory Value</p>
                <p className="text-2xl font-bold text-purple-700">{formatCurrency(operationalKPIs.inventory_value)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Summary</h3>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <FiActivity className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-sm font-semibold text-gray-700">Recent Transactions</p>
                  <p className="text-2xl font-bold text-gray-900">{activitySummary.recent_transactions || 0}</p>
                </div>
        </div>
      </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <FiUsers className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-sm font-semibold text-gray-700">Active Customers</p>
                  <p className="text-2xl font-bold text-gray-900">{activitySummary.active_customers || 0}</p>
          </div>
          </div>
          </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <RupeeIcon className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-sm font-semibold text-gray-700">Active Vendors</p>
                  <p className="text-2xl font-bold text-gray-900">{activitySummary.active_vendors || 0}</p>
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

