import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { FiDollarSign, FiTrendingUp, FiTrendingDown, FiAlertCircle, FiRefreshCw, FiClock } from 'react-icons/fi';
import RupeeIcon from '../common/RupeeIcon';
import { tallyApi } from '../../api/tallyApi';
import apiClient from '../../api/client';
import toast from 'react-hot-toast';
import { validateChartData, validateNumeric, validateArrayData } from '../../utils/chartDataValidator';

const CashFlowDashboard = ({ dataSource = 'live' }) => {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [cashFlowData, setCashFlowData] = useState(null);

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
        setCashFlowData(null);
      }
      setLoading(false);
    } catch (error) {
      console.error(`Failed to load companies from ${dataSource}:`, error);
      setCompanies([]);
      setSelectedCompany('');
      setCashFlowData(null);
      if (dataSource === 'live') {
        toast.error(`Failed to load companies from ${dataSource}`);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCompany && companies.length > 0) {
      loadCashFlowData();
    } else if (!selectedCompany) {
      setCashFlowData(null);
    }
  }, [selectedCompany, dataSource, companies.length]);

  const loadCashFlowData = async () => {
    if (!selectedCompany) {
      setCashFlowData(null);
      return;
    }
    
    setLoading(true);
    try {
      const currentSource = dataSource || 'live';
      const response = await apiClient.get(`/dashboards/cashflow/${encodeURIComponent(selectedCompany)}?source=${currentSource}`);
      setCashFlowData(response.data.data);
    } catch (error) {
      console.error('Error loading Cash Flow data:', error);
      if (error.response?.status === 401 && dataSource === 'live') {
        toast.error('Authentication required for live data. Please login or use backup data.');
      } else {
        toast.error('Failed to load Cash Flow dashboard data');
      }
      setCashFlowData(null);
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
          <div className="w-16 h-16 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading Cash Flow Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!cashFlowData) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <FiAlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Cash Flow Data Available</h3>
        <p className="text-gray-600">Please connect to Tally or select a company with data</p>
      </div>
    );
  }

  const cashSummary = cashFlowData.cash_summary || {};
  const operating = cashFlowData.operating_activities || {};
  const investing = cashFlowData.investing_activities || {};
  const financing = cashFlowData.financing_activities || {};
  const forecast = cashFlowData.cash_forecast || {};
  // Add fallback for burn rate and runway
  const burnRate = cashFlowData.daily_burn_rate || cashFlowData.burn_rate?.daily || cashSummary.cash_burn_rate || 0;
  const runwayDays = forecast.runway_days || forecast.cash_runway_days || cashFlowData.cash_runway || cashSummary.cash_runway || 0;

  // Waterfall data for cash flow visualization
  const waterfallData = [
    { name: 'Opening Cash', value: cashSummary.opening_cash || 0, fill: '#3b82f6' },
    { name: 'Operations', value: operating.cash_from_operations || 0, fill: '#10b981' },
    { name: 'Investing', value: investing.net_investing || 0, fill: '#f59e0b' },
    { name: 'Financing', value: financing.net_financing || 0, fill: '#8b5cf6' },
    { name: 'Closing Cash', value: cashSummary.closing_cash || 0, fill: '#06b6d4' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Cash Flow Dashboard</h2>
          <p className="text-gray-600 mt-1">Cash Management & Liquidity Analysis</p>
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
            onClick={loadCashFlowData}
            className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 flex items-center gap-2"
          >
            <FiRefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Cash Summary Cards - UNIQUE TO CASH FLOW */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-cyan-600 to-cyan-700 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Opening Cash</p>
            <RupeeIcon className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(cashSummary.opening_cash)}</p>
          <p className="text-sm opacity-75">Period start</p>
        </div>

        <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Closing Cash</p>
            <RupeeIcon className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(cashSummary.closing_cash)}</p>
          <p className="text-sm opacity-75">Current balance</p>
        </div>

        <div className={`bg-gradient-to-br ${cashSummary.net_cash_flow >= 0 ? 'from-blue-600 to-blue-700' : 'from-red-600 to-red-700'} rounded-xl shadow-lg p-6 text-white`}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Net Cash Flow</p>
            {cashSummary.net_cash_flow >= 0 ? <FiTrendingUp className="w-6 h-6 opacity-75" /> : <FiTrendingDown className="w-6 h-6 opacity-75" />}
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(cashSummary.net_cash_flow)}</p>
          <p className="text-sm opacity-75">{cashSummary.net_cash_flow >= 0 ? 'Positive flow' : 'Negative flow'}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Cash Runway</p>
            <FiClock className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{runwayDays}</p>
          <p className="text-sm opacity-75">Days remaining</p>
        </div>
      </div>

      {/* Cash Flow Activities - UNIQUE TO CASH FLOW */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cash Flow Activities</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 border-2 border-green-200 rounded-lg bg-green-50">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <div className="w-3 h-3 bg-green-600 rounded-full"></div>
              Operating Activities
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Cash from Operations</span>
                <span className="text-sm font-semibold text-green-700">{formatCurrency(operating.cash_from_operations)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Supplier Payments</span>
                <span className="text-sm font-semibold text-red-700">-{formatCurrency(operating.payments_to_suppliers)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Operating Expenses</span>
                <span className="text-sm font-semibold text-red-700">-{formatCurrency(operating.operating_expenses_paid)}</span>
              </div>
            </div>
          </div>

          <div className="p-4 border-2 border-orange-200 rounded-lg bg-orange-50">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-600 rounded-full"></div>
              Investing Activities
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Asset Purchases</span>
                <span className="text-sm font-semibold text-red-700">-{formatCurrency(investing.asset_purchases)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Asset Sales</span>
                <span className="text-sm font-semibold text-green-700">{formatCurrency(investing.asset_sales)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Net Investing</span>
                <span className={`text-sm font-semibold ${investing.net_investing >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {formatCurrency(investing.net_investing)}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 border-2 border-purple-200 rounded-lg bg-purple-50">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
              Financing Activities
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Loans Received</span>
                <span className="text-sm font-semibold text-green-700">{formatCurrency(financing.loans_received)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Loans Repaid</span>
                <span className="text-sm font-semibold text-red-700">-{formatCurrency(financing.loans_repaid)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Equity Changes</span>
                <span className={`text-sm font-semibold ${financing.equity_changes >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {formatCurrency(financing.equity_changes)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cash Flow Waterfall Chart - UNIQUE TO CASH FLOW */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cash Flow Waterfall</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={waterfallData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => formatCurrency(val)} />
            <Tooltip formatter={(val) => formatCurrency(val)} />
            <Bar dataKey="value" fill="#06b6d4">
              {waterfallData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Cash Forecast & Burn Rate - UNIQUE TO CASH FLOW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cash Forecast</h3>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Next Month</p>
              <p className="text-3xl font-bold text-blue-700">{formatCurrency(forecast.next_month)}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Next Quarter (90 days)</p>
              <p className="text-3xl font-bold text-purple-700">{formatCurrency(forecast.next_quarter)}</p>
            </div>
            <div className={`p-4 rounded-lg ${runwayDays < 90 ? 'bg-red-50' : 'bg-green-50'}`}>
              <p className="text-sm text-gray-600 mb-1">Cash Runway</p>
              <p className={`text-3xl font-bold ${runwayDays < 90 ? 'text-red-700' : 'text-green-700'}`}>
                {runwayDays} days
              </p>
              {runwayDays < 90 && (
                <p className="text-xs text-red-600 mt-2">⚠️ Low runway - consider funding options</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Burn Rate Analysis</h3>
          <div className="space-y-4">
            <div className="p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500">
              <p className="text-sm text-gray-600 mb-1">Daily Burn Rate</p>
              <p className="text-3xl font-bold text-orange-700">{formatCurrency(burnRate)}/day</p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
              <p className="text-sm text-gray-600 mb-1">Monthly Burn Rate</p>
              <p className="text-3xl font-bold text-yellow-700">{formatCurrency(burnRate * 30)}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border-l-4 border-gray-500">
              <p className="text-sm text-gray-600 mb-1">Status</p>
              <p className={`text-2xl font-bold ${
                cashSummary.net_cash_flow >= 0 ? 'text-green-700' : 'text-red-700'
              }`}>
                {cashSummary.net_cash_flow >= 0 ? '✓ Cash Positive' : '⚠ Cash Negative'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cash Management Insights - UNIQUE TO CASH FLOW */}
      <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl shadow-sm p-6 border-2 border-cyan-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Cash Management Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Cash Health</p>
            <p className="text-xl font-bold text-cyan-700">
              {cashSummary.closing_cash > cashSummary.opening_cash ? 'Improving' : 'Declining'}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Liquidity Position</p>
            <p className="text-xl font-bold text-cyan-700">
              {runwayDays > 180 ? 'Strong' : runwayDays > 90 ? 'Adequate' : 'Weak'}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Recommendation</p>
            <p className="text-xl font-bold text-cyan-700">
              {runwayDays < 90 ? 'Reduce Burn' : 'Maintain Course'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashFlowDashboard;
