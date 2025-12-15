import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { FiTruck, FiTrendingUp, FiAlertCircle, FiRefreshCw, FiClock } from 'react-icons/fi';
import RupeeIcon from '../common/RupeeIcon';
import { tallyApi } from '../../api/tallyApi';
import { fetchDashboardData } from '../../utils/dashboardHelper';
import toast from 'react-hot-toast';
import { validateChartData, validateNumeric, validateArrayData } from '../../utils/chartDataValidator';
import CustomTooltip from '../common/CustomTooltip';
import { hasRealData } from '../../utils/dataValidator';
import EmptyDataState from '../common/EmptyDataState';

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'];

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
      const response = await fetchDashboardData('vendor-analytics', selectedCompany, currentSource);
      console.log('Vendor Analytics response:', response);
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
          <div className="w-16 h-16 rounded-full border-4 animate-spin mx-auto" style={{ borderColor: 'var(--border-color)', borderTopColor: '#f59e0b' }} />
          <p className="mt-4 font-medium" style={{ color: 'var(--text-secondary)' }}>Loading Vendor Analytics...</p>
        </div>
      </div>
    );
  }

  // Check if we have real data
  if (!vendorData || !hasRealData(vendorData, ['total_vendors', 'vendor_count', 'total_spend', 'total_purchases'])) {
    return (
      <EmptyDataState 
        title="No Vendor Analytics Data"
        message="Connect to Tally or upload a backup file to view vendor analytics"
        onRefresh={loadVendorData}
        dataSource={dataSource}
      />
    );
  }

  const vendorSummary = vendorData.vendor_summary || {};
  const topVendors = vendorData.top_vendors || [];
  const vendorPerformanceRaw = vendorData.vendor_performance || [];
  const spendAnalysis = vendorData.spend_analysis || {};
  
  // Create vendor performance object from root-level data or array
  const vendorPerformance = {
    on_time_payments: vendorData.on_time_payments || 0,
    payment_delays: vendorData.payment_delays || 0,
    average_payment_days: vendorData.average_payment_days || vendorData.avg_payment_days || 0
  };

  // Top vendors chart data
  const topVendorsChart = topVendors.slice(0, 10).map(v => ({
    name: v.name || 'Unknown',
    amount: parseFloat(v.amount || 0)
  }));

  return (
    <div className="space-y-6 p-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Vendor Analytics</h2>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Vendor Performance & Spend Analysis</p>
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
            onClick={loadVendorData}
            className="btn-primary flex items-center gap-2 px-4 py-2"
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Vendor Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6 text-white" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', border: 'none' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Total Vendors</p>
            <FiTruck className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{vendorSummary.total_vendors || 0}</p>
          <p className="text-sm opacity-75">All vendors</p>
        </div>

        <div className="card p-6 text-white" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', border: 'none' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Active Vendors</p>
            <FiTrendingUp className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{vendorSummary.active_vendors || 0}</p>
          <p className="text-sm opacity-75">Currently active</p>
        </div>

        <div className="card p-6 text-white" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Total Spend</p>
            <RupeeIcon className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(vendorSummary.total_spend)}</p>
          <p className="text-sm opacity-75">Total vendor spend</p>
        </div>

        <div className="card p-6 text-white" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', border: 'none' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Avg Spend/Vendor</p>
            <RupeeIcon className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(vendorSummary.avg_spend_per_vendor || vendorSummary.avg_spend || 0)}</p>
          <p className="text-sm opacity-75">Per vendor average</p>
        </div>
      </div>

      {/* Top Vendors Chart */}
      <div className="card p-6">
        <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Top 10 Vendors by Spend</h3>
        {topVendorsChart && topVendorsChart.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={topVendorsChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
              <YAxis tickFormatter={(val) => formatCurrency(val)} tick={{ fill: 'var(--text-secondary)' }} />
              <Tooltip content={<CustomTooltip formatCurrency={formatCurrency} formatPercent={formatPercent} />} />
              <Bar dataKey="amount" fill="#f59e0b" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[350px] flex items-center justify-center">
            <p style={{ color: 'var(--text-muted)' }}>No vendor data available</p>
          </div>
        )}
      </div>

      {/* Vendor Performance & Top Vendors List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Vendor Performance</h3>
          <div className="space-y-4">
            <div className="p-4 rounded-lg" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>On-Time Payments</p>
                <p className="text-3xl font-bold" style={{ color: '#10b981' }}>{formatPercent(vendorPerformance.on_time_payments)}</p>
              </div>
            </div>
            <div className="p-4 rounded-lg" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Payment Delays</p>
                <p className="text-3xl font-bold" style={{ color: '#f59e0b' }}>{formatPercent(vendorPerformance.payment_delays)}</p>
              </div>
            </div>
            <div className="p-4 rounded-lg" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Avg Payment Days</p>
                <p className="text-3xl font-bold" style={{ color: '#3b82f6' }}>{vendorPerformance.average_payment_days || 0} days</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Top Vendors List</h3>
          {topVendors && topVendors.length > 0 ? (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {topVendors.slice(0, 10).map((vendor, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>#{idx + 1} {vendor.name || 'Unknown'}</p>
                  </div>
                  <p className="text-sm font-bold" style={{ color: '#f59e0b' }}>{formatCurrency(vendor.amount || 0)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-60 flex items-center justify-center">
              <p style={{ color: 'var(--text-muted)' }}>No vendor list available</p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Terms */}
      {spendAnalysis.payment_terms && (
        <div className="card p-6">
          <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Payment Terms Distribution</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(spendAnalysis.payment_terms).map(([term, percentage]) => (
              <div key={term} className="p-4 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{term}</p>
                <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{percentage}%</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Source Info */}
      <div className="card p-4" style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(217, 119, 6, 0.05) 100%)' }}>
        <div className="flex items-center gap-3">
          <FiAlertCircle className="w-5 h-5" style={{ color: '#f59e0b' }} />
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Data Source: <span className="font-bold">{dataSource.toUpperCase()}</span>
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Showing vendor data from {dataSource} source
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorAnalyticsDashboard;
