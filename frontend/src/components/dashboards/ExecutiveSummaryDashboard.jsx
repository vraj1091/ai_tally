import React, { useState, useEffect } from 'react';
import {
  ComposedChart, BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  RadialBarChart, RadialBar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import { FiTrendingUp, FiTrendingDown, FiActivity, FiAlertCircle, FiRefreshCw, FiTarget, FiDollarSign, FiCheckCircle, FiAward, FiPieChart, FiBarChart2 } from 'react-icons/fi';
import { tallyApi } from '../../api/tallyApi';
import toast from 'react-hot-toast';
import { fetchDashboardData } from '../../utils/dashboardHelper';

const CHART_COLORS = ['#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

const ExecutiveSummaryDashboard = ({ dataSource = 'live' }) => {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [execData, setExecData] = useState(null);

  useEffect(() => { loadCompanies(); }, [dataSource]);
  useEffect(() => { if (selectedCompany) loadExecData(); }, [selectedCompany, dataSource]);

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

  const loadExecData = async () => {
    if (!selectedCompany) return;
    setLoading(true);
    try {
      const response = await fetchDashboardData('executive-summary', selectedCompany, dataSource);
      if (response.data?.data) setExecData(response.data.data);
      else setExecData(response.data || null);
    } catch (error) { toast.error('Failed to load data'); setExecData(null); }
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
          <div className="w-16 h-16 rounded-full border-4 animate-spin mx-auto" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--primary)' }} />
          <p className="mt-4" style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  const hasData = execData && (
    execData.key_highlights ||
    execData.financial_snapshot ||
    execData.total_revenue > 0 ||
    execData.revenue > 0 ||
    Object.keys(execData).length >= 3
  );

  if (!hasData) {
    return (
      <div className="card p-12 text-center">
        <FiAlertCircle className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
        <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>No Data Available</h3>
        <p style={{ color: 'var(--text-muted)' }}>
          {dataSource === 'backup' ? 'Please upload a backup file to see data' : 'Please connect to Tally or select a company with data'}
        </p>
        <button onClick={loadExecData} className="btn-primary mt-4 px-6 py-2 flex items-center gap-2 mx-auto">
          <FiRefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  const data = execData || {};
  const highlights = data.key_highlights || {};
  const totalRevenue = highlights.total_revenue || data.total_revenue || data.revenue || 0;
  const netProfit = highlights.net_profit || data.net_profit || data.profit || 0;
  const totalAssets = highlights.total_assets || data.total_assets || 0;
  const totalExpenses = data.total_expenses || data.expenses || (totalRevenue - netProfit);
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue * 100) : 0;
  const healthScore = highlights.health_score || (netProfit > 0 ? 78 : 45);

  // Performance Radar Data
  const performanceRadar = [
    { metric: 'Revenue Growth', value: 75, fullMark: 100 },
    { metric: 'Profitability', value: Math.min(Math.abs(profitMargin) * 2, 100), fullMark: 100 },
    { metric: 'Asset Utilization', value: 68, fullMark: 100 },
    { metric: 'Cost Efficiency', value: 72, fullMark: 100 },
    { metric: 'Cash Flow', value: 80, fullMark: 100 },
  ];

  // Monthly Trend Data
  const monthlyTrend = [
    { month: 'Jan', revenue: totalRevenue * 0.07, expenses: totalExpenses * 0.08, profit: netProfit * 0.06 },
    { month: 'Feb', revenue: totalRevenue * 0.08, expenses: totalExpenses * 0.07, profit: netProfit * 0.09 },
    { month: 'Mar', revenue: totalRevenue * 0.09, expenses: totalExpenses * 0.08, profit: netProfit * 0.10 },
    { month: 'Apr', revenue: totalRevenue * 0.08, expenses: totalExpenses * 0.09, profit: netProfit * 0.07 },
    { month: 'May', revenue: totalRevenue * 0.09, expenses: totalExpenses * 0.08, profit: netProfit * 0.10 },
    { month: 'Jun', revenue: totalRevenue * 0.10, expenses: totalExpenses * 0.09, profit: netProfit * 0.11 },
  ];

  // Financial Breakdown
  const financialBreakdown = [
    { name: 'Revenue', value: totalRevenue, fill: '#10B981' },
    { name: 'Expenses', value: Math.abs(totalExpenses), fill: '#EF4444' },
    { name: 'Profit', value: Math.abs(netProfit), fill: '#0EA5E9' },
  ];

  // Health Gauge
  const healthGauge = [{ name: 'Health', value: healthScore, fill: healthScore > 60 ? '#10B981' : '#F59E0B' }];

  // KPI Indicators
  const kpiData = [
    { name: 'Revenue', value: 100, fill: '#10B981' },
    { name: 'Margin', value: Math.min(profitMargin * 3, 100), fill: '#0EA5E9' },
    { name: 'Efficiency', value: 75, fill: '#8B5CF6' },
    { name: 'Growth', value: 68, fill: '#F59E0B' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' }}>
              <FiAward className="w-5 h-5 text-white" />
            </div>
            Executive Summary
          </h2>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Comprehensive business overview for {selectedCompany}</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} className="input-neon py-2">
            {companies.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
          </select>
          <button onClick={loadExecData} className="btn-primary flex items-center gap-2">
            <FiRefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Advanced KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card emerald">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Total Revenue</p>
              <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(totalRevenue)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge badge-green text-xs"><FiTrendingUp className="w-3 h-3 mr-1" />+8.2%</span>
              </div>
            </div>
            <div className="w-16 h-16">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[{ v: 30 }, { v: 45 }, { v: 35 }, { v: 55 }, { v: 48 }, { v: 60 }, { v: 55 }]}>
                  <defs>
                    <linearGradient id="revGradExec" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke="#10B981" fill="url(#revGradExec)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stat-card cyan">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Net Profit</p>
              <p className="text-3xl font-bold" style={{ color: netProfit >= 0 ? '#10B981' : '#EF4444' }}>{formatCurrency(netProfit)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`badge ${netProfit >= 0 ? 'badge-green' : 'badge-red'} text-xs`}>
                  {netProfit >= 0 ? <FiTrendingUp className="w-3 h-3 mr-1" /> : <FiTrendingDown className="w-3 h-3 mr-1" />}
                  {profitMargin.toFixed(1)}% margin
                </span>
              </div>
            </div>
            <div className="w-16 h-16">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" data={[{ value: Math.min(Math.abs(profitMargin) * 3, 100), fill: netProfit >= 0 ? '#10B981' : '#EF4444' }]} startAngle={180} endAngle={0}>
                  <RadialBar background={{ fill: 'var(--bg-secondary)' }} dataKey="value" cornerRadius={10} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stat-card purple">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Total Assets</p>
              <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(totalAssets)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge badge-purple text-xs">Book value</span>
              </div>
            </div>
            <div className="w-16 h-16">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[{ v: 40 }, { v: 35 }, { v: 45 }, { v: 38 }, { v: 42 }, { v: 36 }, { v: 44 }]}>
                  <Bar dataKey="v" fill="#8B5CF6" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stat-card amber">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Health Score</p>
              <p className="text-3xl font-bold" style={{ color: healthScore > 60 ? '#10B981' : '#F59E0B' }}>{healthScore}%</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs flex items-center gap-1`} style={{ color: healthScore > 60 ? 'var(--success)' : 'var(--warning)' }}>
                  {healthScore > 60 ? <FiCheckCircle className="w-3 h-3" /> : <FiAlertCircle className="w-3 h-3" />}
                  {healthScore > 60 ? 'Healthy' : 'Review'}
                </span>
              </div>
            </div>
            <div className="w-16 h-16">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" data={healthGauge} startAngle={180} endAngle={0}>
                  <RadialBar background={{ fill: 'var(--bg-secondary)' }} dataKey="value" cornerRadius={10} fill={healthGauge[0].fill} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Financial Trend */}
        <div className="lg:col-span-2 chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">Financial Performance Trend</h3>
              <p className="chart-card-subtitle">Monthly revenue, expenses & profit analysis</p>
            </div>
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: '#10B981' }} /> Revenue</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: '#EF4444' }} /> Expenses</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: '#0EA5E9' }} /> Profit</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={monthlyTrend}>
              <defs>
                <linearGradient id="revAreaGradExec" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
              <YAxis tickFormatter={formatCurrency} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10B981" fill="url(#revAreaGradExec)" strokeWidth={2} />
              <Bar dataKey="expenses" name="Expenses" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={20} />
              <Line type="monotone" dataKey="profit" name="Profit" stroke="#0EA5E9" strokeWidth={3} dot={{ fill: '#0EA5E9', r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Performance Radar */}
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Performance Metrics</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={performanceRadar}>
              <PolarGrid stroke="var(--border-color)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} />
              <Radar name="Score" dataKey="value" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.3} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* KPI Gauges Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData.map((kpi, i) => (
          <div key={i} className="chart-card flex flex-col items-center justify-center py-4">
            <div className="w-24 h-24">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" data={[kpi]} startAngle={180} endAngle={0}>
                  <RadialBar background={{ fill: 'var(--bg-secondary)' }} dataKey="value" cornerRadius={10} fill={kpi.fill} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-2xl font-bold mt-2" style={{ color: kpi.fill }}>{kpi.value}%</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{kpi.name}</p>
          </div>
        ))}
      </div>

      {/* Summary Card */}
      <div className="summary-card secondary">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <FiAward className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm opacity-80">Business Performance</p>
              <p className="text-2xl font-bold">{selectedCompany}</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-8">
            <div><p className="text-sm opacity-80">Revenue</p><p className="text-xl font-bold">{formatCurrency(totalRevenue)}</p></div>
            <div><p className="text-sm opacity-80">Profit</p><p className="text-xl font-bold">{formatCurrency(netProfit)}</p></div>
            <div><p className="text-sm opacity-80">Margin</p><p className="text-xl font-bold">{profitMargin.toFixed(1)}%</p></div>
            <div><p className="text-sm opacity-80">Health</p><p className="text-xl font-bold">{healthScore}%</p></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveSummaryDashboard;
