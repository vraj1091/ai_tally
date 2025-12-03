import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { FiDollarSign, FiTrendingUp, FiAlertCircle, FiRefreshCw, FiClock, FiCheckCircle } from 'react-icons/fi';
import RupeeIcon from '../common/RupeeIcon';
import { tallyApi } from '../../api/tallyApi';
import apiClient from '../../api/client';
import toast from 'react-hot-toast';
import { validateChartData, validateNumeric, validateArrayData } from '../../utils/chartDataValidator';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

const AccountsReceivableDashboard = ({ dataSource = 'live' }) => {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [arData, setArData] = useState(null);

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
        setArData(null);
      }
      setLoading(false);
    } catch (error) {
      console.error(`Failed to load companies from ${dataSource}:`, error);
      setCompanies([]);
      setSelectedCompany('');
      setArData(null);
      if (dataSource === 'live') {
        toast.error(`Failed to load companies from ${dataSource}`);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCompany && companies.length > 0) {
      loadARData();
    } else if (!selectedCompany) {
      setArData(null);
    }
  }, [selectedCompany, dataSource, companies.length]);

  const loadARData = async () => {
    if (!selectedCompany) {
      setArData(null);
      return;
    }
    
    setLoading(true);
    try {
      const currentSource = dataSource || 'live';
      const response = await apiClient.get(`/dashboards/accounts-receivable/${encodeURIComponent(selectedCompany)}?source=${currentSource}`);
      setArData(response.data.data);
    } catch (error) {
      console.error('Error loading Accounts Receivable data:', error);
      if (error.response?.status === 401 && dataSource === 'live') {
        toast.error('Authentication required for live data. Please login or use backup data.');
      } else {
        toast.error('Failed to load Accounts Receivable data');
      }
      setArData(null);
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
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading Accounts Receivable...</p>
        </div>
      </div>
    );
  }

  if (!arData) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <FiAlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Data Available</h3>
        <p className="text-gray-600">Please connect to Tally or select a company with data</p>
      </div>
    );
  }

  const arSummary = arData.ar_summary || {};
  const agingAnalysis = arData.aging_analysis || {};
  const topDebtors = arData.top_debtors || [];
  const collectionStatus = arData.collection_status || {};

  // Aging analysis data
  const agingData = [
    { name: 'Current', value: agingAnalysis.current || 0 },
    { name: '1-30 Days', value: agingAnalysis['1_30_days'] || 0 },
    { name: '31-60 Days', value: agingAnalysis['31_60_days'] || 0 },
    { name: '61-90 Days', value: agingAnalysis['61_90_days'] || 0 },
    { name: 'Over 90 Days', value: agingAnalysis.over_90_days || 0 }
  ];

  // Top debtors chart - handle both object and array formats
  const topDebtorsChart = topDebtors.slice(0, 10).map(d => {
    const debtorName = typeof d === 'object' ? (d.name || d.get?.('name') || 'Unknown') : String(d || 'Unknown');
    const debtorAmount = typeof d === 'object' ? (d.amount || d.value || d.balance || d.closing_balance || d.current_balance || 0) : 0;
    return {
      name: debtorName,
      amount: Math.abs(parseFloat(debtorAmount) || 0)
    };
  }).filter(d => d.amount > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Accounts Receivable</h2>
          <p className="text-gray-600 mt-1">Customer Payments & Collection Status</p>
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
            onClick={loadARData}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
          >
            <FiRefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* AR Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Total Receivables</p>
            <RupeeIcon className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(arSummary.total_receivables)}</p>
          <p className="text-sm opacity-75">Outstanding amount</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Outstanding Invoices</p>
            <RupeeIcon className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{arSummary.outstanding_invoices || 0}</p>
          <p className="text-sm opacity-75">Pending invoices</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Avg Collection Days</p>
            <FiClock className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{arSummary.avg_collection_days || 0}</p>
          <p className="text-sm opacity-75">Days to collect</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Collection Rate</p>
            <FiCheckCircle className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{arSummary.collection_rate?.toFixed(1) || '0.0'}%</p>
          <p className="text-sm opacity-75">Collection efficiency</p>
        </div>
      </div>

      {/* Aging Analysis & Top Debtors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Aging Analysis</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={agingData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis tickFormatter={(val) => formatCurrency(val)} />
              <Tooltip formatter={(val) => formatCurrency(val)} />
              <Bar dataKey="value" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Debtors</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topDebtorsChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={(val) => formatCurrency(val)} />
              <Tooltip formatter={(val) => formatCurrency(val)} />
              <Bar dataKey="amount" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Collection Status */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Collection Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
            <p className="text-sm font-semibold text-gray-700 mb-2">Collected</p>
            <p className="text-3xl font-bold text-green-700">{formatCurrency(collectionStatus.collected)}</p>
            <p className="text-sm text-gray-600 mt-1">Successfully collected</p>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
            <p className="text-sm font-semibold text-gray-700 mb-2">Pending</p>
            <p className="text-3xl font-bold text-yellow-700">{formatCurrency(collectionStatus.pending)}</p>
            <p className="text-sm text-gray-600 mt-1">Awaiting collection</p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
            <p className="text-sm font-semibold text-gray-700 mb-2">Overdue</p>
            <p className="text-3xl font-bold text-red-700">{formatCurrency(collectionStatus.overdue)}</p>
            <p className="text-sm text-gray-600 mt-1">Past due date</p>
          </div>
        </div>
      </div>

      {/* Top Debtors List */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Debtors List</h3>
        {topDebtors && topDebtors.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 text-sm font-semibold text-gray-700">Rank</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-700">Customer Name</th>
                  <th className="text-right p-3 text-sm font-semibold text-gray-700">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {topDebtors.slice(0, 10).map((debtor, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-sm text-gray-600">#{idx + 1}</td>
                    <td className="p-3 text-sm font-medium text-gray-900">{debtor.name || 'Unknown'}</td>
                    <td className="p-3 text-sm font-bold text-green-600 text-right">
                      {formatCurrency(parseFloat(debtor.outstanding || debtor.amount || debtor.revenue || debtor.balance || debtor.closing_balance || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No debtor data available from Tally</p>
            <p className="text-sm text-gray-400 mt-2">Please ensure your Tally data contains Sundry Debtors</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountsReceivableDashboard;
