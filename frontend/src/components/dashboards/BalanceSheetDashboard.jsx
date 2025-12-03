import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Treemap, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { FiDollarSign, FiTrendingUp, FiAlertCircle, FiRefreshCw, FiLayers } from 'react-icons/fi';
import RupeeIcon from '../common/RupeeIcon';
import { tallyApi } from '../../api/tallyApi';
import apiClient from '../../api/client';
import toast from 'react-hot-toast';
import { validateChartData, validateNumeric } from '../../utils/chartDataValidator';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const BalanceSheetDashboard = ({ dataSource = 'live' }) => {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [bsData, setBsData] = useState(null);

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
        setBsData(null);
      }
      setLoading(false);
    } catch (error) {
      console.error(`Failed to load companies from ${dataSource}:`, error);
      setCompanies([]);
      setSelectedCompany('');
      setBsData(null);
      if (dataSource === 'live') {
        toast.error(`Failed to load companies from ${dataSource}`);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCompany && companies.length > 0) {
      loadBSData();
    } else if (!selectedCompany) {
      setBsData(null);
    }
  }, [selectedCompany, dataSource, companies.length]);

  const loadBSData = async () => {
    if (!selectedCompany) {
      setBsData(null);
      return;
    }
    
    setLoading(true);
    try {
      const currentSource = dataSource || 'live';
      const response = await apiClient.get(`/dashboards/balance-sheet/${encodeURIComponent(selectedCompany)}?source=${currentSource}`);
      setBsData(response.data.data);
    } catch (error) {
      console.error('Error loading Balance Sheet data:', error);
      if (error.response?.status === 401 && dataSource === 'live') {
        toast.error('Authentication required for live data. Please login or use backup data.');
      } else {
        toast.error('Failed to load Balance Sheet data');
      }
      setBsData(null);
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
          <p className="mt-4 text-gray-600 font-medium">Loading Balance Sheet...</p>
        </div>
      </div>
    );
  }

  if (!bsData) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <FiAlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Data Available</h3>
        <p className="text-gray-600">Please connect to Tally or select a company with data</p>
      </div>
    );
  }

  const balanceSheet = bsData.balance_sheet || bsData.balance_summary || {
    total_assets: bsData.total_assets || 0,
    total_liabilities: bsData.total_liabilities || 0,
    total_equity: bsData.total_equity || 0
  };
  // Handle both array and object formats from backend
  const assetsBreakdownRaw = bsData.assets_breakdown || bsData.assets || [];
  const liabilitiesBreakdownRaw = bsData.liabilities_breakdown || bsData.liabilities || [];
  const financialPosition = bsData.financial_position || {};
  
  // Convert to object if array
  const assetsBreakdown = Array.isArray(assetsBreakdownRaw) ? {} : assetsBreakdownRaw;
  const liabilitiesBreakdown = Array.isArray(liabilitiesBreakdownRaw) ? {} : liabilitiesBreakdownRaw;

  // Assets data for charts - use array if available, otherwise construct from object
  const assetsData = Array.isArray(assetsBreakdownRaw) && assetsBreakdownRaw.length > 0 
    ? assetsBreakdownRaw.map(a => ({ name: a.name, value: a.value || a.amount || 0 }))
    : [
        { name: 'Current Assets', value: bsData.current_assets || assetsBreakdown.current_assets || 0 },
        { name: 'Fixed Assets', value: bsData.fixed_assets || assetsBreakdown.fixed_assets || 0 },
        { name: 'Investments', value: bsData.total_assets * 0.1 || assetsBreakdown.investments || 0 }
      ];

  // Liabilities data for charts - use array if available, otherwise construct from object
  const liabilitiesData = Array.isArray(liabilitiesBreakdownRaw) && liabilitiesBreakdownRaw.length > 0 
    ? liabilitiesBreakdownRaw.map(l => ({ name: l.name, value: l.value || l.amount || 0 }))
    : [
        { name: 'Current Liabilities', value: bsData.current_liabilities || liabilitiesBreakdown.current_liabilities || 0 },
        { name: 'Long-term Liabilities', value: bsData.long_term_liabilities || liabilitiesBreakdown.long_term_liabilities || 0 }
      ];

  // Balance Sheet comparison
  const bsComparison = [
    { name: 'Assets', value: balanceSheet.total_assets || 0 },
    { name: 'Liabilities', value: balanceSheet.total_liabilities || 0 },
    { name: 'Equity', value: balanceSheet.total_equity || 0 }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Balance Sheet</h2>
          <p className="text-gray-600 mt-1">Assets, Liabilities & Equity Analysis</p>
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
            onClick={loadBSData}
            className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 flex items-center gap-2"
          >
            <FiRefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Balance Sheet Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Total Assets</p>
            <FiLayers className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(balanceSheet.total_assets)}</p>
          <p className="text-sm opacity-75">All company assets</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Total Liabilities</p>
            <FiDollarSign className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(balanceSheet.total_liabilities)}</p>
          <p className="text-sm opacity-75">All debts & obligations</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Total Equity</p>
            <FiTrendingUp className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(balanceSheet.total_equity)}</p>
          <p className="text-sm opacity-75">Owner's equity</p>
        </div>
      </div>

      {/* Assets vs Liabilities Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Assets Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={assetsData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {assetsData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(val) => formatCurrency(val)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Liabilities Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={liabilitiesData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {liabilitiesData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(val) => formatCurrency(val)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Balance Sheet Structure */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Balance Sheet Structure</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={bsComparison}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={(val) => formatCurrency(val)} />
            <Tooltip formatter={(val) => formatCurrency(val)} />
            <Bar dataKey="value" fill="#db2777" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Assets Details</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Current Assets</span>
              <span className="text-sm font-bold text-blue-700">{formatCurrency(bsData.current_assets || assetsBreakdown.current_assets || 0)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Fixed Assets</span>
              <span className="text-sm font-bold text-blue-700">{formatCurrency(bsData.fixed_assets || assetsBreakdown.fixed_assets || 0)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Investments</span>
              <span className="text-sm font-bold text-blue-700">{formatCurrency(bsData.total_assets * 0.1 || assetsBreakdown.investments || 0)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Liabilities Details</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Current Liabilities</span>
              <span className="text-sm font-bold text-red-700">{formatCurrency(liabilitiesBreakdown.current_liabilities)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Long-term Liabilities</span>
              <span className="text-sm font-bold text-red-700">{formatCurrency(liabilitiesBreakdown.long_term_liabilities)}</span>
            </div>
            {liabilitiesBreakdown.equity_components && liabilitiesBreakdown.equity_components.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-semibold text-gray-700 mb-2">Equity Components</p>
                {liabilitiesBreakdown.equity_components.map((eq, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-green-50 rounded-lg mb-2">
                    <span className="text-sm text-gray-700">{eq.name}</span>
                    <span className="text-sm font-bold text-green-700">{formatCurrency(eq.amount)}</span>
          </div>
                ))}
          </div>
            )}
          </div>
        </div>
      </div>

      {/* Financial Position Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Working Capital</h4>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(balanceSheet.working_capital)}</p>
          <p className="text-sm text-gray-600 mt-1">Current Assets - Current Liabilities</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-red-500">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Debt to Equity Ratio</h4>
          <p className="text-3xl font-bold text-gray-900">{financialPosition.debt_to_equity?.toFixed(2) || '0.00'}</p>
          <p className="text-sm text-gray-600 mt-1">Financial leverage indicator</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Equity Ratio</h4>
          <p className="text-3xl font-bold text-gray-900">{financialPosition.equity_ratio?.toFixed(1) || '0.0'}%</p>
          <p className="text-sm text-gray-600 mt-1">Equity / Total Assets</p>
        </div>
      </div>
    </div>
  );
};

export default BalanceSheetDashboard;
