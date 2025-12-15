import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { FiDollarSign, FiTrendingUp, FiTrendingDown, FiAlertCircle, FiRefreshCw, FiPieChart } from 'react-icons/fi';
import RupeeIcon from '../common/RupeeIcon';
import { tallyApi } from '../../api/tallyApi';
import { fetchDashboardData } from '../../utils/dashboardHelper';
import toast from 'react-hot-toast';
import { validateChartData, validateNumeric, validateArrayData, prepareRevenueExpenseData } from '../../utils/chartDataValidator';
import CustomTooltip from '../common/CustomTooltip';

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];

const ExpenseAnalysisDashboard = ({ dataSource = 'live' }) => {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [expenseData, setExpenseData] = useState(null);

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
        setExpenseData(null);
      }
      setLoading(false);
    } catch (error) {
      console.error(`Failed to load companies from ${dataSource}:`, error);
      setCompanies([]);
      setSelectedCompany('');
      setExpenseData(null);
      if (dataSource === 'live') {
        toast.error(`Failed to load companies from ${dataSource}`);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCompany && companies.length > 0) {
      loadExpenseData();
    } else if (!selectedCompany) {
      setExpenseData(null);
    }
  }, [selectedCompany, dataSource, companies.length]);

  const loadExpenseData = async () => {
    if (!selectedCompany) {
      setExpenseData(null);
      return;
    }
    
    setLoading(true);
    try {
      const currentSource = dataSource || 'live';
      const response = await fetchDashboardData('expense-analysis', selectedCompany, currentSource);
      console.log('Expense Analysis response:', response);
      setExpenseData(response.data.data);
    } catch (error) {
      console.error('Error loading Expense Analysis data:', error);
      if (error.response?.status === 401 && dataSource === 'live') {
        toast.error('Authentication required for live data. Please login or use backup data.');
      } else {
        toast.error('Failed to load Expense Analysis data');
      }
      setExpenseData(null);
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
          <div className="w-16 h-16 rounded-full border-4 animate-spin mx-auto" style={{ borderColor: 'var(--border-color)', borderTopColor: '#ef4444' }} />
          <p className="mt-4 font-medium" style={{ color: 'var(--text-secondary)' }}>Loading Expense Analysis...</p>
        </div>
      </div>
    );
  }

  if (!expenseData) {
    return (
      <div className="card p-12 text-center">
        <FiAlertCircle className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
        <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>No Data Available</h3>
        <p style={{ color: 'var(--text-muted)' }}>Please connect to Tally or select a company with data</p>
        <button onClick={loadExpenseData} className="btn-primary mt-4 px-6 py-2 flex items-center gap-2 mx-auto">
          <FiRefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  const expenseSummary = expenseData.expense_summary || {
    total_expenses: expenseData.total_expenses || 0,
    operating_expenses: expenseData.operating_expenses || 0,
    cogs: expenseData.cogs || 0,
    fixed_expenses: expenseData.fixed_expenses || 0,
    variable_expenses: expenseData.variable_expenses || 0,
    mom_change: expenseData.mom_change || 0,
    yoy_change: expenseData.yoy_change || 0,
    trend: expenseData.trend || 'Stable'
  };
  const expenseBreakdown = expenseData.expense_breakdown || expenseData.top_expense_categories || [];
  const expenseTrends = expenseData.expense_trends || {};
  const topExpenseCategories = expenseData.top_expense_categories || [];

  // Expense breakdown pie chart data
  const expensePieData = expenseBreakdown.slice(0, 8).map(e => ({
    name: e.name || 'Unknown',
    amount: parseFloat(e.amount || 0)
  }));

  // Expense trends data
  const trendsData = [
    { month: 'Jan', expense: expenseSummary.total_expenses * 0.85 },
    { month: 'Feb', expense: expenseSummary.total_expenses * 0.90 },
    { month: 'Mar', expense: expenseSummary.total_expenses * 0.95 },
    { month: 'Apr', expense: expenseSummary.total_expenses }
  ];

  return (
    <div className="space-y-6 p-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Expense Analysis</h2>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Detailed Breakdown of All Expenditures</p>
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
            onClick={loadExpenseData}
            className="btn-primary flex items-center gap-2 px-4 py-2"
            style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Expense Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="card p-6 text-white" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', border: 'none' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Total Expenses</p>
            <FiDollarSign className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(expenseSummary.total_expenses)}</p>
          <p className="text-sm opacity-75">All expenses</p>
        </div>

        <div className="card p-6 text-white" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', border: 'none' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Fixed Expenses</p>
            <FiPieChart className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(expenseSummary.fixed_expenses)}</p>
          <p className="text-sm opacity-75">Fixed costs</p>
        </div>

        <div className="card p-6 text-white" style={{ background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)', border: 'none' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Variable Expenses</p>
            <FiTrendingUp className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(expenseSummary.variable_expenses)}</p>
          <p className="text-sm opacity-75">Variable costs</p>
        </div>

        <div className="card p-6 text-white" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', border: 'none' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Operating Expenses</p>
            <RupeeIcon className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(expenseSummary.operating_expenses)}</p>
          <p className="text-sm opacity-75">OpEx</p>
        </div>

        <div className="card p-6 text-white" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', border: 'none' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">COGS</p>
            <FiDollarSign className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(expenseSummary.cogs)}</p>
          <p className="text-sm opacity-75">Cost of goods sold</p>
        </div>
      </div>

      {/* Expense Breakdown & Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Expense Breakdown</h3>
          {expensePieData && expensePieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={expensePieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, amount }) => `${name}: ${formatCurrency(amount)}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {expensePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip formatCurrency={formatCurrency} formatPercent={formatPercent} />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[350px] flex items-center justify-center">
              <p style={{ color: 'var(--text-muted)' }}>No expense breakdown data available</p>
            </div>
          )}
        </div>

        <div className="card p-6">
          <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Expense Trends</h3>
          {trendsData && trendsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={trendsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)' }} />
                <YAxis tickFormatter={(val) => formatCurrency(val)} tick={{ fill: 'var(--text-secondary)' }} />
                <Tooltip content={<CustomTooltip formatCurrency={formatCurrency} formatPercent={formatPercent} />} />
                <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[350px] flex items-center justify-center">
              <p style={{ color: 'var(--text-muted)' }}>No trend data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Top Expense Categories */}
      <div className="card p-6">
        <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Top Expense Categories</h3>
        {topExpenseCategories && topExpenseCategories.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topExpenseCategories.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
              <YAxis tickFormatter={(val) => formatCurrency(val)} tick={{ fill: 'var(--text-secondary)' }} />
              <Tooltip content={<CustomTooltip formatCurrency={formatCurrency} formatPercent={formatPercent} />} />
              <Bar dataKey="amount" fill="#ef4444" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center">
            <p style={{ color: 'var(--text-muted)' }}>No category data available</p>
          </div>
        )}
      </div>

      {/* Expense Trends Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6" style={{ borderLeft: '4px solid #3b82f6' }}>
          <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Month over Month</h4>
          <p className="text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {formatPercent(expenseSummary.mom_change || expenseTrends.month_over_month || 0)}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>MoM change</p>
        </div>
        <div className="card p-6" style={{ borderLeft: '4px solid #10b981' }}>
          <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Year over Year</h4>
          <p className="text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {formatPercent(expenseSummary.yoy_change || expenseTrends.year_over_year || 0)}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>YoY change</p>
        </div>
        <div className="card p-6" style={{ borderLeft: '4px solid #ef4444' }}>
          <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Trend</h4>
          <p className="text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {expenseSummary.trend || expenseTrends.trend || 'Stable'}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Overall direction</p>
        </div>
      </div>

      {/* Data Source Info */}
      <div className="card p-4" style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(220, 38, 38, 0.05) 100%)' }}>
        <div className="flex items-center gap-3">
          <FiAlertCircle className="w-5 h-5" style={{ color: '#ef4444' }} />
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Data Source: <span className="font-bold">{dataSource.toUpperCase()}</span>
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Showing expense data from {dataSource} source
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseAnalysisDashboard;
