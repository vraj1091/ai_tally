import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, AreaChart, Area, ComposedChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { FiTrendingUp, FiTrendingDown, FiAlertCircle, FiRefreshCw, FiBarChart2 } from 'react-icons/fi';
import RupeeIcon from '../common/RupeeIcon';
import { tallyApi } from '../../api/tallyApi';
import { fetchDashboardData } from '../../utils/dashboardHelper';
import toast from 'react-hot-toast';
import { validateChartData, validateNumeric, validateArrayData } from '../../utils/chartDataValidator';

const ForecastingDashboard = ({ dataSource = 'live' }) => {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [forecastData, setForecastData] = useState(null);

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
        setForecastData(null);
      }
      setLoading(false);
    } catch (error) {
      console.error(`Failed to load companies from ${dataSource}:`, error);
      setCompanies([]);
      setSelectedCompany('');
      setForecastData(null);
      if (dataSource === 'live') {
        toast.error(`Failed to load companies from ${dataSource}`);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCompany && companies.length > 0) {
      loadForecastData();
    } else if (!selectedCompany) {
      setForecastData(null);
    }
  }, [selectedCompany, dataSource, companies.length]);

  const loadForecastData = async () => {
    if (!selectedCompany) {
      setForecastData(null);
      return;
    }
    
    setLoading(true);
    try {
      const currentSource = dataSource || 'live';
      const response = await fetchDashboardData('forecasting', selectedCompany, currentSource);
      setForecastData(response.data.data);
    } catch (error) {
      console.error('Error loading Forecasting data:', error);
      if (error.response?.status === 401 && dataSource === 'live') {
        toast.error('Authentication required for live data. Please login or use backup data.');
      } else {
        toast.error('Failed to load Forecasting data');
      }
      setForecastData(null);
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
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading Financial Forecasting...</p>
        </div>
      </div>
    );
  }

  if (!forecastData) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <FiAlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Data Available</h3>
        <p className="text-gray-600">Please connect to Tally or select a company with data</p>
      </div>
    );
  }

  const revenueForecast = forecastData.revenue_forecast || {};
  const expenseForecast = forecastData.expense_forecast || {};
  const profitForecast = forecastData.profit_forecast || {};
  const trendAnalysis = forecastData.trend_analysis || {};

  // Forecast timeline data
  const forecastTimeline = [
    { period: 'Current', revenue: revenueForecast.current_month || 0, expense: expenseForecast.current_month || 0, profit: profitForecast.current_month || 0 },
    { period: 'Next Month', revenue: revenueForecast.next_month || 0, expense: expenseForecast.next_month || 0, profit: profitForecast.next_month || 0 },
    { period: 'Next Quarter', revenue: revenueForecast.next_quarter || 0, expense: expenseForecast.next_quarter || 0, profit: profitForecast.next_quarter || 0 },
    { period: 'Next Year', revenue: revenueForecast.next_year || 0, expense: expenseForecast.next_year || 0, profit: profitForecast.next_year || 0 }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Financial Forecasting</h2>
          <p className="text-gray-600 mt-1">Predictive Analytics & Future Projections</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          >
            {companies.map((company, idx) => (
              <option key={idx} value={company.name}>{company.name}</option>
            ))}
          </select>
          <button
            onClick={loadForecastData}
            className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 flex items-center gap-2"
          >
            <FiRefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Forecast Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Next Month Revenue</p>
            <FiTrendingUp className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(revenueForecast.next_month)}</p>
          <p className="text-sm opacity-75">Growth: {revenueForecast.growth_rate?.toFixed(1) || '0.0'}%</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Next Month Expenses</p>
            <FiTrendingDown className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(expenseForecast.next_month)}</p>
          <p className="text-sm opacity-75">Projected expenses</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Next Quarter Revenue</p>
            <FiBarChart2 className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(revenueForecast.next_quarter)}</p>
          <p className="text-sm opacity-75">3-month projection</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Next Year Revenue</p>
            <RupeeIcon className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(revenueForecast.next_year)}</p>
          <p className="text-sm opacity-75">Annual projection</p>
        </div>
      </div>

      {/* Revenue Forecast Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Forecast Timeline</h3>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={forecastTimeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="period" />
            <YAxis tickFormatter={(val) => formatCurrency(val)} />
              <Tooltip formatter={(val) => formatCurrency(val)} />
            <Legend />
            <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Revenue" />
          </AreaChart>
          </ResponsiveContainer>
        </div>

      {/* Expense Forecast Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Forecast Timeline</h3>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={forecastTimeline}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="period" />
            <YAxis tickFormatter={(val) => formatCurrency(val)} />
            <Tooltip formatter={(val) => formatCurrency(val)} />
            <Legend />
            <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} name="Expenses" />
          </AreaChart>
          </ResponsiveContainer>
      </div>

      {/* Profit Forecast Chart */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Profit Forecast Timeline</h3>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={forecastTimeline}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="period" />
            <YAxis tickFormatter={(val) => formatCurrency(val)} />
            <Tooltip formatter={(val) => formatCurrency(val)} />
            <Legend />
            <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
            <Bar dataKey="expense" fill="#ef4444" name="Expenses" />
            <Line type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={3} name="Net Profit" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Trend Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Revenue Trend</h4>
          <p className="text-3xl font-bold text-gray-900">{trendAnalysis.revenue_trend || 'N/A'}</p>
          <p className="text-sm text-gray-600 mt-1">Future revenue direction</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-red-500">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Expense Trend</h4>
          <p className="text-3xl font-bold text-gray-900">{trendAnalysis.expense_trend || 'N/A'}</p>
          <p className="text-sm text-gray-600 mt-1">Future expense direction</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Profit Trend</h4>
          <p className="text-3xl font-bold text-gray-900">{trendAnalysis.profit_trend || 'N/A'}</p>
          <p className="text-sm text-gray-600 mt-1">Future profitability direction</p>
        </div>
      </div>
    </div>
  );
};

export default ForecastingDashboard;
