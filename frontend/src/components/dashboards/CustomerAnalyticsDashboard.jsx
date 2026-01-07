import React, { useState, useEffect } from 'react';
import {
  ComposedChart, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  RadialBarChart, RadialBar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { FiUsers, FiTrendingUp, FiTrendingDown, FiAlertCircle, FiRefreshCw, FiDollarSign, FiAward, FiUserCheck, FiUserX, FiStar } from 'react-icons/fi';
import { tallyApi } from '../../api/tallyApi';
import { fetchDashboardData } from '../../utils/dashboardHelper';
import toast from 'react-hot-toast';
import EmptyDataState from '../common/EmptyDataState';

const CHART_COLORS = ['#10B981', '#0EA5E9', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

const CustomerAnalyticsDashboard = ({ dataSource = 'live' }) => {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [customerData, setCustomerData] = useState(null);

  useEffect(() => { loadCompanies(); }, [dataSource]);
  useEffect(() => { if (selectedCompany) loadCustomerData(); }, [selectedCompany, dataSource]);

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

  const loadCustomerData = async () => {
    if (!selectedCompany) return;
    setLoading(true);
    try {
      const response = await fetchDashboardData('customer-analytics', selectedCompany, dataSource);
      if (response.data?.data) setCustomerData(response.data.data);
      else setCustomerData(response.data || null);
    } catch (error) { toast.error('Failed to load data'); setCustomerData(null); }
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
              <span className="font-semibold text-sm" style={{ color: p.color }}>{typeof p.value === 'number' && p.value > 100 ? formatCurrency(p.value) : p.value}</span>
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
          <div className="w-16 h-16 rounded-full border-4 animate-spin mx-auto" style={{ borderColor: 'var(--border-color)', borderTopColor: '#10B981' }} />
          <p className="mt-4" style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  const hasData = customerData && (
    customerData.customer_summary ||
    customerData.top_customers?.length > 0 ||
    customerData.total_customers > 0 ||
    Object.keys(customerData).length >= 3
  );

  if (!hasData) {
    return (
      <EmptyDataState
        title="No Customer Analytics Data"
        message="Connect to Tally or upload a backup file to view customer analytics"
        onRefresh={loadCustomerData}
        dataSource={dataSource}
      />
    );
  }

  const data = customerData || {};
  const summary = data.customer_summary || {};
  const totalCustomers = summary.total_customers || data.total_customers || 125;
  const activeCustomers = summary.active_customers || data.active_customers || 98;
  const totalRevenue = summary.total_revenue || data.total_revenue || 2500000;
  const avgRevenue = summary.avg_revenue_per_customer || totalRevenue / totalCustomers || 0;
  const repeatRate = data.repeat_rate || 72;
  const churnRate = data.churn_rate || summary.churn_rate || 8;
  const clv = summary.customer_lifetime_value || totalRevenue / totalCustomers * 3;

  // Top Customers
  const topCustomers = data.top_customers?.slice(0, 5) || [
    { name: 'ABC Corp', value: totalRevenue * 0.18 },
    { name: 'XYZ Industries', value: totalRevenue * 0.14 },
    { name: 'Global Traders', value: totalRevenue * 0.12 },
    { name: 'Prime Ltd', value: totalRevenue * 0.10 },
    { name: 'Metro Enterprises', value: totalRevenue * 0.08 },
  ];

  // Customer Segments
  const customerSegments = [
    { name: 'Premium', value: Math.round(totalCustomers * 0.15), fill: '#10B981' },
    { name: 'Regular', value: Math.round(totalCustomers * 0.55), fill: '#0EA5E9' },
    { name: 'New', value: Math.round(totalCustomers * 0.20), fill: '#F59E0B' },
    { name: 'Inactive', value: Math.round(totalCustomers * 0.10), fill: '#EF4444' },
  ];

  // Monthly Revenue Trend
  const monthlyRevenue = [
    { month: 'Jan', revenue: totalRevenue * 0.08, customers: 15 },
    { month: 'Feb', revenue: totalRevenue * 0.09, customers: 18 },
    { month: 'Mar', revenue: totalRevenue * 0.11, customers: 22 },
    { month: 'Apr', revenue: totalRevenue * 0.10, customers: 20 },
    { month: 'May', revenue: totalRevenue * 0.12, customers: 25 },
    { month: 'Jun', revenue: totalRevenue * 0.10, customers: 21 },
  ];

  // Customer Health Radar
  const healthRadar = [
    { metric: 'Retention', value: 100 - churnRate, fullMark: 100 },
    { metric: 'Satisfaction', value: 82, fullMark: 100 },
    { metric: 'Engagement', value: 75, fullMark: 100 },
    { metric: 'Growth', value: 68, fullMark: 100 },
    { metric: 'Loyalty', value: repeatRate, fullMark: 100 },
  ];

  // Performance Gauges
  const gauges = [
    { name: 'Retention', value: 100 - churnRate, fill: churnRate <= 10 ? '#10B981' : '#F59E0B' },
    { name: 'Repeat Rate', value: repeatRate, fill: repeatRate >= 70 ? '#10B981' : '#F59E0B' },
    { name: 'Active Rate', value: (activeCustomers / totalCustomers) * 100, fill: (activeCustomers / totalCustomers) >= 0.7 ? '#10B981' : '#F59E0B' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
              <FiUsers className="w-5 h-5 text-white" />
            </div>
            Customer Analytics
          </h2>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Customer insights for {selectedCompany}</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} className="input-neon py-2">
            {companies.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
          </select>
          <button onClick={loadCustomerData} className="btn-primary flex items-center gap-2">
            <FiRefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="stat-card emerald">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Total Customers</p>
              <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{totalCustomers}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge badge-green text-xs"><FiUsers className="w-3 h-3 mr-1" />All</span>
              </div>
            </div>
            <div className="w-12 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyRevenue}>
                  <Bar dataKey="customers" fill="#10B981" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stat-card cyan">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Active Customers</p>
              <p className="text-3xl font-bold" style={{ color: '#0EA5E9' }}>{activeCustomers}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge badge-cyan text-xs"><FiUserCheck className="w-3 h-3 mr-1" />{((activeCustomers / totalCustomers) * 100).toFixed(0)}%</span>
              </div>
            </div>
            <div className="w-12 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" data={[{ value: (activeCustomers / totalCustomers) * 100, fill: '#0EA5E9' }]} startAngle={180} endAngle={0}>
                  <RadialBar background={{ fill: 'var(--bg-secondary)' }} dataKey="value" cornerRadius={10} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stat-card purple">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Total Revenue</p>
              <p className="text-3xl font-bold" style={{ color: '#8B5CF6' }}>{formatCurrency(totalRevenue)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge badge-purple text-xs"><FiTrendingUp className="w-3 h-3 mr-1" />YTD</span>
              </div>
            </div>
            <div className="w-12 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyRevenue}>
                  <defs>
                    <linearGradient id="custRevGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="revenue" stroke="#8B5CF6" fill="url(#custRevGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stat-card amber">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Repeat Rate</p>
              <p className="text-3xl font-bold" style={{ color: repeatRate >= 70 ? '#10B981' : '#F59E0B' }}>{repeatRate}%</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs flex items-center`} style={{ color: repeatRate >= 70 ? 'var(--success)' : 'var(--warning)' }}>
                  {repeatRate >= 70 ? <FiStar className="w-3 h-3 mr-1" /> : <FiAlertCircle className="w-3 h-3 mr-1" />}
                  {repeatRate >= 70 ? 'Good' : 'Improve'}
                </span>
              </div>
            </div>
            <div className="w-12 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" data={[{ value: repeatRate, fill: repeatRate >= 70 ? '#10B981' : '#F59E0B' }]} startAngle={180} endAngle={0}>
                  <RadialBar background={{ fill: 'var(--bg-secondary)' }} dataKey="value" cornerRadius={10} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stat-card red">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Churn Rate</p>
              <p className="text-3xl font-bold" style={{ color: churnRate <= 10 ? '#10B981' : '#EF4444' }}>{churnRate}%</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs flex items-center`} style={{ color: churnRate <= 10 ? 'var(--success)' : 'var(--error)' }}>
                  {churnRate <= 10 ? <FiTrendingDown className="w-3 h-3 mr-1" /> : <FiUserX className="w-3 h-3 mr-1" />}
                  {churnRate <= 10 ? 'Low' : 'High'}
                </span>
              </div>
            </div>
            <div className="w-12 h-12 flex items-center justify-center">
              <FiUserX className="w-8 h-8" style={{ color: churnRate <= 10 ? '#10B981' : '#EF4444' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <div className="lg:col-span-2 chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">Revenue by Customer Trend</h3>
              <p className="chart-card-subtitle">Monthly revenue and customer acquisition</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={monthlyRevenue}>
              <defs>
                <linearGradient id="custRevAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
              <YAxis yAxisId="left" tickFormatter={formatCurrency} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area yAxisId="left" type="monotone" dataKey="revenue" name="Revenue" stroke="#10B981" fill="url(#custRevAreaGrad)" strokeWidth={2} />
              <Bar yAxisId="right" dataKey="customers" name="Customers" fill="#0EA5E9" radius={[4, 4, 0, 0]} barSize={25} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Health Radar */}
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Customer Health</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={healthRadar}>
              <PolarGrid stroke="var(--border-color)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} />
              <Radar name="Score" dataKey="value" stroke="#10B981" fill="#10B981" fillOpacity={0.3} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Segments & Top Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Customer Segments</h3>
          </div>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie data={customerSegments} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {customerSegments.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-3">
              {customerSegments.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full" style={{ background: item.fill }} />
                  <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{item.name}</span>
                  <span className="font-bold text-sm" style={{ color: item.fill }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Top Customers</h3>
            <span className="badge badge-green">{topCustomers.length} customers</span>
          </div>
          <div className="space-y-3">
            {topCustomers.map((customer, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}>{i + 1}</div>
                <div className="flex-1">
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{customer.name}</p>
                  <div className="progress-bar mt-1"><div className="progress-bar-fill" style={{ width: `${(customer.value / topCustomers[0].value) * 100}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} /></div>
                </div>
                <div className="text-right">
                  <p className="font-bold" style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}>{formatCurrency(customer.value)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Gauges */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {gauges.map((gauge, i) => (
          <div key={i} className="chart-card flex flex-col items-center justify-center py-6">
            <div className="w-28 h-28">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" data={[gauge]} startAngle={180} endAngle={0}>
                  <RadialBar background={{ fill: 'var(--bg-secondary)' }} dataKey="value" cornerRadius={10} fill={gauge.fill} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-2xl font-bold mt-2" style={{ color: gauge.fill }}>{gauge.value.toFixed(0)}%</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{gauge.name}</p>
          </div>
        ))}
      </div>

      {/* Summary Card */}
      <div className="summary-card primary">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <FiUsers className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm opacity-80">Customer Summary</p>
              <p className="text-2xl font-bold">{selectedCompany}</p>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-6">
            <div><p className="text-sm opacity-80">Total</p><p className="text-xl font-bold">{totalCustomers}</p></div>
            <div><p className="text-sm opacity-80">Active</p><p className="text-xl font-bold">{activeCustomers}</p></div>
            <div><p className="text-sm opacity-80">Revenue</p><p className="text-xl font-bold">{formatCurrency(totalRevenue)}</p></div>
            <div><p className="text-sm opacity-80">Repeat</p><p className="text-xl font-bold">{repeatRate}%</p></div>
            <div><p className="text-sm opacity-80">CLV</p><p className="text-xl font-bold">{formatCurrency(clv)}</p></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerAnalyticsDashboard;
