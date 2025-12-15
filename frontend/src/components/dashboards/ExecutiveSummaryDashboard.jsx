import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { FiTrendingUp, FiActivity, FiAlertCircle, FiRefreshCw, FiTarget, FiDollarSign } from 'react-icons/fi';
import RupeeIcon from '../common/RupeeIcon';
import { tallyApi } from '../../api/tallyApi';
import toast from 'react-hot-toast';
import { validateChartData, validateNumeric } from '../../utils/chartDataValidator';
import { fetchDashboardData } from '../../utils/dashboardHelper';
import CustomTooltip from '../common/CustomTooltip';
import { hasRealData } from '../../utils/dataValidator';

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
      console.log('Executive Summary response:', response);
      setExecData(response.data.data);
      
      // Show a message if data is empty
      if (response.data.data && Object.keys(response.data.data).length === 0) {
        toast('No data available for this company yet', { icon: '📊' });
      }
    } catch (error) {
      console.error('Error loading Executive Summary data:', error);
      if (error.response?.status === 401 && dataSource === 'live') {
        toast.error('Authentication required for live data. Please login or use backup data.');
      } else {
        toast.error('Failed to load Executive Summary data. Backend API may not be configured.');
      }
      setExecData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    if (!value && value !== 0) return '₹0.00';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '₹0.00';
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(2)}L`;
    if (num >= 1000) return `₹${(num / 1000).toFixed(2)}K`;
    return `₹${num.toFixed(2)}`;
  };

  const formatPercent = (value) => `${(value || 0).toFixed(1)}%`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-4 animate-spin mx-auto" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--primary)' }} />
          <p className="mt-4 font-medium" style={{ color: 'var(--text-secondary)' }}>Loading Executive Summary...</p>
        </div>
      </div>
    );
  }

  // Check if we have real data
  if (!execData || !hasRealData(execData, ['total_revenue', 'revenue', 'net_profit', 'profit', 'total_assets'])) {
    return (
      <div className="card p-12 text-center">
        <FiAlertCircle className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
        <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>No Data Available</h3>
        <p style={{ color: 'var(--text-muted)' }}>
          {dataSource === 'backup' 
            ? 'Please upload a backup file to see data' 
            : 'Please connect to Tally or select a company with data'}
        </p>
        <button onClick={loadExecData} className="btn-primary mt-4 px-6 py-2 flex items-center gap-2 mx-auto">
          <FiRefreshCw className="w-4 h-4" />
          Retry
        </button>
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

  return (
    <div className="space-y-6 p-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Executive Summary</h2>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>High-Level Overview with Strategic KPIs</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="input-neon"
            style={{ minWidth: '200px' }}
          >
            {companies.map((company, idx) => (
              <option key={idx} value={company.name}>{company.name}</option>
            ))}
          </select>
          <button
            onClick={loadExecData}
            className="btn-primary flex items-center gap-2 px-4 py-2"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Key Highlights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6 text-white" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Total Revenue</p>
            <RupeeIcon className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(keyHighlights.total_revenue)}</p>
          <p className="text-sm opacity-75">From operations</p>
        </div>

        <div className="card p-6 text-white" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', border: 'none' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Net Profit</p>
            <FiTrendingUp className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(keyHighlights.net_profit)}</p>
          <p className="text-sm opacity-75">After expenses</p>
        </div>

        <div className="card p-6 text-white" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', border: 'none' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Total Assets</p>
            <FiTarget className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(keyHighlights.total_assets)}</p>
          <p className="text-sm opacity-75">Book value</p>
        </div>

        <div className="card p-6 text-white" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', border: 'none' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Health Score</p>
            <FiActivity className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{healthScore.toFixed(0)}%</p>
          <p className="text-sm opacity-75">Business health</p>
        </div>
      </div>

      {/* Financial Overview Chart */}
      <div className="card p-6">
        <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Financial Overview</h3>
        {financialData && financialData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={financialData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="category" tick={{ fill: 'var(--text-secondary)' }} />
              <YAxis tickFormatter={(val) => formatCurrency(val)} tick={{ fill: 'var(--text-secondary)' }} />
              <Tooltip content={<CustomTooltip formatCurrency={formatCurrency} formatPercent={formatPercent} />} />
              <Legend wrapperStyle={{ color: 'var(--text-secondary)' }} />
              <Bar dataKey="value" fill="#8b5cf6" radius={[8, 8, 0, 0]}>
                {financialData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center">
            <p style={{ color: 'var(--text-muted)' }}>No financial data available</p>
          </div>
        )}
      </div>

      {/* Additional Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card p-6">
          <h4 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Profit Margin</h4>
          <div className="text-4xl font-bold mb-2" style={{ color: '#10b981' }}>
            {formatPercent(keyHighlights.profit_margin || 0)}
          </div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Net margin</p>
        </div>

        <div className="card p-6">
          <h4 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Growth Rate</h4>
          <div className="text-4xl font-bold mb-2" style={{ color: '#3b82f6' }}>
            {formatPercent(operationalMetrics.growth_rate || 0)}
          </div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>YoY growth</p>
        </div>

        <div className="card p-6">
          <h4 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Efficiency Score</h4>
          <div className="text-4xl font-bold mb-2" style={{ color: '#f59e0b' }}>
            {formatPercent(operationalMetrics.efficiency_score || 0)}
          </div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Operational efficiency</p>
        </div>
      </div>

      {/* Data Source Info */}
      <div className="card p-4" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)' }}>
        <div className="flex items-center gap-3">
          <FiAlertCircle className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Data Source: <span className="font-bold">{dataSource.toUpperCase()}</span>
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {dataSource === 'backup' && 'Showing data from uploaded backup file'}
              {dataSource === 'live' && 'Connected to live Tally instance'}
              {dataSource === 'bridge' && 'Connected via TallyDash Bridge'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveSummaryDashboard;
