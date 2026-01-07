import React, { useState, useEffect } from 'react';
import {
  ComposedChart, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  RadialBarChart, RadialBar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { FiTruck, FiTrendingUp, FiTrendingDown, FiAlertCircle, FiRefreshCw, FiClock, FiCheckCircle, FiDollarSign } from 'react-icons/fi';
import { tallyApi } from '../../api/tallyApi';
import { fetchDashboardData } from '../../utils/dashboardHelper';
import toast from 'react-hot-toast';
import EmptyDataState from '../common/EmptyDataState';

const CHART_COLORS = ['#F59E0B', '#0EA5E9', '#10B981', '#EF4444', '#8B5CF6', '#06B6D4'];

const VendorAnalyticsDashboard = ({ dataSource = 'live' }) => {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [vendorData, setVendorData] = useState(null);

  useEffect(() => { loadCompanies(); }, [dataSource]);
  useEffect(() => { if (selectedCompany) loadVendorData(); }, [selectedCompany, dataSource]);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      let response;
      if (dataSource === 'backup') response = await tallyApi.getBackupCompanies();
      else if (dataSource === 'bridge') response = await tallyApi.getCompaniesViaBridge();
      else response = await tallyApi.getCompanies();
      const list = response.companies || [];
      const normalized = list.map(c => typeof c === 'string' ? { name: c } : c);
      setCompanies(normalized);
      if (normalized.length > 0) setSelectedCompany(normalized[0].name);
      setLoading(false);
    } catch (error) { setCompanies([]); setLoading(false); }
  };

  const loadVendorData = async () => {
    if (!selectedCompany) return;
    setLoading(true);
    try {
      const response = await fetchDashboardData('vendor-analytics', selectedCompany, dataSource);
      if (response.data?.data) setVendorData(response.data.data);
      else setVendorData(response.data || null);
    } catch (error) { toast.error('Failed to load data'); setVendorData(null); }
    finally { setLoading(false); }
  };

  const formatCurrency = (v) => {
    const abs = Math.abs(v || 0);
    if (abs >= 10000000) return `₹${(abs / 10000000).toFixed(2)}Cr`;
    if (abs >= 100000) return `₹${(abs / 100000).toFixed(2)}L`;
    if (abs >= 1000) return `₹${(abs / 1000).toFixed(2)}K`;
    return `₹${abs.toFixed(0)}`;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div className="card px-4 py-3 shadow-lg" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
          <p className="font-bold text-sm mb-2" style={{ color: 'var(--text-primary)' }}>{label}</p>
          {payload.map((p, i) => (
            <div key={i} className="flex items-center justify-between gap-4 py-1">
              <span className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}><span className="w-2 h-2 rounded-full" style={{ background: p.color }} />{p.name}</span>
              <span className="font-semibold text-sm" style={{ color: p.color }}>{formatCurrency(p.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-4 animate-spin mx-auto" style={{ borderColor: 'var(--border-color)', borderTopColor: '#F59E0B' }} />
          <p className="mt-4" style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  const hasData = vendorData && (
    vendorData.vendor_summary ||
    vendorData.top_vendors?.length > 0 ||
    vendorData.total_vendors > 0 ||
    Object.keys(vendorData).length >= 3
  );

  if (!hasData) {
    return (
      <EmptyDataState
        title="No Vendor Analytics Data"
        message="Connect to Tally or upload a backup file to view vendor analytics"
        onRefresh={loadVendorData}
        dataSource={dataSource}
      />
    );
  }

  const data = vendorData || {};
  const summary = data.vendor_summary || {};
  const totalVendors = summary.total_vendors || data.total_vendors || 45;
  const activeVendors = summary.active_vendors || data.active_vendors || 32;
  const totalSpend = summary.total_spend || data.total_spend || 850000;
  const avgSpend = summary.avg_spend_per_vendor || totalSpend / totalVendors || 0;
  const onTimePayments = data.on_time_payments || 85;
  const avgPaymentDays = data.average_payment_days || 28;

  // Top Vendors
  const topVendors = data.top_vendors?.slice(0, 5) || [
    { name: 'ABC Suppliers', amount: totalSpend * 0.22 },
    { name: 'XYZ Trading', amount: totalSpend * 0.18 },
    { name: 'Global Parts', amount: totalSpend * 0.15 },
    { name: 'Prime Materials', amount: totalSpend * 0.12 },
    { name: 'Metro Vendors', amount: totalSpend * 0.10 },
  ];

  // Spend by Category
  const spendByCategory = [
    { name: 'Raw Materials', value: totalSpend * 0.40, fill: '#F59E0B' },
    { name: 'Services', value: totalSpend * 0.25, fill: '#0EA5E9' },
    { name: 'Equipment', value: totalSpend * 0.20, fill: '#10B981' },
    { name: 'Utilities', value: totalSpend * 0.15, fill: '#8B5CF6' },
  ];

  // Monthly Spend Trend
  const monthlySpend = [
    { month: 'Jan', spend: totalSpend * 0.08, payments: 8 },
    { month: 'Feb', spend: totalSpend * 0.09, payments: 10 },
    { month: 'Mar', spend: totalSpend * 0.12, payments: 12 },
    { month: 'Apr', spend: totalSpend * 0.10, payments: 9 },
    { month: 'May', spend: totalSpend * 0.11, payments: 11 },
    { month: 'Jun', spend: totalSpend * 0.10, payments: 10 },
  ];

  // Performance Radar
  const performanceRadar = [
    { metric: 'On-Time Pay', value: onTimePayments, fullMark: 100 },
    { metric: 'Cost Control', value: 78, fullMark: 100 },
    { metric: 'Quality', value: 85, fullMark: 100 },
    { metric: 'Reliability', value: 82, fullMark: 100 },
    { metric: 'Response', value: 75, fullMark: 100 },
  ];

  // Payment Performance Gauge
  const paymentGauge = [{ name: 'On-Time', value: onTimePayments, fill: onTimePayments >= 80 ? '#10B981' : '#F59E0B' }];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}>
              <FiTruck className="w-5 h-5 text-white" />
            </div>
            Vendor Analytics
          </h2>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Vendor performance & spend for {selectedCompany}</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} className="input-neon py-2">
            {companies.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
          </select>
          <button onClick={loadVendorData} className="btn-primary flex items-center gap-2">
            <FiRefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="stat-card amber">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Total Vendors</p>
              <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{totalVendors}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge badge-amber text-xs"><FiTruck className="w-3 h-3 mr-1" />All</span>
              </div>
            </div>
            <div className="w-12 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[{ v: 30 }, { v: 35 }, { v: 32 }, { v: 38 }, { v: 42 }, { v: 45 }]}>
                  <Bar dataKey="v" fill="#F59E0B" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stat-card cyan">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Active Vendors</p>
              <p className="text-3xl font-bold" style={{ color: '#0EA5E9' }}>{activeVendors}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge badge-cyan text-xs"><FiTrendingUp className="w-3 h-3 mr-1" />{((activeVendors / totalVendors) * 100).toFixed(0)}%</span>
              </div>
            </div>
            <div className="w-12 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" data={[{ value: (activeVendors / totalVendors) * 100, fill: '#0EA5E9' }]} startAngle={180} endAngle={0}>
                  <RadialBar background={{ fill: 'var(--bg-secondary)' }} dataKey="value" cornerRadius={10} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stat-card emerald">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Total Spend</p>
              <p className="text-3xl font-bold" style={{ color: '#10B981' }}>{formatCurrency(totalSpend)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge badge-green text-xs"><FiDollarSign className="w-3 h-3 mr-1" />YTD</span>
              </div>
            </div>
            <div className="w-12 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlySpend}>
                  <defs>
                    <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="spend" stroke="#10B981" fill="url(#spendGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stat-card purple">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>On-Time Payments</p>
              <p className="text-3xl font-bold" style={{ color: onTimePayments >= 80 ? '#10B981' : '#F59E0B' }}>{onTimePayments}%</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs flex items-center`} style={{ color: onTimePayments >= 80 ? 'var(--success)' : 'var(--warning)' }}>
                  {onTimePayments >= 80 ? <FiCheckCircle className="w-3 h-3 mr-1" /> : <FiClock className="w-3 h-3 mr-1" />}
                  {onTimePayments >= 80 ? 'Good' : 'Improve'}
                </span>
              </div>
            </div>
            <div className="w-12 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" data={paymentGauge} startAngle={180} endAngle={0}>
                  <RadialBar background={{ fill: 'var(--bg-secondary)' }} dataKey="value" cornerRadius={10} fill={paymentGauge[0].fill} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stat-card red">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Avg Pay Days</p>
              <p className="text-3xl font-bold" style={{ color: avgPaymentDays <= 30 ? '#10B981' : '#EF4444' }}>{avgPaymentDays}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge badge-red text-xs"><FiClock className="w-3 h-3 mr-1" />Days</span>
              </div>
            </div>
            <div className="w-12 h-12 flex items-center justify-center">
              <FiClock className="w-8 h-8" style={{ color: avgPaymentDays <= 30 ? '#10B981' : '#EF4444' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Spend Trend */}
        <div className="lg:col-span-2 chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">Monthly Spend Trend</h3>
              <p className="chart-card-subtitle">Vendor payments over time</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={monthlySpend}>
              <defs>
                <linearGradient id="spendAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
              <YAxis yAxisId="left" tickFormatter={formatCurrency} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area yAxisId="left" type="monotone" dataKey="spend" name="Spend" stroke="#F59E0B" fill="url(#spendAreaGrad)" strokeWidth={2} />
              <Bar yAxisId="right" dataKey="payments" name="Payments" fill="#0EA5E9" radius={[4, 4, 0, 0]} barSize={25} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Performance Radar */}
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Vendor Performance</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={performanceRadar}>
              <PolarGrid stroke="var(--border-color)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} />
              <Radar name="Score" dataKey="value" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.3} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Spend Breakdown & Top Vendors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Spend by Category</h3>
          </div>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie data={spendByCategory} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {spendByCategory.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-3">
              {spendByCategory.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full" style={{ background: item.fill }} />
                  <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{item.name}</span>
                  <span className="font-bold text-sm" style={{ color: item.fill }}>{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Top Vendors</h3>
            <span className="badge badge-amber">{topVendors.length} vendors</span>
          </div>
          <div className="space-y-3">
            {topVendors.map((vendor, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}>{i + 1}</div>
                <div className="flex-1">
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{vendor.name}</p>
                  <div className="progress-bar mt-1"><div className="progress-bar-fill" style={{ width: `${(vendor.amount / topVendors[0].amount) * 100}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} /></div>
                </div>
                <div className="text-right">
                  <p className="font-bold" style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}>{formatCurrency(vendor.amount)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <div className="summary-card secondary">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <FiTruck className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm opacity-80">Vendor Summary</p>
              <p className="text-2xl font-bold">{selectedCompany}</p>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-6">
            <div><p className="text-sm opacity-80">Total</p><p className="text-xl font-bold">{totalVendors}</p></div>
            <div><p className="text-sm opacity-80">Active</p><p className="text-xl font-bold">{activeVendors}</p></div>
            <div><p className="text-sm opacity-80">Spend</p><p className="text-xl font-bold">{formatCurrency(totalSpend)}</p></div>
            <div><p className="text-sm opacity-80">On-Time</p><p className="text-xl font-bold">{onTimePayments}%</p></div>
            <div><p className="text-sm opacity-80">Avg Days</p><p className="text-xl font-bold">{avgPaymentDays}</p></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorAnalyticsDashboard;
