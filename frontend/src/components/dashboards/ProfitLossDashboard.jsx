import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { FiTrendingUp, FiTrendingDown, FiAlertCircle, FiRefreshCw, FiPercent } from 'react-icons/fi';
import RupeeIcon from '../common/RupeeIcon';
import { tallyApi } from '../../api/tallyApi';
import toast from 'react-hot-toast';
import { validateChartData, validateNumeric, prepareRevenueExpenseData } from '../../utils/chartDataValidator';
import { fetchDashboardData } from '../../utils/dashboardHelper';

const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6'];

const ProfitLossDashboard = ({ dataSource = 'live' }) => {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [plData, setPlData] = useState(null);

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
        setPlData(null);
      }
      setLoading(false);
    } catch (error) {
      console.error(`Failed to load companies from ${dataSource}:`, error);
      setCompanies([]);
      setSelectedCompany('');
      setPlData(null);
      if (dataSource === 'live') {
        toast.error(`Failed to load companies from ${dataSource}`);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCompany && companies.length > 0) {
      loadPLData();
    } else if (!selectedCompany) {
      setPlData(null);
    }
  }, [selectedCompany, dataSource, companies.length]);

  const loadPLData = async () => {
    if (!selectedCompany) {
      setPlData(null);
      return;
    }
    
    setLoading(true);
    try {
      const currentSource = dataSource || 'live';
      const response = await fetchDashboardData('profit-loss', selectedCompany, currentSource);
      setPlData(response.data.data);
    } catch (error) {
      console.error('Error loading Profit & Loss data:', error);
      if (error.response?.status === 401 && dataSource === 'live') {
        toast.error('Authentication required for live data. Please login or use backup data.');
      } else {
        toast.error('Failed to load Profit & Loss data');
      }
      setPlData(null);
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
          <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading Profit & Loss Statement...</p>
        </div>
      </div>
    );
  }

  if (!plData) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <FiAlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Data Available</h3>
        <p className="text-gray-600">Please connect to Tally or select a company with data</p>
      </div>
    );
  }

  const incomeStatement = plData.income_statement || plData.income_summary || {
    total_income: plData.total_income || 0,
    total_expenses: plData.total_expenses || 0,
    net_profit: plData.net_profit || 0,
    profit_margin: plData.profit_margin || 0
  };
  const incomeBreakdown = plData.income_breakdown || [];
  const expenseBreakdown = plData.expense_breakdown || [];
  const profitabilityTrends = plData.profitability_trends || {};
  const keyRatios = plData.key_ratios || {};

  // Prepare data for Income vs Expense chart
  const incomeExpenseData = [
    { name: 'Income', value: incomeStatement.total_income || 0, type: 'Income' },
    { name: 'Expenses', value: incomeStatement.total_expenses || 0, type: 'Expense' }
  ];

  // Prepare profitability trends data
  const trendsData = [
    { period: 'Q1', revenue: incomeStatement.total_income * 0.9, expense: incomeStatement.total_expenses * 0.95 },
    { period: 'Q2', revenue: incomeStatement.total_income * 0.95, expense: incomeStatement.total_expenses * 0.98 },
    { period: 'Q3', revenue: incomeStatement.total_income, expense: incomeStatement.total_expenses },
    { period: 'Q4', revenue: incomeStatement.total_income * 1.05, expense: incomeStatement.total_expenses * 1.02 }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Profit & Loss Statement</h2>
          <p className="text-gray-600 mt-1">Income Statement & Profitability Analysis</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
          >
            {companies.map((company, idx) => (
              <option key={idx} value={company.name}>{company.name}</option>
            ))}
          </select>
          <button
            onClick={loadPLData}
            className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 flex items-center gap-2"
          >
            <FiRefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Income Statement Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Total Income</p>
            <RupeeIcon className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(incomeStatement.total_income)}</p>
          <p className="text-sm opacity-75">All revenue sources</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Total Expenses</p>
            <FiTrendingDown className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(incomeStatement.total_expenses)}</p>
          <p className="text-sm opacity-75">All costs & expenses</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Net Profit</p>
            <FiTrendingUp className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(incomeStatement.net_profit)}</p>
          <p className="text-sm opacity-75">After all expenses</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Profit Margin</p>
            <FiPercent className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{keyRatios.net_margin?.toFixed(1) || incomeStatement.profit_margin?.toFixed(1) || '0.0'}%</p>
          <p className="text-sm opacity-75">Net profit margin</p>
        </div>
      </div>

      {/* Income vs Expense Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Income vs Expenses</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={incomeExpenseData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(val) => formatCurrency(val)} />
              <Tooltip formatter={(val) => formatCurrency(val)} />
              <Bar dataKey="value" fill="#10b981" radius={[8, 8, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Profitability Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="period" />
              <YAxis tickFormatter={(val) => formatCurrency(val)} />
              <Tooltip formatter={(val) => formatCurrency(val)} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Revenue" />
              <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} name="Expenses" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Income Breakdown */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Income Breakdown</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                  data={incomeBreakdown.slice(0, 5)}
                cx="50%"
                cy="50%"
                labelLine={false}
                  label={({ name, amount }) => `${name}: ${formatCurrency(amount)}`}
                  outerRadius={80}
                fill="#8884d8"
                  dataKey="amount"
              >
                  {incomeBreakdown.slice(0, 5).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
                <Tooltip formatter={(val) => formatCurrency(val)} />
            </PieChart>
          </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {incomeBreakdown.slice(0, 5).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">{item.name || 'Unknown'}</span>
                <span className="text-sm font-bold text-green-600">{formatCurrency(item.amount || 0)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Expense Breakdown */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Breakdown</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={expenseBreakdown.slice(0, 5)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, amount }) => `${name}: ${formatCurrency(amount)}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {expenseBreakdown.slice(0, 5).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => formatCurrency(val)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {expenseBreakdown.slice(0, 5).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">{item.name || 'Unknown'}</span>
                <span className="text-sm font-bold text-red-600">{formatCurrency(item.amount || 0)}</span>
          </div>
            ))}
          </div>
        </div>
      </div>

      {/* Profitability Ratios */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Gross Profit</h4>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(incomeStatement.gross_profit || 0)}</p>
          <p className="text-sm text-gray-600 mt-1">Gross Margin: {keyRatios.gross_margin?.toFixed(1) || '0.0'}%</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Operating Profit</h4>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(incomeStatement.operating_profit || 0)}</p>
          <p className="text-sm text-gray-600 mt-1">Operating Margin: {keyRatios.operating_margin?.toFixed(1) || '0.0'}%</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-yellow-500">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Net Profit</h4>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(incomeStatement.net_profit || 0)}</p>
          <p className="text-sm text-gray-600 mt-1">Net Margin: {keyRatios.net_margin?.toFixed(1) || incomeStatement.profit_margin?.toFixed(1) || '0.0'}%</p>
        </div>
      </div>

      {/* Profitability Trends Summary */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Profitability Trends</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Revenue Trend</p>
            <p className="text-xl font-bold text-green-700">{profitabilityTrends.revenue_trend || 'N/A'}</p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Expense Trend</p>
            <p className="text-xl font-bold text-red-700">{profitabilityTrends.expense_trend || 'N/A'}</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Profit Trend</p>
            <p className="text-xl font-bold text-blue-700">{profitabilityTrends.profit_trend || 'N/A'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfitLossDashboard;
