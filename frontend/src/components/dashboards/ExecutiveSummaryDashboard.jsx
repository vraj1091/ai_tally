import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { FiTrendingUp, FiActivity, FiAlertCircle, FiRefreshCw, FiUsers, FiTarget } from 'react-icons/fi';
import RupeeIcon from '../common/RupeeIcon';
import { tallyApi } from '../../api/tallyApi';
import toast from 'react-hot-toast';
import { validateChartData, validateNumeric } from '../../utils/chartDataValidator';
import { fetchDashboardData } from '../../utils/dashboardHelper';

const COLORS = ['#8b5cf6', '#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

const ExecutiveSummaryDashboard = ({ dataSource = 'live' }) => {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [execData, setExecData] = useState(null);

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
        setExecData(null);
      }
      setLoading(false);
    } catch (error) {
      console.error(`Failed to load companies from ${dataSource}:`, error);
      setCompanies([]);
      setSelectedCompany('');
      setExecData(null);
      if (dataSource === 'live') {
        toast.error(`Failed to load companies from ${dataSource}`);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCompany && companies.length > 0) {
      loadExecData();
    } else if (!selectedCompany) {
      setExecData(null);
    }
  }, [selectedCompany, dataSource, companies.length]);

  const loadExecData = async () => {
    if (!selectedCompany) {
      setExecData(null);
      return;
    }
    
    setLoading(true);
    try {
      const currentSource = dataSource || 'live';
      const response = await fetchDashboardData('executive-summary', selectedCompany, currentSource);
      setExecData(response.data.data);
    } catch (error) {
      console.error('Error loading Executive Summary data:', error);
      if (error.response?.status === 401 && dataSource === 'live') {
        toast.error('Authentication required for live data. Please login or use backup data.');
      } else {
        toast.error('Failed to load Executive Summary data');
      }
      setExecData(null);
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
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading Executive Summary...</p>
        </div>
      </div>
    );
  }

  if (!execData) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <FiAlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Data Available</h3>
        <p className="text-gray-600">Please connect to Tally or select a company with data</p>
      </div>
    );
  }

  const keyHighlights = execData.key_highlights || {
    total_revenue: execData.total_revenue || execData.revenue || 0,
    net_profit: execData.net_profit || execData.profit || 0,
    total_assets: execData.total_assets || execData.assets || 0,
    profit_margin: execData.profit_margin || 0
  };
  const financialSnapshot = execData.financial_snapshot || {
    revenue: execData.total_revenue || execData.revenue || 0,
    expenses: execData.total_expenses || execData.expense || 0,
    profit: execData.net_profit || execData.profit || 0
  };
  const operationalMetrics = execData.operational_metrics || {};
  const strategicInsights = execData.strategic_insights || {};

  // Financial overview data with validation
  const financialData = validateChartData([
    { category: 'Revenue', value: validateNumeric(financialSnapshot.revenue, 0) },
    { category: 'Expenses', value: validateNumeric(financialSnapshot.expenses, 0) },
    { category: 'Profit', value: validateNumeric(financialSnapshot.profit, 0) }
  ], 'value', 'category');

  // Health score indicator
  const healthScore = keyHighlights.health_score || 0;
  const getHealthColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Executive Summary</h2>
          <p className="text-gray-600 mt-1">High-Level Overview with Strategic KPIs</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            {companies.map((company, idx) => (
              <option key={idx} value={company.name}>{company.name}</option>
            ))}
          </select>
          <button
            onClick={loadExecData}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center gap-2"
          >
            <FiRefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Key Highlights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Total Revenue</p>
            <RupeeIcon className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(keyHighlights.total_revenue)}</p>
          <p className="text-sm opacity-75">From operations</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Net Profit</p>
            <FiTrendingUp className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(keyHighlights.net_profit)}</p>
          <p className="text-sm opacity-75">After expenses</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Total Assets</p>
            <FiTarget className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(keyHighlights.total_assets)}</p>
          <p className="text-sm opacity-75">Book value</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Health Score</p>
            <FiActivity className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{healthScore.toFixed(0)}%</p>
          <p className="text-sm opacity-75">Business health</p>
        </div>
      </div>

      {/* Financial Overview Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
          <BarChart data={financialData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="category" />
            <YAxis tickFormatter={(val) => formatCurrency(val)} />
              <Tooltip formatter={(val) => formatCurrency(val)} />
              <Bar dataKey="value" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

      {/* Financial Snapshot & Operational Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Snapshot</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Revenue</span>
              <span className="text-sm font-bold text-green-700">{formatCurrency(financialSnapshot.revenue)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Expenses</span>
              <span className="text-sm font-bold text-red-700">{formatCurrency(financialSnapshot.expenses)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Profit</span>
              <span className="text-sm font-bold text-blue-700">{formatCurrency(financialSnapshot.profit)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Profit Margin</span>
              <span className="text-sm font-bold text-purple-700">{financialSnapshot.margin?.toFixed(1) || '0.0'}%</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Assets</span>
              <span className="text-sm font-bold text-gray-700">{formatCurrency(financialSnapshot.assets)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Liabilities</span>
              <span className="text-sm font-bold text-gray-700">{formatCurrency(financialSnapshot.liabilities)}</span>
        </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Equity</span>
              <span className="text-sm font-bold text-green-700">{formatCurrency(financialSnapshot.equity)}</span>
      </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Operational Metrics</h3>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <FiUsers className="w-5 h-5 text-blue-600" />
                <p className="text-sm font-semibold text-gray-700">Customer Count</p>
              </div>
              <p className="text-3xl font-bold text-blue-700">{operationalMetrics.customer_count || 0}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <FiActivity className="w-5 h-5 text-green-600" />
                <p className="text-sm font-semibold text-gray-700">Transaction Volume</p>
              </div>
              <p className="text-3xl font-bold text-green-700">{operationalMetrics.transaction_volume || 0}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <FiTarget className="w-5 h-5 text-purple-600" />
                <p className="text-sm font-semibold text-gray-700">Active Ledgers</p>
          </div>
              <p className="text-3xl font-bold text-purple-700">{operationalMetrics.active_ledgers || 0}</p>
          </div>
          </div>
        </div>
      </div>

      {/* Strategic Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Growth Rate</h4>
          <p className="text-3xl font-bold text-gray-900">{strategicInsights.growth_rate?.toFixed(1) || '0.0'}%</p>
          <p className="text-sm text-gray-600 mt-1">Revenue growth</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Profitability Trend</h4>
          <p className="text-3xl font-bold text-gray-900">{strategicInsights.profitability_trend || 'N/A'}</p>
          <p className="text-sm text-gray-600 mt-1">Profit direction</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Market Position</h4>
          <p className="text-3xl font-bold text-gray-900">{strategicInsights.market_position || 'N/A'}</p>
          <p className="text-sm text-gray-600 mt-1">Competitive standing</p>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveSummaryDashboard;

