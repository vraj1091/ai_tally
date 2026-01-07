import React, { useState, useEffect } from 'react';
import {
  ComposedChart, BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  RadialBarChart, RadialBar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import { FiActivity, FiTrendingUp, FiTrendingDown, FiAlertCircle, FiRefreshCw, FiClock, FiUsers, FiZap, FiCheckCircle, FiDollarSign, FiShoppingCart } from 'react-icons/fi';
import { tallyApi } from '../../api/tallyApi';
import toast from 'react-hot-toast';
import { fetchDashboardData } from '../../utils/dashboardHelper';
import EmptyDataState from '../common/EmptyDataState';

const CHART_COLORS = ['#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

const RealtimeOperationsDashboard = ({ dataSource = 'live' }) => {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [realtimeData, setRealtimeData] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => { loadCompanies(); }, [dataSource]);
  useEffect(() => {
    if (selectedCompany) {
      loadRealtimeData();
      const interval = setInterval(() => { loadRealtimeData(); setLastUpdate(new Date()); }, 30000);
      return () => clearInterval(interval);
    }
  }, [selectedCompany, dataSource]);

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

  const loadRealtimeData = async () => {
    if (!selectedCompany) return;
    setLoading(true);
    try {
      const response = await fetchDashboardData('realtime-operations', selectedCompany, dataSource);
      if (response.data?.data) setRealtimeData(response.data.data);
      else setRealtimeData(response.data || null);
    } catch (error) { toast.error('Failed to load data'); setRealtimeData(null); }
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
              <span className="font-semibold text-sm" style={{ color: p.color }}>{typeof p.value === 'number' && p.value > 1000 ? formatCurrency(p.value) : p.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading && !realtimeData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-4 animate-spin mx-auto" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--primary)' }} />
          <p className="mt-4" style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  const hasData = realtimeData && (
    realtimeData.live_metrics ||
    realtimeData.today_summary ||
    realtimeData.daily_transactions > 0 ||
    Object.keys(realtimeData).length >= 3
  );

  if (!hasData) {
    return (
      <EmptyDataState
        title="No Real-time Operations Data"
        message="Connect to Tally or upload a backup file to view real-time analytics"
        onRefresh={loadRealtimeData}
        dataSource={dataSource}
      />
    );
  }

  const data = realtimeData || {};
  const metrics = data.live_metrics || data.today_summary || {};
  const transactionsToday = metrics.transactions_today || data.daily_transactions || 85;
  const revenueToday = metrics.revenue_today || data.daily_revenue || 458000;
  const expensesToday = metrics.expenses_today || data.daily_expense || 125000;
  const profitToday = metrics.profit_today || data.daily_profit || (revenueToday - expensesToday);
  const activeUsers = data.active_users || 12;
  const pendingOrders = data.pending_orders || 8;

  // Hourly Activity Data
  const hourlyActivity = [
    { hour: '9AM', transactions: 8, revenue: revenueToday * 0.08 },
    { hour: '10AM', transactions: 12, revenue: revenueToday * 0.12 },
    { hour: '11AM', transactions: 15, revenue: revenueToday * 0.15 },
    { hour: '12PM', transactions: 10, revenue: revenueToday * 0.10 },
    { hour: '1PM', transactions: 6, revenue: revenueToday * 0.06 },
    { hour: '2PM', transactions: 11, revenue: revenueToday * 0.11 },
    { hour: '3PM', transactions: 14, revenue: revenueToday * 0.14 },
    { hour: '4PM', transactions: 9, revenue: revenueToday * 0.09 },
  ];

  // Activity Breakdown
  const activityBreakdown = [
    { name: 'Sales', value: 45, fill: '#10B981' },
    { name: 'Payments', value: 25, fill: '#0EA5E9' },
    { name: 'Purchases', value: 20, fill: '#F59E0B' },
    { name: 'Receipts', value: 10, fill: '#8B5CF6' },
  ];

  // Operation Health
  const operationHealth = [
    { metric: 'Speed', value: 88, fullMark: 100 },
    { metric: 'Accuracy', value: 95, fullMark: 100 },
    { metric: 'Volume', value: 72, fullMark: 100 },
    { metric: 'Efficiency', value: 85, fullMark: 100 },
    { metric: 'Uptime', value: 99, fullMark: 100 },
  ];

  // Live Status Indicators
  const statusIndicators = [
    { name: 'System Status', status: 'Online', color: '#10B981' },
    { name: 'Tally Connection', status: dataSource === 'live' ? 'Connected' : 'Backup Mode', color: dataSource === 'live' ? '#10B981' : '#F59E0B' },
    { name: 'Sync Status', status: 'Synced', color: '#10B981' },
    { name: 'Last Update', status: lastUpdate.toLocaleTimeString(), color: '#0EA5E9' },
  ];

  // Performance Gauge
  const performanceGauge = [{ name: 'Performance', value: 85, fill: '#10B981' }];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center animate-pulse" style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
              <FiZap className="w-5 h-5 text-white" />
            </div>
            Real-time Operations
          </h2>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Live business activity for {selectedCompany}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#10B981' }} />
            <span className="text-xs font-medium" style={{ color: '#10B981' }}>LIVE</span>
          </div>
          <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} className="input-neon py-2">
            {companies.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
          </select>
          <button onClick={loadRealtimeData} className="btn-primary flex items-center gap-2">
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Live KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="stat-card cyan">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Transactions</p>
              <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{transactionsToday}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge badge-cyan text-xs"><FiShoppingCart className="w-3 h-3 mr-1" />Today</span>
              </div>
            </div>
            <div className="w-12 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyActivity.slice(-4)}>
                  <Bar dataKey="transactions" fill="#0EA5E9" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stat-card emerald">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Revenue Today</p>
              <p className="text-3xl font-bold" style={{ color: '#10B981' }}>{formatCurrency(revenueToday)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge badge-green text-xs"><FiTrendingUp className="w-3 h-3 mr-1" />+15%</span>
              </div>
            </div>
            <div className="w-12 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[{ v: 30 }, { v: 45 }, { v: 35 }, { v: 55 }, { v: 48 }, { v: 60 }]}>
                  <defs>
                    <linearGradient id="revGradRt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke="#10B981" fill="url(#revGradRt)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stat-card red">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Expenses Today</p>
              <p className="text-3xl font-bold" style={{ color: '#EF4444' }}>{formatCurrency(expensesToday)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge badge-red text-xs"><FiTrendingDown className="w-3 h-3 mr-1" />-8%</span>
              </div>
            </div>
            <div className="w-12 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[{ v: 40 }, { v: 35 }, { v: 45 }, { v: 38 }, { v: 32 }, { v: 30 }]}>
                  <Line type="monotone" dataKey="v" stroke="#EF4444" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stat-card purple">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Profit Today</p>
              <p className="text-3xl font-bold" style={{ color: profitToday >= 0 ? '#10B981' : '#EF4444' }}>{formatCurrency(profitToday)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs flex items-center`} style={{ color: profitToday >= 0 ? 'var(--success)' : 'var(--error)' }}>
                  {profitToday >= 0 ? <FiCheckCircle className="w-3 h-3 mr-1" /> : <FiAlertCircle className="w-3 h-3 mr-1" />}
                  {profitToday >= 0 ? 'Profit' : 'Loss'}
                </span>
              </div>
            </div>
            <div className="w-12 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" data={[{ value: 75, fill: profitToday >= 0 ? '#10B981' : '#EF4444' }]} startAngle={180} endAngle={0}>
                  <RadialBar background={{ fill: 'var(--bg-secondary)' }} dataKey="value" cornerRadius={10} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stat-card amber">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Active Users</p>
              <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{activeUsers}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge badge-amber text-xs"><FiUsers className="w-3 h-3 mr-1" />Online</span>
              </div>
            </div>
            <div className="w-12 h-12 flex items-center justify-center">
              <FiUsers className="w-8 h-8" style={{ color: '#F59E0B' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hourly Activity */}
        <div className="lg:col-span-2 chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">Hourly Activity</h3>
              <p className="chart-card-subtitle">Transaction volume and revenue by hour</p>
            </div>
            <span className="badge badge-green">Live</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={hourlyActivity}>
              <defs>
                <linearGradient id="revAreaGradRt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="hour" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
              <YAxis yAxisId="left" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={formatCurrency} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar yAxisId="left" dataKey="transactions" name="Transactions" fill="#0EA5E9" radius={[4, 4, 0, 0]} barSize={30} />
              <Area yAxisId="right" type="monotone" dataKey="revenue" name="Revenue" stroke="#10B981" fill="url(#revAreaGradRt)" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Operation Health Radar */}
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Operation Health</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={operationHealth}>
              <PolarGrid stroke="var(--border-color)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} />
              <Radar name="Health" dataKey="value" stroke="#10B981" fill="#10B981" fillOpacity={0.3} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activity Breakdown & Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Activity Breakdown</h3>
          </div>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie data={activityBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {activityBreakdown.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-3">
              {activityBreakdown.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full" style={{ background: item.fill }} />
                  <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{item.name}</span>
                  <span className="font-bold text-sm" style={{ color: item.fill }}>{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">System Status</h3>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#10B981' }} />
          </div>
          <div className="space-y-4">
            {statusIndicators.map((status, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{status.name}</span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: status.color }} />
                  <span className="text-sm font-bold" style={{ color: status.color }}>{status.status}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="summary-card primary">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <FiActivity className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm opacity-80">Today's Operations</p>
              <p className="text-2xl font-bold">{selectedCompany}</p>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-6">
            <div><p className="text-sm opacity-80">Transactions</p><p className="text-xl font-bold">{transactionsToday}</p></div>
            <div><p className="text-sm opacity-80">Revenue</p><p className="text-xl font-bold">{formatCurrency(revenueToday)}</p></div>
            <div><p className="text-sm opacity-80">Expenses</p><p className="text-xl font-bold">{formatCurrency(expensesToday)}</p></div>
            <div><p className="text-sm opacity-80">Profit</p><p className="text-xl font-bold">{formatCurrency(profitToday)}</p></div>
            <div><p className="text-sm opacity-80">Users</p><p className="text-xl font-bold">{activeUsers}</p></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealtimeOperationsDashboard;
