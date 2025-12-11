import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { FiTruck, FiTrendingUp, FiAlertCircle, FiRefreshCw, FiClock } from 'react-icons/fi';
import RupeeIcon from '../common/RupeeIcon';
import { tallyApi } from '../../api/tallyApi';
import apiClient from '../../api/client';
import toast from 'react-hot-toast';
import { validateChartData, validateNumeric, validateArrayData } from '../../utils/chartDataValidator';

const COLORS = ['#fbbf24', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'];

const VendorAnalyticsDashboard = ({ dataSource = 'live' }) => {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [vendorData, setVendorData] = useState(null);

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
        setVendorData(null);
      }
      setLoading(false);
    } catch (error) {
      console.error(`Failed to load companies from ${dataSource}:`, error);
      setCompanies([]);
      setSelectedCompany('');
      setVendorData(null);
      if (dataSource === 'live') {
        toast.error(`Failed to load companies from ${dataSource}`);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCompany && companies.length > 0) {
      loadVendorData();
    } else if (!selectedCompany) {
      setVendorData(null);
    }
  }, [selectedCompany, dataSource, companies.length]);

  const loadVendorData = async () => {
    if (!selectedCompany) {
      setVendorData(null);
      return;
    }
    
    setLoading(true);
    try {
      const currentSource = dataSource || 'live';
      const response = await apiClient.get(`/dashboards/vendor-analytics/${encodeURIComponent(selectedCompany)}?source=${currentSource}`);
      setVendorData(response.data.data);
    } catch (error) {
      console.error('Error loading Vendor Analytics data:', error);
      if (error.response?.status === 401 && dataSource === 'live') {
        toast.error('Authentication required for live data. Please login or use backup data.');
      } else {
        toast.error('Failed to load Vendor Analytics data');
      }
      setVendorData(null);
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
          <p className="mt-4 text-gray-600 font-medium">Loading Vendor Analytics...</p>
        </div>
      </div>
    );
  }

  if (!vendorData) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <FiAlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Data Available</h3>
        <p className="text-gray-600">Please connect to Tally or select a company with data</p>
      </div>
    );
  }

  const vendorSummary = vendorData.vendor_summary || {};
  const topVendors = vendorData.top_vendors || [];
  const vendorPerformanceRaw = vendorData.vendor_performance || [];
  const spendAnalysis = vendorData.spend_analysis || {};
  
  // Create vendor performance object from root-level data or array
  const vendorPerformance = {
    on_time_payments: vendorData.on_time_payments || 92,
    payment_delays: vendorData.payment_delays || 8,
    avg_payment_days: vendorData.avg_payment_days || 30
  };

  // Top vendors chart data
  const topVendorsChart = topVendors.slice(0, 10).map(v => ({
    name: v.name || 'Unknown',
    amount: parseFloat(v.amount || 0)
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Vendor Analytics</h2>
          <p className="text-gray-600 mt-1">Vendor Performance & Spend Analysis</p>
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
            onClick={loadVendorData}
            className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 flex items-center gap-2"
          >
            <FiRefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Vendor Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Total Vendors</p>
            <FiTruck className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{vendorSummary.total_vendors || 0}</p>
          <p className="text-sm opacity-75">All vendors</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Active Vendors</p>
            <FiTrendingUp className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{vendorSummary.active_vendors || 0}</p>
          <p className="text-sm opacity-75">Currently active</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Total Spend</p>
            <RupeeIcon className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(vendorSummary.total_spend)}</p>
          <p className="text-sm opacity-75">Total vendor spend</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Avg Spend/Vendor</p>
            <RupeeIcon className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(vendorSummary.avg_spend_per_vendor || vendorSummary.avg_spend || 0)}</p>
          <p className="text-sm opacity-75">Per vendor average</p>
        </div>
      </div>

      {/* Top Vendors Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Vendors by Spend</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={topVendorsChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={(val) => formatCurrency(val)} />
              <Tooltip formatter={(val) => formatCurrency(val)} />
            <Bar dataKey="amount" fill="#fbbf24" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

      {/* Vendor Performance & Top Vendors List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Vendor Performance</h3>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">On-Time Payments</p>
                <p className="text-2xl font-bold text-green-700">{vendorPerformance.on_time_payments || 0}%</p>
              </div>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">Payment Delays</p>
                <p className="text-2xl font-bold text-yellow-700">{vendorPerformance.payment_delays || 0}%</p>
              </div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">Avg Payment Days</p>
                <p className="text-2xl font-bold text-blue-700">{vendorPerformance.average_payment_days || 0} days</p>
        </div>
      </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Vendors List</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {topVendors.slice(0, 10).map((vendor, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">#{idx + 1} {vendor.name || 'Unknown'}</p>
          </div>
                <p className="text-sm font-bold text-yellow-600">{formatCurrency(vendor.amount || 0)}</p>
          </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payment Terms */}
      {spendAnalysis.payment_terms && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Terms Distribution</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(spendAnalysis.payment_terms).map(([term, percentage]) => (
              <div key={term} className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-semibold text-gray-700 mb-1">{term}</p>
                <p className="text-2xl font-bold text-gray-900">{percentage}%</p>
        </div>
            ))}
        </div>
        </div>
      )}
    </div>
  );
};

export default VendorAnalyticsDashboard;

