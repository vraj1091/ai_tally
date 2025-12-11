import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { FiTrendingUp, FiTrendingDown, FiActivity, FiAlertCircle, FiRefreshCw, FiUsers } from 'react-icons/fi';
import RupeeIcon from '../common/RupeeIcon';
import EmptyDataState from '../common/EmptyDataState';
import { tallyApi } from '../../api/tallyApi';
import apiClient from '../../api/client';
import toast from 'react-hot-toast';
import { prepareRevenueExpenseData } from '../../utils/chartDataValidator';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const CEODashboard = ({ dataSource = 'live' }) => {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [ceoData, setCeoData] = useState(null);

  useEffect(() => {
    loadCompanies();
  }, [dataSource]);

  useEffect(() => {
    // Only load data if we have a selected company
    if (selectedCompany) {
      console.log(`CEO Dashboard - useEffect triggered: selectedCompany="${selectedCompany}", companies.length=${companies.length}, dataSource=${dataSource}`);
      // Force loadCEOData to run
      loadCEOData();
    } else {
      // Only clear data if we've finished loading companies and still have no selection
      if (companies.length === 0 && !loading) {
        console.log('CEO Dashboard - No company selected after loading, clearing data');
        setCeoData(null);
      } else {
        console.log(`CEO Dashboard - Waiting for company selection. selectedCompany: ${selectedCompany}, companies.length: ${companies.length}, loading: ${loading}`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      
      // Handle different response structures
      let companyList = [];
      if (response && response.companies) {
        companyList = Array.isArray(response.companies) ? response.companies : [];
      } else if (Array.isArray(response)) {
        companyList = response;
      } else if (response && response.data && response.data.companies) {
        companyList = Array.isArray(response.data.companies) ? response.data.companies : [];
      }
      
      console.log(`CEO Dashboard - Raw response:`, response);
      console.log(`CEO Dashboard - Loaded ${companyList.length} companies from ${dataSource}:`, companyList);
      
      // Normalize company list - handle both string and object formats
      const normalizedCompanies = companyList.map(company => {
        if (typeof company === 'string') {
          return { name: company };
        } else if (company && company.name) {
          return company;
        } else if (company && typeof company === 'object') {
          // Try to extract name from various possible fields
          return { name: company.name || company.company_name || company.company || String(company) };
        }
        return { name: String(company) };
      });
      
      console.log(`CEO Dashboard - Normalized companies:`, normalizedCompanies);
      setCompanies(normalizedCompanies);
      
      if (normalizedCompanies.length > 0) {
        const firstCompany = normalizedCompanies[0];
        const companyName = firstCompany.name || firstCompany;
        console.log(`CEO Dashboard - Setting selected company to: "${companyName}"`);
        // Set company immediately - don't use setTimeout to avoid race conditions
        setSelectedCompany(companyName);
      } else {
        // Clear selected company if no companies found
        console.log('CEO Dashboard - No companies found, clearing selection');
        setSelectedCompany('');
        setCeoData(null);
      }
      setLoading(false);
    } catch (error) {
      console.error(`Failed to load companies from ${dataSource}:`, error);
      setCompanies([]);
      setSelectedCompany('');
      setCeoData(null);
      // Only show error for live mode (backup mode can be empty)
      if (dataSource === 'live') {
        toast.error(`Failed to load companies from ${dataSource}`);
      }
      setLoading(false);
    }
  };

  const loadCEOData = async () => {
    if (!selectedCompany) {
      setCeoData(null);
      return;
    }
    
    setLoading(true);
    try {
      // Ensure we use the current dataSource (not a stale closure value)
      const currentSource = dataSource || 'live';
      console.log(`Loading CEO data for company: ${selectedCompany}, source: ${currentSource}`);
      
      // Add explicit timeout of 3 minutes for dashboard calculations (increased for large backup files)
      const apiUrl = `/dashboards/ceo/${encodeURIComponent(selectedCompany)}?source=${currentSource}`;
      console.log(`CEO Dashboard - Making API call to: ${apiUrl}`);
      const response = await apiClient.get(apiUrl, {
        timeout: 180000 // 3 minutes for complex calculations with large backup files
      });
      
      console.log('CEO Dashboard Response:', response.data);
      console.log('CEO Data:', response.data.data);
      console.log('Top Revenue Sources:', response.data.data?.top_5_revenue_sources);
      console.log('Top Expense Categories:', response.data.data?.top_5_expense_categories);
      console.log('Key Metrics:', response.data.data?.key_metrics);
      
      if (response.data && response.data.data) {
        const data = response.data.data;
        // Log data structure for debugging
        console.log('CEO Dashboard - Full data structure:', {
          hasTopRevenue: !!data.top_5_revenue_sources,
          topRevenueLength: data.top_5_revenue_sources?.length || 0,
          hasTopExpenses: !!data.top_5_expense_categories,
          topExpensesLength: data.top_5_expense_categories?.length || 0,
          topRevenueSample: data.top_5_revenue_sources?.slice(0, 2),
          topExpensesSample: data.top_5_expense_categories?.slice(0, 2)
        });
        setCeoData(data);
      } else {
        console.error('Invalid response structure:', response.data);
        toast.error('Invalid data received from server');
        setCeoData(null);
      }
    } catch (error) {
      console.error('Error loading CEO data:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status
      });
      
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        toast.error('Request timeout - Dashboard calculation is taking too long. Please try again or use a smaller backup file.');
      } else if (error.response?.status === 401 && dataSource === 'live') {
        toast.error('Authentication required for live data. Please login or use backup data.');
      } else if (error.response?.status === 404) {
        toast.error('Dashboard endpoint not found. Please check backend deployment.');
      } else if (error.response?.status === 500) {
        toast.error('Server error while calculating dashboard. Please try again.');
      } else if (!error.response) {
        toast.error('Network error - Cannot reach backend server. Please check your connection.');
      } else {
        toast.error(`Failed to load CEO dashboard data: ${error.response?.data?.detail || error.message}`);
      }
      setCeoData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    const absValue = Math.abs(value || 0);
    if (absValue >= 10000000) return `₹${(absValue / 10000000).toFixed(2)}Cr`;
    if (absValue >= 100000) return `₹${(absValue / 100000).toFixed(2)}L`;
    if (absValue >= 1000) return `₹${(absValue / 1000).toFixed(2)}K`;
    return `₹${absValue.toFixed(0)}`;
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
        message={dataSource === 'live' 
          ? "The selected Tally company has no data. Try switching to 'Backup File' mode if you have uploaded a backup, or select a different company in Tally."
          : "Please upload a backup file with company data or switch to 'Live Tally' mode if Tally is running."}
        onRefresh={loadCEOData}
        dataSource={dataSource}
      />
    );
  }
  
  // Check if data is empty (all zeros)
  const execSummary = ceoData.executive_summary || {};
  const hasData = (execSummary.total_revenue || 0) > 0 || 
                  (execSummary.total_expense || 0) > 0 ||
                  (ceoData.top_5_revenue_sources || []).length > 0 ||
                  (ceoData.top_5_expense_categories || []).length > 0;
  
  if (!hasData) {
    const validationWarnings = ceoData.validation?.warnings || [];
    return (
      <EmptyDataState
        title="No Financial Data Found"
        message="The selected company has no revenue, expense, or transaction data. Please ensure your Tally data contains financial transactions."
        validationWarnings={validationWarnings}
        onRefresh={loadCEOData}
        dataSource={dataSource}
      />
    );
  }

  // Extract data (execSummary already declared above)
  const keyMetrics = ceoData.key_metrics || {};
  const performance = ceoData.performance_indicators || {};
  
  // Debug logging
  console.log('CEO Dashboard - Key Metrics:', keyMetrics);
  console.log('CEO Dashboard - Active Products:', keyMetrics.active_products);
  console.log('CEO Dashboard - Transaction Volume:', keyMetrics.transaction_volume);
  
  // CRITICAL: Handle both field name variations and ensure arrays are always arrays
  // Get raw data first
  const rawTopRevenue = ceoData.top_5_revenue_sources || ceoData.topRevenue || [];
  const rawTopExpenses = ceoData.top_5_expense_categories || ceoData.topExpenses || [];
  
  console.log('CEO Dashboard - Raw Top Revenue Sources:', rawTopRevenue);
  console.log('CEO Dashboard - Raw Top Expense Categories:', rawTopExpenses);
  console.log('CEO Dashboard - Raw data types:', {
    revenueType: typeof rawTopRevenue,
    revenueIsArray: Array.isArray(rawTopRevenue),
    revenueLength: rawTopRevenue?.length,
    expenseType: typeof rawTopExpenses,
    expenseIsArray: Array.isArray(rawTopExpenses),
    expenseLength: rawTopExpenses?.length
  });
  
  // Process and filter data using validation utility
  const topRevenue = prepareRevenueExpenseData(rawTopRevenue);
  const topExpenses = prepareRevenueExpenseData(rawTopExpenses);
  
  // Log for debugging
  console.log('CEO Dashboard - Processed Top Revenue Sources:', topRevenue);
  console.log('CEO Dashboard - Processed Top Expense Categories:', topExpenses);
  console.log('CEO Dashboard - Processed lengths:', {
    revenueLength: topRevenue?.length,
    expenseLength: topExpenses?.length
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">CEO Dashboard</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Executive Overview & Strategic Insights</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base w-full sm:w-auto"
          >
            {companies.map((company, idx) => (
              <option key={idx} value={company.name || company}>{company.name || company}</option>
            ))}
          </select>
          <button
            onClick={loadCEOData}
            className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <FiRefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Executive KPI Cards - UNIQUE TO CEO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Total Revenue</p>
            <RupeeIcon className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(execSummary.total_revenue)}</p>
          <div className="flex items-center gap-2 text-sm">
            <FiTrendingUp className="w-4 h-4" />
            <span>Growth: {execSummary.growth_rate?.toFixed(1)}%</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Net Profit</p>
            <RupeeIcon className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(execSummary.net_profit)}</p>
          <div className="flex items-center gap-2 text-sm">
            <span>Margin: {execSummary.profit_margin_percent?.toFixed(1)}%</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Growth Rate</p>
            <FiTrendingUp className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{execSummary.growth_rate?.toFixed(1)}%</p>
          <div className="flex items-center gap-2 text-sm">
            <span>Market: {execSummary.market_position || 'Strong'}</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Active Customers</p>
            <FiUsers className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{keyMetrics.customer_count || 0}</p>
          <div className="flex items-center gap-2 text-sm">
            <span>{keyMetrics.transaction_volume || 0} transactions</span>
          </div>
        </div>
      </div>

      {/* Performance Indicators - UNIQUE TO CEO */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Indicators</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Revenue Trend</p>
            <p className="text-2xl font-bold text-blue-700">{performance.revenue_trend || 'Stable'}</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Expense Trend</p>
            <p className="text-2xl font-bold text-green-700">{performance.expense_trend || 'Stable'}</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Efficiency Score</p>
            <p className="text-2xl font-bold text-purple-700">{performance.efficiency_score?.toFixed(1)}%</p>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Cash Position</p>
            <p className="text-2xl font-bold text-orange-700">{performance.cash_position || 'Healthy'}</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Revenue Sources */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Revenue Sources</h3>
          {topRevenue && topRevenue.length > 0 ? (
            <>
              {topRevenue.length === 1 ? (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <FiAlertCircle className="inline mr-2" />
                    Only 1 revenue source found. Please ensure your Tally data contains multiple revenue ledgers or transactions.
                  </p>
                </div>
              ) : null}
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topRevenue.map(item => ({ ...item, amount: Math.abs(item.amount || 0) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11 }} 
                    angle={topRevenue.length > 3 ? -45 : 0} 
                    textAnchor={topRevenue.length > 3 ? "end" : "middle"} 
                    height={topRevenue.length > 3 ? 100 : 60} 
                  />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => formatCurrency(Math.abs(val))} />
                  <Tooltip formatter={(val) => formatCurrency(Math.abs(val))} />
                  <Bar dataKey="amount" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              {/* Show list if only 1-2 items */}
              {topRevenue.length <= 2 && (
                <div className="mt-4 space-y-2">
                  {topRevenue.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm font-medium text-gray-700">{item.name}</span>
                      <span className="text-sm font-bold text-blue-600">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              <div className="text-center">
                <p className="text-sm">No revenue data available</p>
                <p className="text-xs text-gray-400 mt-1">Revenue sources will appear here when data is available</p>
              </div>
            </div>
          )}
        </div>

        {/* Top Expense Categories */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Expense Categories</h3>
          {topExpenses && topExpenses.length > 0 ? (
            <>
              {topExpenses.length === 1 ? (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <FiAlertCircle className="inline mr-2" />
                    Only 1 expense category found. Please ensure your Tally data contains multiple expense ledgers or transactions.
                  </p>
                </div>
              ) : null}
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={topExpenses.map(item => ({ ...item, amount: Math.abs(item.amount || 0) }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => {
                      const shortName = name.length > 15 ? name.substring(0, 12) + '...' : name;
                      return `${shortName}: ${(percent * 100).toFixed(0)}%`;
                    }}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {topExpenses.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => formatCurrency(Math.abs(val))} />
                </PieChart>
              </ResponsiveContainer>
              {/* Show list if only 1-2 items */}
              {topExpenses.length <= 2 && (
                <div className="mt-4 space-y-2">
                  {topExpenses.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm font-medium text-gray-700">{item.name}</span>
                      <span className="text-sm font-bold text-green-600">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              <div className="text-center">
                <p className="text-sm">No expense data available</p>
                <p className="text-xs text-gray-400 mt-1">Expense categories will appear here when data is available</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Key Business Metrics - UNIQUE TO CEO */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Business Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-2">Active Products</p>
            <p className="text-2xl font-bold text-gray-900">{keyMetrics.active_products || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Transaction Volume</p>
            <p className="text-2xl font-bold text-gray-900">{keyMetrics.transaction_volume || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Avg Transaction Value</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(keyMetrics.avg_transaction_value)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Customer Count</p>
            <p className="text-2xl font-bold text-gray-900">{keyMetrics.customer_count || 0}</p>
          </div>
        </div>
      </div>

      {/* Strategic Alerts */}
      {ceoData.strategic_alerts && ceoData.strategic_alerts.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Strategic Alerts</h3>
          <div className="space-y-3">
            {ceoData.strategic_alerts.map((alert, idx) => (
              <div key={idx} className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <FiAlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-900">{alert.title || 'Alert'}</p>
                  <p className="text-sm text-yellow-700 mt-1">{alert.message || alert}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CEODashboard;
