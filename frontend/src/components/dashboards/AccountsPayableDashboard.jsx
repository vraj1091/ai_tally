import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { FiDollarSign, FiCheckCircle, FiAlertCircle, FiRefreshCw, FiClock } from 'react-icons/fi';
import RupeeIcon from '../common/RupeeIcon';
import { tallyApi } from '../../api/tallyApi';
import { fetchDashboardData } from '../../utils/dashboardHelper';
import toast from 'react-hot-toast';
import { validateChartData, validateNumeric, validateArrayData } from '../../utils/chartDataValidator';
import CustomTooltip from '../common/CustomTooltip';

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
      console.log('Accounts Payable response:', response);
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
          <div className="w-16 h-16 rounded-full border-4 animate-spin mx-auto" style={{ borderColor: 'var(--border-color)', borderTopColor: '#ec4899' }} />
          <p className="mt-4 font-medium" style={{ color: 'var(--text-secondary)' }}>Loading Accounts Payable...</p>
        </div>
      </div>
    );
  }

  if (!apData) {
    return (
      <div className="card p-12 text-center">
        <FiAlertCircle className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
        <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>No Data Available</h3>
        <p style={{ color: 'var(--text-muted)' }}>Please connect to Tally or select a company with data</p>
        <button onClick={loadAPData} className="btn-primary mt-4 px-6 py-2 flex items-center gap-2 mx-auto">
          <FiRefreshCw className="w-4 h-4" />
          Retry
        </button>
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
    <div className="space-y-6 p-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Accounts Payable</h2>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Vendor Payments & Payables Aging</p>
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
            onClick={loadAPData}
            className="btn-primary flex items-center gap-2 px-4 py-2"
            style={{ background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)' }}
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* AP Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6 text-white" style={{ background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)', border: 'none' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Total Payables</p>
            <RupeeIcon className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(apSummary.total_payables)}</p>
          <p className="text-sm opacity-75">Outstanding amount</p>
        </div>

        <div className="card p-6 text-white" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', border: 'none' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Outstanding Bills</p>
            <FiDollarSign className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{apSummary.outstanding_bills || 0}</p>
          <p className="text-sm opacity-75">Pending bills</p>
        </div>

        <div className="card p-6 text-white" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', border: 'none' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Avg Payment Days</p>
            <FiClock className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{apSummary.avg_payment_days || 0}</p>
          <p className="text-sm opacity-75">Days to pay</p>
        </div>

        <div className="card p-6 text-white" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', border: 'none' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Payment Rate</p>
            <FiCheckCircle className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatPercent(apSummary.payment_rate || paymentStatus.payment_efficiency)}</p>
          <p className="text-sm opacity-75">Payment efficiency</p>
        </div>
      </div>

      {/* Payment Aging Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Payment Aging Analysis</h3>
          {agingData && agingData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={agingData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {agingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip formatCurrency={formatCurrency} formatPercent={formatPercent} />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[350px] flex items-center justify-center">
              <p style={{ color: 'var(--text-muted)' }}>No aging analysis data available</p>
            </div>
          )}
        </div>

        <div className="card p-6">
          <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Top 10 Creditors</h3>
          {topCreditorsChart && topCreditorsChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={topCreditorsChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                <YAxis tickFormatter={(val) => formatCurrency(val)} tick={{ fill: 'var(--text-secondary)' }} />
                <Tooltip content={<CustomTooltip formatCurrency={formatCurrency} formatPercent={formatPercent} />} />
                <Bar dataKey="amount" fill="#ef4444" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[350px] flex items-center justify-center">
              <p style={{ color: 'var(--text-muted)' }}>No creditor data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6" style={{ borderLeft: '4px solid #10b981' }}>
          <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>On Time Payments</h4>
          <p className="text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {formatPercent(paymentStatus.on_time_payments || 0)}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Payment punctuality</p>
        </div>
        <div className="card p-6" style={{ borderLeft: '4px solid #f59e0b' }}>
          <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Overdue Payments</h4>
          <p className="text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {formatPercent(paymentStatus.overdue_payments || 0)}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Late payments</p>
        </div>
        <div className="card p-6" style={{ borderLeft: '4px solid #ec4899' }}>
          <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Payment Efficiency</h4>
          <p className="text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {formatPercent(paymentStatus.payment_efficiency || 0)}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Overall efficiency</p>
        </div>
      </div>

      {/* Data Source Info */}
      <div className="card p-4" style={{ background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.05) 0%, rgba(219, 39, 119, 0.05) 100%)' }}>
        <div className="flex items-center gap-3">
          <FiAlertCircle className="w-5 h-5" style={{ color: '#ec4899' }} />
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Data Source: <span className="font-bold">{dataSource.toUpperCase()}</span>
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Showing payables data from {dataSource} source
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountsPayableDashboard;
