import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { FiTrendingUp, FiTrendingDown, FiActivity, FiAlertCircle, FiRefreshCw, FiUsers, FiChevronRight } from 'react-icons/fi';
import RupeeIcon from '../common/RupeeIcon';
import EmptyDataState from '../common/EmptyDataState';
import DrillDownPanel from '../common/DrillDownPanel';
import AIInsightsPanel from '../common/AIInsightsPanel';
import { tallyApi } from '../../api/tallyApi';
import toast from 'react-hot-toast';
import { prepareRevenueExpenseData } from '../../utils/chartDataValidator';
import { fetchDashboardData } from '../../utils/dashboardHelper';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const CEODashboardEnhanced = ({ dataSource = 'live' }) => {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [ceoData, setCeoData] = useState(null);
  
  // Drill-down state
  const [drillDown, setDrillDown] = useState({
    isOpen: false,
    title: '',
    dataType: '',
    filterValue: ''
  });
  
  // AI Insights toggle - show by default but don't auto-generate
  const [showAIPanel, setShowAIPanel] = useState(true);

  useEffect(() => {
    loadCompanies();
  }, [dataSource]);

  useEffect(() => {
    if (selectedCompany) {
      loadCEOData();
    }
  }, [selectedCompany, dataSource]);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      let response;
      if (dataSource === 'backup') {
        response = await tallyApi.getBackupCompanies();
      } else {
        response = await tallyApi.getCompanies();
      }
      
      let companyList = [];
      if (response && response.companies) {
        companyList = Array.isArray(response.companies) ? response.companies : [];
      } else if (Array.isArray(response)) {
        companyList = response;
      }
      
      const normalizedCompanies = companyList.map(company => {
        if (typeof company === 'string') return { name: company };
        return company && company.name ? company : { name: String(company) };
      });
      
      setCompanies(normalizedCompanies);
      
      if (normalizedCompanies.length > 0) {
        setSelectedCompany(normalizedCompanies[0].name);
      }
      setLoading(false);
    } catch (error) {
      console.error('Failed to load companies:', error);
      setCompanies([]);
      setLoading(false);
    }
  };

  const loadCEOData = async () => {
    if (!selectedCompany) return;
    
    setLoading(true);
    try {
      const response = await fetchDashboardData('ceo', selectedCompany, dataSource, { timeout: 180000 });
      
      if (response.data && response.data.data) {
        setCeoData(response.data.data);
      }
    } catch (error) {
      console.error('Error loading CEO data:', error);
      toast.error('Failed to load dashboard data');
      setCeoData(null);
    } finally {
      setLoading(false);
    }
  };

  // Handle drill-down clicks
  const handleDrillDown = (type, filter, title) => {
    setDrillDown({
      isOpen: true,
      title: title || `${type} Details`,
      dataType: type,
      filterValue: filter
    });
  };

  const closeDrillDown = () => {
    setDrillDown(prev => ({ ...prev, isOpen: false }));
  };

  const formatCurrency = (value) => {
    const absValue = Math.abs(value || 0);
    if (absValue >= 10000000) return `₹${(absValue / 10000000).toFixed(2)}Cr`;
    if (absValue >= 100000) return `₹${(absValue / 100000).toFixed(2)}L`;
    if (absValue >= 1000) return `₹${(absValue / 1000).toFixed(2)}K`;
    return `₹${absValue.toFixed(0)}`;
  };

  // Custom tooltip with click hint
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900">{label || payload[0].name}</p>
          <p className="text-lg font-bold text-blue-600">
            {formatCurrency(payload[0].value)}
          </p>
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            <FiChevronRight className="w-3 h-3" />
            Click for details
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading CEO Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!ceoData) {
    return (
      <EmptyDataState
        title="No CEO Dashboard Data Available"
        message="Please connect to Tally or upload a backup file with company data"
        onRefresh={loadCEOData}
        dataSource={dataSource}
      />
    );
  }

  const execSummary = ceoData.executive_summary || {};
  const keyMetrics = ceoData.key_metrics || {};
  const performance = ceoData.performance_indicators || {};
  const topRevenue = prepareRevenueExpenseData(ceoData.top_5_revenue_sources || []);
  const topExpenses = prepareRevenueExpenseData(ceoData.top_5_expense_categories || []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">CEO Dashboard</h2>
          <p className="text-gray-600 mt-1">Executive Overview & Strategic Insights</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {companies.map((company, idx) => (
              <option key={idx} value={company.name}>{company.name}</option>
            ))}
          </select>
          <button
            onClick={loadCEOData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <FiRefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Executive KPI Cards - CLICKABLE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Revenue Card */}
        <div 
          onClick={() => handleDrillDown('revenue', 'all', 'Revenue Breakdown')}
          className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 text-white cursor-pointer transform hover:scale-105 transition-all hover:shadow-xl"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Total Revenue</p>
            <div className="flex items-center gap-2">
              <RupeeIcon className="w-6 h-6 opacity-75" />
              <FiChevronRight className="w-4 h-4 opacity-50" />
            </div>
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(execSummary.total_revenue)}</p>
          <div className="flex items-center gap-2 text-sm">
            <FiTrendingUp className="w-4 h-4" />
            <span>Growth: {execSummary.growth_rate?.toFixed(1)}%</span>
          </div>
          <p className="text-xs opacity-60 mt-2">Click for breakdown →</p>
        </div>

        {/* Profit Card */}
        <div 
          onClick={() => handleDrillDown('profit', 'all', 'Profit Analysis')}
          className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl shadow-lg p-6 text-white cursor-pointer transform hover:scale-105 transition-all hover:shadow-xl"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Net Profit</p>
            <div className="flex items-center gap-2">
              <RupeeIcon className="w-6 h-6 opacity-75" />
              <FiChevronRight className="w-4 h-4 opacity-50" />
            </div>
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(execSummary.net_profit)}</p>
          <div className="flex items-center gap-2 text-sm">
            <span>Margin: {execSummary.profit_margin_percent?.toFixed(1)}%</span>
          </div>
          <p className="text-xs opacity-60 mt-2">Click for breakdown →</p>
        </div>

        {/* Growth Card */}
        <div 
          onClick={() => handleDrillDown('growth', 'trend', 'Growth Trend Analysis')}
          className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl shadow-lg p-6 text-white cursor-pointer transform hover:scale-105 transition-all hover:shadow-xl"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Growth Rate</p>
            <div className="flex items-center gap-2">
              <FiTrendingUp className="w-6 h-6 opacity-75" />
              <FiChevronRight className="w-4 h-4 opacity-50" />
            </div>
          </div>
          <p className="text-4xl font-bold mb-2">{execSummary.growth_rate?.toFixed(1)}%</p>
          <div className="flex items-center gap-2 text-sm">
            <span>Market: {execSummary.market_position || 'Strong'}</span>
          </div>
          <p className="text-xs opacity-60 mt-2">Click for trend →</p>
        </div>

        {/* Customers Card */}
        <div 
          onClick={() => handleDrillDown('customer', 'all', 'Customer Analysis')}
          className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl shadow-lg p-6 text-white cursor-pointer transform hover:scale-105 transition-all hover:shadow-xl"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Active Customers</p>
            <div className="flex items-center gap-2">
              <FiUsers className="w-6 h-6 opacity-75" />
              <FiChevronRight className="w-4 h-4 opacity-50" />
            </div>
          </div>
          <p className="text-4xl font-bold mb-2">{keyMetrics.customer_count || 0}</p>
          <div className="flex items-center gap-2 text-sm">
            <span>{keyMetrics.transaction_volume || 0} transactions</span>
          </div>
          <p className="text-xs opacity-60 mt-2">Click for details →</p>
        </div>
      </div>

      {/* Charts Section - CLICKABLE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Revenue Sources - Clickable */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Revenue Sources</h3>
          {topRevenue && topRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topRevenue.map(item => ({ ...item, amount: Math.abs(item.amount || 0) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11 }} 
                  angle={-45} 
                  textAnchor="end" 
                  height={80} 
                />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={formatCurrency} />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="amount" 
                  radius={[8, 8, 0, 0]}
                  cursor="pointer"
                  onClick={(data) => handleDrillDown('revenue', data.name, `Revenue: ${data.name}`)}
                >
                  {topRevenue.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              <p>No revenue data available</p>
            </div>
          )}
          <p className="text-xs text-center text-gray-400 mt-2">💡 Click any bar for detailed breakdown</p>
        </div>

        {/* Top Expense Categories - Clickable */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Expense Categories</h3>
          {topExpenses && topExpenses.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={topExpenses.map(item => ({ ...item, amount: Math.abs(item.amount || 0) }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name.substring(0, 10)}...: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  dataKey="amount"
                  cursor="pointer"
                  onClick={(data) => handleDrillDown('expense', data.name, `Expense: ${data.name}`)}
                >
                  {topExpenses.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              <p>No expense data available</p>
            </div>
          )}
          <p className="text-xs text-center text-gray-400 mt-2">💡 Click any segment for detailed breakdown</p>
        </div>
      </div>

      {/* Key Business Metrics - Clickable */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Business Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div 
            onClick={() => handleDrillDown('products', 'all', 'Product Analysis')}
            className="text-center p-4 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
          >
            <p className="text-sm text-gray-600 mb-2">Active Products</p>
            <p className="text-2xl font-bold text-gray-900">{keyMetrics.active_products || 0}</p>
            <p className="text-xs text-blue-600 mt-1">Click for details →</p>
          </div>
          <div 
            onClick={() => handleDrillDown('transactions', 'all', 'Transaction Analysis')}
            className="text-center p-4 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
          >
            <p className="text-sm text-gray-600 mb-2">Transaction Volume</p>
            <p className="text-2xl font-bold text-gray-900">{keyMetrics.transaction_volume || 0}</p>
            <p className="text-xs text-green-600 mt-1">Click for details →</p>
          </div>
          <div 
            onClick={() => handleDrillDown('avg_transaction', 'all', 'Average Transaction Details')}
            className="text-center p-4 bg-purple-50 rounded-lg cursor-pointer hover:bg-purple-100 transition-colors"
          >
            <p className="text-sm text-gray-600 mb-2">Avg Transaction Value</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(keyMetrics.avg_transaction_value)}</p>
            <p className="text-xs text-purple-600 mt-1">Click for details →</p>
          </div>
          <div 
            onClick={() => handleDrillDown('customer', 'all', 'Customer Details')}
            className="text-center p-4 bg-orange-50 rounded-lg cursor-pointer hover:bg-orange-100 transition-colors"
          >
            <p className="text-sm text-gray-600 mb-2">Customer Count</p>
            <p className="text-2xl font-bold text-gray-900">{keyMetrics.customer_count || 0}</p>
            <p className="text-xs text-orange-600 mt-1">Click for details →</p>
          </div>
        </div>
      </div>

      {/* AI Insights Panel */}
      {showAIPanel && ceoData && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              🤖 AI-Powered Business Insights
            </h3>
            <button
              onClick={() => setShowAIPanel(!showAIPanel)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              {showAIPanel ? 'Hide' : 'Show'}
            </button>
          </div>
          <AIInsightsPanel
            companyName={selectedCompany}
            dashboardType="CEO"
            dashboardData={ceoData}
            dataSource={dataSource}
          />
        </div>
      )}

      {/* Drill-Down Panel */}
      <DrillDownPanel
        isOpen={drillDown.isOpen}
        onClose={closeDrillDown}
        title={drillDown.title}
        dataType={drillDown.dataType}
        filterValue={drillDown.filterValue}
        companyName={selectedCompany}
        dataSource={dataSource}
        parentData={drillDown.dataType === 'revenue' ? {
          summary: {
            total_amount: execSummary.total_revenue || 0,
            ledger_count: topRevenue?.length || 0,
            transaction_count: keyMetrics.transaction_volume || 0
          },
          transactions: topRevenue?.map((r, i) => ({
            date: '-',
            particulars: r.name,
            type: 'Sales',
            amount: r.amount
          })) || []
        } : drillDown.dataType === 'expense' ? {
          summary: {
            total_amount: execSummary.total_expense || 0,
            ledger_count: topExpenses?.length || 0,
            transaction_count: keyMetrics.transaction_volume || 0
          },
          transactions: topExpenses?.map((e, i) => ({
            date: '-',
            particulars: e.name,
            type: 'Payment',
            amount: e.amount
          })) || []
        } : null}
      />
    </div>
  );
};

export default CEODashboardEnhanced;

