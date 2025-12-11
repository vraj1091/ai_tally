import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, ComposedChart, Area, AreaChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { FiTarget, FiTrendingUp, FiTrendingDown, FiAlertCircle, FiRefreshCw, FiDollarSign } from 'react-icons/fi';
import RupeeIcon from '../common/RupeeIcon';
import { tallyApi } from '../../api/tallyApi';
import { fetchDashboardData } from '../../utils/dashboardHelper';
import toast from 'react-hot-toast';
import { validateChartData, validateNumeric, validateArrayData } from '../../utils/chartDataValidator';

const COLORS = ['#f97316', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6'];

const BudgetActualDashboard = ({ dataSource = 'live' }) => {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [budgetData, setBudgetData] = useState(null);

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
        setBudgetData(null);
      }
      setLoading(false);
    } catch (error) {
      console.error(`Failed to load companies from ${dataSource}:`, error);
      setCompanies([]);
      setSelectedCompany('');
      setBudgetData(null);
      if (dataSource === 'live') {
        toast.error(`Failed to load companies from ${dataSource}`);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCompany && companies.length > 0) {
      loadBudgetData();
    } else if (!selectedCompany) {
      setBudgetData(null);
    }
  }, [selectedCompany, dataSource, companies.length]);

  const loadBudgetData = async () => {
    if (!selectedCompany) {
      setBudgetData(null);
      return;
    }
    
    setLoading(true);
    try {
      const currentSource = dataSource || 'live';
      const response = await fetchDashboardData('budget-actual', selectedCompany, currentSource);
      setBudgetData(response.data.data);
    } catch (error) {
      console.error('Error loading Budget vs Actual data:', error);
      if (error.response?.status === 401 && dataSource === 'live') {
        toast.error('Authentication required for live data. Please login or use backup data.');
      } else {
        toast.error('Failed to load Budget vs Actual data');
      }
      setBudgetData(null);
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
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading Budget vs Actual...</p>
        </div>
      </div>
    );
  }

  if (!budgetData) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <FiAlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Data Available</h3>
        <p className="text-gray-600">Please connect to Tally or select a company with data</p>
      </div>
    );
  }

  const budgetSummary = budgetData.budget_summary || {};
  const varianceAnalysis = budgetData.variance_analysis || {};
  const budgetPerformance = budgetData.budget_performance || {};

  // Budget vs Actual comparison data
  const comparisonData = [
    {
      category: 'Revenue',
      budget: budgetSummary.budget_revenue || 0,
      actual: budgetSummary.actual_revenue || 0,
      variance: budgetSummary.revenue_variance || 0
    },
    {
      category: 'Expenses',
      budget: budgetSummary.budget_expense || 0,
      actual: budgetSummary.actual_expense || 0,
      variance: budgetSummary.expense_variance || 0
    }
  ];

  // Variance trend data
  const varianceTrendData = [
    { month: 'Jan', revenue: budgetSummary.actual_revenue * 0.8, expense: budgetSummary.actual_expense * 0.9 },
    { month: 'Feb', revenue: budgetSummary.actual_revenue * 0.85, expense: budgetSummary.actual_expense * 0.92 },
    { month: 'Mar', revenue: budgetSummary.actual_revenue * 0.9, expense: budgetSummary.actual_expense * 0.94 },
    { month: 'Apr', revenue: budgetSummary.actual_revenue, expense: budgetSummary.actual_expense }
  ];

  const getVarianceColor = (variance) => {
    if (variance > 0) return 'text-green-600';
    if (variance < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getVarianceIcon = (variance) => {
    if (variance > 0) return <FiTrendingUp className="w-5 h-5 text-green-600" />;
    if (variance < 0) return <FiTrendingDown className="w-5 h-5 text-red-600" />;
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Budget vs Actual</h2>
          <p className="text-gray-600 mt-1">Budget Variance Analysis & Performance</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            {companies.map((company, idx) => (
              <option key={idx} value={company.name}>{company.name}</option>
            ))}
          </select>
          <button
            onClick={loadBudgetData}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2"
          >
            <FiRefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Budget Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Budget Revenue</p>
            <FiTarget className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(budgetSummary.budget_revenue)}</p>
          <p className="text-sm opacity-75">Planned revenue</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Actual Revenue</p>
            <FiDollarSign className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(budgetSummary.actual_revenue)}</p>
          <p className="text-sm opacity-75">Achieved revenue</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Budget Expense</p>
            <FiTarget className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(budgetSummary.budget_expense)}</p>
          <p className="text-sm opacity-75">Planned expenses</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Actual Expense</p>
            <FiDollarSign className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(budgetSummary.actual_expense)}</p>
          <p className="text-sm opacity-75">Actual expenses</p>
        </div>
      </div>

      {/* Budget vs Actual Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget vs Actual Comparison</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="category" />
              <YAxis tickFormatter={(val) => formatCurrency(val)} />
              <Tooltip formatter={(val) => formatCurrency(val)} />
              <Legend />
              <Bar dataKey="budget" fill="#f97316" name="Budget" radius={[8, 8, 0, 0]} />
              <Bar dataKey="actual" fill="#10b981" name="Actual" radius={[8, 8, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Variance Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={varianceTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(val) => formatCurrency(val)} />
              <Tooltip formatter={(val) => formatCurrency(val)} />
              <Legend />
              <Area type="monotone" dataKey="revenue" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Revenue" />
              <Area type="monotone" dataKey="expense" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} name="Expenses" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Variance Analysis */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Variance Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-700">Revenue Variance</p>
                {getVarianceIcon(budgetSummary.revenue_variance)}
              </div>
              <p className={`text-2xl font-bold ${getVarianceColor(budgetSummary.revenue_variance)}`}>
                {formatCurrency(budgetSummary.revenue_variance)}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {budgetSummary.revenue_variance_percent?.toFixed(2) || '0.00'}% variance
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-700">Expense Variance</p>
                {getVarianceIcon(budgetSummary.expense_variance)}
              </div>
              <p className={`text-2xl font-bold ${getVarianceColor(budgetSummary.expense_variance)}`}>
                {formatCurrency(budgetSummary.expense_variance)}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {budgetSummary.expense_variance_percent?.toFixed(2) || '0.00'}% variance
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
              <p className="text-sm font-semibold text-gray-700 mb-2">Favorable Variances</p>
              <p className="text-2xl font-bold text-green-700">
                {varianceAnalysis.favorable_variances?.length || 0}
              </p>
              <p className="text-sm text-gray-600 mt-1">Items under budget</p>
          </div>
            <div className="p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
              <p className="text-sm font-semibold text-gray-700 mb-2">Unfavorable Variances</p>
              <p className="text-2xl font-bold text-red-700">
                {varianceAnalysis.unfavorable_variances?.length || 0}
              </p>
              <p className="text-sm text-gray-600 mt-1">Items over budget</p>
          </div>
          </div>
        </div>
      </div>

      {/* Budget Performance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Revenue Achievement</h4>
          <p className="text-3xl font-bold text-gray-900">{budgetPerformance.revenue_achievement?.toFixed(1) || '0.0'}%</p>
          <p className="text-sm text-gray-600 mt-1">Actual vs Budget</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Expense Control</h4>
          <p className="text-3xl font-bold text-gray-900">{budgetPerformance.expense_control?.toFixed(1) || '0.0'}%</p>
          <p className="text-sm text-gray-600 mt-1">Budget vs Actual</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-orange-500">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Overall Performance</h4>
          <p className="text-3xl font-bold text-gray-900">{budgetPerformance.overall_performance || 0}%</p>
          <p className="text-sm text-gray-600 mt-1">Budget performance score</p>
        </div>
      </div>
    </div>
  );
};

export default BudgetActualDashboard;
