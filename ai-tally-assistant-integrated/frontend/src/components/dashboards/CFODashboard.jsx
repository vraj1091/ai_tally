import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { FiTrendingUp, FiAlertCircle, FiRefreshCw, FiActivity } from 'react-icons/fi';
import RupeeIcon from '../common/RupeeIcon';
import { tallyApi } from '../../api/tallyApi';
import apiClient from '../../api/client';
import toast from 'react-hot-toast';
import { validateChartData, validateNumeric } from '../../utils/chartDataValidator';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const CFODashboard = ({ dataSource = 'live' }) => {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [cfoData, setCfoData] = useState(null);

  useEffect(() => {
    loadCompanies();
  }, [dataSource]);

  useEffect(() => {
    if (selectedCompany) {
      loadCFOData();
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
      const companyList = response.companies || [];
      setCompanies(companyList);
      if (companyList.length > 0) {
        setSelectedCompany(companyList[0].name);
      } else {
        setSelectedCompany('');
        setCfoData(null);
      }
      setLoading(false);
    } catch (error) {
      console.error(`Failed to load companies from ${dataSource}:`, error);
      setCompanies([]);
      setSelectedCompany('');
      setCfoData(null);
      if (dataSource === 'live') {
        toast.error(`Failed to load companies from ${dataSource}`);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCompany && companies.length > 0) {
      loadCFOData();
    } else if (!selectedCompany) {
      setCfoData(null);
    }
  }, [selectedCompany, dataSource, companies.length]);

  const loadCFOData = async () => {
    if (!selectedCompany) {
      setCfoData(null);
      return;
    }
    
    setLoading(true);
    try {
      const currentSource = dataSource || 'live';
      const response = await apiClient.get(`/dashboards/cfo/${encodeURIComponent(selectedCompany)}?source=${currentSource}`);
      setCfoData(response.data.data);
    } catch (error) {
      console.error('Error loading CFO data:', error);
      if (error.response?.status === 401 && dataSource === 'live') {
        toast.error('Authentication required for live data. Please login or use backup data.');
      } else {
        toast.error('Failed to load CFO dashboard data');
      }
      setCfoData(null);
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
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading CFO Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!cfoData) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <FiAlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Financial Data Available</h3>
        <p className="text-gray-600">Please connect to Tally or select a company with data</p>
      </div>
    );
  }

  const finPosition = cfoData.financial_position || {};
  const ratios = cfoData.financial_ratios || {};
  const profitability = cfoData.profitability || {};
  const costAnalysis = cfoData.cost_analysis || {};

  // Prepare radar chart data for financial ratios with validation
  const radarData = validateChartData([
    { metric: 'Current Ratio', value: validateNumeric(ratios.current_ratio, 0) * 20, fullMark: 100 },
    { metric: 'Quick Ratio', value: validateNumeric(ratios.quick_ratio, 0) * 30, fullMark: 100 },
    { metric: 'ROE', value: validateNumeric(ratios.return_on_equity, 0), fullMark: 100 },
    { metric: 'ROA', value: validateNumeric(ratios.return_on_assets, 0), fullMark: 100 },
    { metric: 'Asset Turn', value: validateNumeric(ratios.asset_turnover, 0) * 40, fullMark: 100 }
  ], 'value', 'metric');

  // Prepare profitability chart data with validation
  const profitabilityData = validateChartData([
    { name: 'Gross Profit', value: validateNumeric(profitability.gross_profit, 0) },
    { name: 'Operating Profit', value: validateNumeric(profitability.operating_profit, 0) },
    { name: 'Net Profit', value: validateNumeric(profitability.net_profit, 0) },
    { name: 'EBITDA', value: validateNumeric(profitability.ebitda, 0) }
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">CFO Dashboard</h2>
          <p className="text-gray-600 mt-1">Financial Health & Performance Ratios</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            {companies.map((company, idx) => (
              <option key={idx} value={company.name}>{company.name}</option>
            ))}
          </select>
          <button
            onClick={loadCFOData}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <FiRefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Financial Position Cards - UNIQUE TO CFO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Total Assets</p>
            <RupeeIcon className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(finPosition.total_assets)}</p>
          <p className="text-sm opacity-75">Financial strength</p>
        </div>

        <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Total Liabilities</p>
            <RupeeIcon className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(finPosition.total_liabilities)}</p>
          <p className="text-sm opacity-75">Obligations</p>
        </div>

        <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Total Equity</p>
            <RupeeIcon className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(finPosition.equity)}</p>
          <p className="text-sm opacity-75">Net worth</p>
        </div>
      </div>

      {/* Financial Ratios Grid - UNIQUE TO CFO */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Ratios</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
            <p className="text-xs text-gray-600 mb-1">Current Ratio</p>
            <p className="text-3xl font-bold text-blue-700">{(ratios.current_ratio || 0).toFixed(2)}</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
            <p className="text-xs text-gray-600 mb-1">Quick Ratio</p>
            <p className="text-3xl font-bold text-green-700">{(ratios.quick_ratio || 0).toFixed(2)}</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
            <p className="text-xs text-gray-600 mb-1">Debt to Equity</p>
            <p className="text-3xl font-bold text-purple-700">{(ratios.debt_to_equity || 0).toFixed(2)}</p>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
            <p className="text-xs text-gray-600 mb-1">ROA (%)</p>
            <p className="text-3xl font-bold text-orange-700">{(ratios.return_on_assets || 0).toFixed(1)}%</p>
          </div>
          <div className="text-center p-4 bg-pink-50 rounded-lg border-2 border-pink-200">
            <p className="text-xs text-gray-600 mb-1">ROE (%)</p>
            <p className="text-3xl font-bold text-pink-700">{(ratios.return_on_equity || 0).toFixed(1)}%</p>
          </div>
          <div className="text-center p-4 bg-indigo-50 rounded-lg border-2 border-indigo-200">
            <p className="text-xs text-gray-600 mb-1">Asset Turnover</p>
            <p className="text-3xl font-bold text-indigo-700">{(ratios.asset_turnover || 0).toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Ratios Radar Chart - UNIQUE TO CFO */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Health Radar</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Radar name="Financial Metrics" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Profitability Breakdown - UNIQUE TO CFO */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Profitability Analysis</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={profitabilityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={80} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => formatCurrency(Math.abs(val))} />
              <Tooltip formatter={(val) => formatCurrency(Math.abs(val))} />
              <Bar dataKey="value" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cost Analysis - UNIQUE TO CFO */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Structure Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Fixed Costs</p>
            <p className="text-2xl font-bold text-red-700">{formatCurrency(costAnalysis.fixed_costs)}</p>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Variable Costs</p>
            <p className="text-2xl font-bold text-orange-700">{formatCurrency(costAnalysis.variable_costs)}</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Cost of Goods Sold</p>
            <p className="text-2xl font-bold text-yellow-700">{formatCurrency(costAnalysis.cost_of_goods_sold)}</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Operating Expenses</p>
            <p className="text-2xl font-bold text-blue-700">{formatCurrency(costAnalysis.operating_expenses)}</p>
          </div>
        </div>
      </div>

      {/* Working Capital & Liquidity - UNIQUE TO CFO */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Working Capital & Liquidity</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-2">Working Capital</p>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(finPosition.working_capital)}</p>
            <p className="text-sm text-gray-500 mt-1">Current Assets - Current Liabilities</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Cash Reserves</p>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(finPosition.cash_reserves)}</p>
            <p className="text-sm text-gray-500 mt-1">Available liquid assets</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Liquidity Status</p>
            <div className="flex items-center gap-2 mt-2">
              {ratios.current_ratio >= 1.5 ? (
                <>
                  <FiTrendingUp className="w-6 h-6 text-green-600" />
                  <p className="text-2xl font-bold text-green-600">Healthy</p>
                </>
              ) : (
                <>
                  <FiAlertCircle className="w-6 h-6 text-yellow-600" />
                  <p className="text-2xl font-bold text-yellow-600">Monitor</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CFODashboard;
