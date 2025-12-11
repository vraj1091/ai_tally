import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { FiDollarSign, FiTrendingDown, FiAlertCircle, FiRefreshCw, FiClock, FiCheckCircle } from 'react-icons/fi';
import RupeeIcon from '../common/RupeeIcon';
import { tallyApi } from '../../api/tallyApi';
import toast from 'react-hot-toast';
import { validateChartData, validateNumeric, validateArrayData } from '../../utils/chartDataValidator';
import { fetchDashboardData } from '../../utils/dashboardHelper';

const COLORS = ['#ec4899', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6'];

const AccountsPayableDashboard = ({ dataSource = 'live' }) => {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [apData, setApData] = useState(null);

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
        setApData(null);
      }
      setLoading(false);
    } catch (error) {
      console.error(`Failed to load companies from ${dataSource}:`, error);
      setCompanies([]);
      setSelectedCompany('');
      setApData(null);
      if (dataSource === 'live') {
        toast.error(`Failed to load companies from ${dataSource}`);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCompany && companies.length > 0) {
      loadAPData();
    } else if (!selectedCompany) {
      setApData(null);
    }
  }, [selectedCompany, dataSource, companies.length]);

  const loadAPData = async () => {
    if (!selectedCompany) {
      setApData(null);
      return;
    }
    
    setLoading(true);
    try {
      const currentSource = dataSource || 'live';
      const response = await fetchDashboardData('accounts-payable', selectedCompany, currentSource);
      setApData(response.data.data);
    } catch (error) {
      console.error('Error loading Accounts Payable data:', error);
      if (error.response?.status === 401 && dataSource === 'live') {
        toast.error('Authentication required for live data. Please login or use backup data.');
      } else {
        toast.error('Failed to load Accounts Payable data');
      }
      setApData(null);
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
          <p className="mt-4 text-gray-600 font-medium">Loading Accounts Payable...</p>
        </div>
      </div>
    );
  }

  if (!apData) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <FiAlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Data Available</h3>
        <p className="text-gray-600">Please connect to Tally or select a company with data</p>
      </div>
    );
  }

  const apSummary = apData.ap_summary || {};
  const agingAnalysis = apData.aging_analysis || {};
  const topCreditors = apData.top_creditors || [];
  const paymentStatus = apData.payment_status || {};

  // Aging analysis data
  const agingData = [
    { name: 'Current', value: agingAnalysis.current || 0 },
    { name: '1-30 Days', value: agingAnalysis['1_30_days'] || 0 },
    { name: '31-60 Days', value: agingAnalysis['31_60_days'] || 0 },
    { name: '61-90 Days', value: agingAnalysis['61_90_days'] || 0 },
    { name: 'Over 90 Days', value: agingAnalysis.over_90_days || 0 }
  ];

  // Top creditors chart - handle both object and array formats
  const topCreditorsChart = topCreditors.slice(0, 10).map(c => {
    const creditorName = typeof c === 'object' ? (c.name || c.get?.('name') || 'Unknown') : String(c || 'Unknown');
    const creditorAmount = typeof c === 'object' ? (c.amount || c.value || c.balance || c.closing_balance || c.current_balance || 0) : 0;
    return {
      name: creditorName,
      amount: Math.abs(parseFloat(creditorAmount) || 0)
    };
  }).filter(c => c.amount > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Accounts Payable</h2>
          <p className="text-gray-600 mt-1">Vendor Payments & Payables Aging</p>
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
            onClick={loadAPData}
            className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 flex items-center gap-2"
          >
            <FiRefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* AP Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Total Payables</p>
            <RupeeIcon className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(apSummary.total_payables)}</p>
          <p className="text-sm opacity-75">Outstanding amount</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Outstanding Bills</p>
            <FiDollarSign className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{apSummary.outstanding_bills || 0}</p>
          <p className="text-sm opacity-75">Pending bills</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Avg Payment Days</p>
            <FiClock className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{apSummary.avg_payment_days || 0}</p>
          <p className="text-sm opacity-75">Days to pay</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Payment Rate</p>
            <FiCheckCircle className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{apSummary.payment_rate?.toFixed(1) || '0.0'}%</p>
          <p className="text-sm opacity-75">Payment efficiency</p>
        </div>
      </div>

      {/* Aging Analysis & Top Creditors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Aging Analysis</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={agingData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis tickFormatter={(val) => formatCurrency(val)} />
              <Tooltip formatter={(val) => formatCurrency(val)} />
              <Bar dataKey="value" fill="#ec4899" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Creditors</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topCreditorsChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={(val) => formatCurrency(val)} />
              <Tooltip formatter={(val) => formatCurrency(val)} />
              <Bar dataKey="amount" fill="#ef4444" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Payment Status */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
            <p className="text-sm font-semibold text-gray-700 mb-2">Paid</p>
            <p className="text-3xl font-bold text-green-700">{formatCurrency(paymentStatus.paid)}</p>
            <p className="text-sm text-gray-600 mt-1">Successfully paid</p>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
            <p className="text-sm font-semibold text-gray-700 mb-2">Pending</p>
            <p className="text-3xl font-bold text-yellow-700">{formatCurrency(paymentStatus.pending)}</p>
            <p className="text-sm text-gray-600 mt-1">Awaiting payment</p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
            <p className="text-sm font-semibold text-gray-700 mb-2">Overdue</p>
            <p className="text-3xl font-bold text-red-700">{formatCurrency(paymentStatus.overdue)}</p>
            <p className="text-sm text-gray-600 mt-1">Past due date</p>
          </div>
        </div>
      </div>

      {/* Top Creditors List */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Creditors List</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 text-sm font-semibold text-gray-700">Rank</th>
                <th className="text-left p-3 text-sm font-semibold text-gray-700">Vendor Name</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-700">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {topCreditors.slice(0, 10).map((creditor, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="p-3 text-sm text-gray-600">#{idx + 1}</td>
                  <td className="p-3 text-sm font-medium text-gray-900">{creditor.name || 'Unknown'}</td>
                  <td className="p-3 text-sm font-bold text-pink-600 text-right">
                    {formatCurrency(parseFloat(creditor.outstanding || creditor.payable || creditor.amount || creditor.spend || creditor.balance || creditor.closing_balance || 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AccountsPayableDashboard;
