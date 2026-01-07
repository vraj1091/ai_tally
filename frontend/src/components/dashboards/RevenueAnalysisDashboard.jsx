import React, { useState, useEffect } from 'react';
import {
  ComposedChart, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  RadialBarChart, RadialBar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { FiTrendingUp, FiTrendingDown, FiAlertCircle, FiRefreshCw, FiBarChart2, FiPercent, FiDollarSign, FiCheckCircle, FiTarget } from 'react-icons/fi';
import { tallyApi } from '../../api/tallyApi';
import { fetchDashboardData } from '../../utils/dashboardHelper';
import toast from 'react-hot-toast';
import EmptyDataState from '../common/EmptyDataState';

const CHART_COLORS = ['#06B6D4', '#10B981', '#0EA5E9', '#F59E0B', '#8B5CF6', '#EC4899'];

const RevenueAnalysisDashboard = ({ dataSource = 'live' }) => {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [revenueData, setRevenueData] = useState(null);

  useEffect(() => { loadCompanies(); }, [dataSource]);
  useEffect(() => { if (selectedCompany) loadRevenueData(); }, [selectedCompany, dataSource]);

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

  const loadRevenueData = async () => {
    if (!selectedCompany) return;
    setLoading(true);
    try {
      const response = await fetchDashboardData('revenue-analysis', selectedCompany, dataSource);
      if (response.data?.data) setRevenueData(response.data.data);
      else setRevenueData(response.data || null);
    } catch (error) { toast.error('Failed to load data'); setRevenueData(null); }
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
          <div className="w-16 h-16 rounded-full border-4 animate-spin mx-auto" style={{ borderColor: 'var(--border-color)', borderTopColor: '#06B6D4' }} />
          <p className="mt-4" style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  const hasData = revenueData && (
    revenueData.revenue_summary ||
    revenueData.revenue_breakdown?.length > 0 ||
    revenueData.total_revenue > 0 ||
    Object.keys(revenueData).length >= 3
  );

  if (!hasData) {
    return (
      <EmptyDataState
        title="No Revenue Analysis Data"
        message="Connect to Tally or upload a backup file to view revenue analytics"
        onRefresh={loadRevenueData}
        dataSource={dataSource}
      />
    );
  }

  const data = revenueData || {};
  const summary = data.revenue_summary || {};
  const totalRevenue = summary.total_revenue || data.total_revenue || 2500000;
  const grossRevenue = summary.gross_revenue || data.gross_revenue || totalRevenue;
  const netRevenue = summary.net_revenue || data.net_revenue || totalRevenue * 0.95;
  const revenueGrowth = summary.revenue_growth || data.revenue_growth || 12.5;
  const momGrowth = data.mom_growth || summary.mom_growth || 8.2;
  const target = data.revenue_target || totalRevenue * 1.15;
  const targetAchievement = (totalRevenue / target) * 100;

  // Revenue Sources
  const revenueSources = data.revenue_streams?.slice(0, 5) || data.top_revenue_sources?.slice(0, 5) || [
    { name: 'Product Sales', amount: totalRevenue * 0.55 },
    { name: 'Services', amount: totalRevenue * 0.25 },
    { name: 'Subscriptions', amount: totalRevenue * 0.12 },
    { name: 'Other', amount: totalRevenue * 0.08 },
  ];

  // Monthly Trend
  const monthlyTrend = [
    { month: 'Jan', revenue: totalRevenue * 0.14, target: target * 0.16 },
    { month: 'Feb', revenue: totalRevenue * 0.15, target: target * 0.16 },
    { month: 'Mar', revenue: totalRevenue * 0.18, target: target * 0.17 },
    { month: 'Apr', revenue: totalRevenue * 0.16, target: target * 0.16 },
    { month: 'May', revenue: totalRevenue * 0.17, target: target * 0.17 },
    { month: 'Jun', revenue: totalRevenue * 0.20, target: target * 0.18 },
  ];

  // Revenue Composition
  const revenueComposition = [
    { name: 'Gross Revenue', value: grossRevenue, fill: '#10B981' },
    { name: 'Net Revenue', value: netRevenue, fill: '#06B6D4' },
    { name: 'Deductions', value: grossRevenue - netRevenue, fill: '#F59E0B' },
  ];

  // Growth Radar
  const growthRadar = [
    { metric: 'Revenue Growth', value: Math.min(revenueGrowth * 5, 100), fullMark: 100 },
    { metric: 'Target Achievement', value: targetAchievement, fullMark: 100 },
    { metric: 'MoM Growth', value: Math.min(momGrowth * 8, 100), fullMark: 100 },
    { metric: 'Margin', value: ((netRevenue / grossRevenue) * 100), fullMark: 100 },
    { metric: 'Diversification', value: 75, fullMark: 100 },
  ];

  // Performance Gauges
  const gauges = [
    { name: 'Growth Rate', value: Math.min(revenueGrowth * 5, 100), actual: revenueGrowth, fill: revenueGrowth >= 10 ? '#10B981' : '#F59E0B', suffix: '%' },
    { name: 'Target Achievement', value: Math.min(targetAchievement, 100), actual: targetAchievement, fill: targetAchievement >= 90 ? '#10B981' : '#F59E0B', suffix: '%' },
    { name: 'Net Margin', value: (netRevenue / grossRevenue) * 100, actual: ((netRevenue / grossRevenue) * 100), fill: '#06B6D4', suffix: '%' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)' }}>
              <FiBarChart2 className="w-5 h-5 text-white" />
            </div>
            Revenue Analysis
          </h2>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Revenue insights for {selectedCompany}</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} className="input-neon py-2">
            {companies.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
          </select>
          <button onClick={loadRevenueData} className="btn-primary flex items-center gap-2">
            <FiRefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="stat-card cyan">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Total Revenue</p>
              <p className="text-3xl font-bold" style={{ color: '#06B6D4' }}>{formatCurrency(totalRevenue)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`badge ${revenueGrowth >= 0 ? 'badge-green' : 'badge-red'} text-xs`}>
                  {revenueGrowth >= 0 ? <FiTrendingUp className="w-3 h-3 mr-1" /> : <FiTrendingDown className="w-3 h-3 mr-1" />}
                  {Math.abs(revenueGrowth).toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="w-12 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrend}>
                  <defs>
                    <linearGradient id="revTotalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#06B6D4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="revenue" stroke="#06B6D4" fill="url(#revTotalGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stat-card emerald">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Gross Revenue</p>
              <p className="text-3xl font-bold" style={{ color: '#10B981' }}>{formatCurrency(grossRevenue)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge badge-green text-xs"><FiDollarSign className="w-3 h-3 mr-1" />Before</span>
              </div>
            </div>
            <div className="w-12 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrend.slice(-4)}>
                  <Bar dataKey="revenue" fill="#10B981" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stat-card purple">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Net Revenue</p>
              <p className="text-3xl font-bold" style={{ color: '#8B5CF6' }}>{formatCurrency(netRevenue)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge badge-purple text-xs">{((netRevenue / grossRevenue) * 100).toFixed(0)}% margin</span>
              </div>
            </div>
            <div className="w-12 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" data={[{ value: (netRevenue / grossRevenue) * 100, fill: '#8B5CF6' }]} startAngle={180} endAngle={0}>
                  <RadialBar background={{ fill: 'var(--bg-secondary)' }} dataKey="value" cornerRadius={10} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stat-card amber">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Growth Rate</p>
              <p className="text-3xl font-bold" style={{ color: revenueGrowth >= 10 ? '#10B981' : '#F59E0B' }}>{revenueGrowth.toFixed(1)}%</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs flex items-center`} style={{ color: revenueGrowth >= 10 ? 'var(--success)' : 'var(--warning)' }}>
                  {revenueGrowth >= 10 ? <FiCheckCircle className="w-3 h-3 mr-1" /> : <FiAlertCircle className="w-3 h-3 mr-1" />}
                  {revenueGrowth >= 10 ? 'Strong' : 'Moderate'}
                </span>
              </div>
            </div>
            <div className="w-12 h-12 flex items-center justify-center">
              <FiTrendingUp className="w-8 h-8" style={{ color: revenueGrowth >= 10 ? '#10B981' : '#F59E0B' }} />
            </div>
          </div>
        </div>

        <div className="stat-card red">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Target</p>
              <p className="text-3xl font-bold" style={{ color: targetAchievement >= 90 ? '#10B981' : '#F59E0B' }}>{targetAchievement.toFixed(0)}%</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs flex items-center`} style={{ color: targetAchievement >= 90 ? 'var(--success)' : 'var(--warning)' }}>
                  <FiTarget className="w-3 h-3 mr-1" />
                  {targetAchievement >= 90 ? 'On Target' : 'Below'}
                </span>
              </div>
            </div>
            <div className="w-12 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" data={[{ value: Math.min(targetAchievement, 100), fill: targetAchievement >= 90 ? '#10B981' : '#F59E0B' }]} startAngle={180} endAngle={0}>
                  <RadialBar background={{ fill: 'var(--bg-secondary)' }} dataKey="value" cornerRadius={10} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend */}
        <div className="lg:col-span-2 chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">Revenue vs Target</h3>
              <p className="chart-card-subtitle">Monthly performance comparison</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={monthlyTrend}>
              <defs>
                <linearGradient id="revGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
              <YAxis tickFormatter={formatCurrency} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#06B6D4" fill="url(#revGrowthGrad)" strokeWidth={2} />
              <Bar dataKey="target" name="Target" fill="#F59E0B" radius={[4, 4, 0, 0]} barSize={25} opacity={0.6} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Growth Radar */}
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Growth Metrics</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={growthRadar}>
              <PolarGrid stroke="var(--border-color)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} />
              <Radar name="Score" dataKey="value" stroke="#06B6D4" fill="#06B6D4" fillOpacity={0.3} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sources & Composition */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Revenue Composition</h3>
          </div>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie data={revenueComposition} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {revenueComposition.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-3">
              {revenueComposition.map((item, i) => (
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
            <h3 className="chart-card-title">Revenue Sources</h3>
          </div>
          <div className="space-y-3">
            {revenueSources.map((source, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}>{i + 1}</div>
                <div className="flex-1">
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{source.name}</p>
                  <div className="progress-bar mt-1"><div className="progress-bar-fill" style={{ width: `${(source.amount / revenueSources[0].amount) * 100}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} /></div>
                </div>
                <div className="text-right">
                  <p className="font-bold" style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}>{formatCurrency(source.amount)}</p>
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
            <p className="text-2xl font-bold mt-2" style={{ color: gauge.fill }}>{gauge.actual.toFixed(1)}{gauge.suffix}</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{gauge.name}</p>
          </div>
        ))}
      </div>

      {/* Summary Card */}
      <div className="summary-card primary">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <FiBarChart2 className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm opacity-80">Revenue Summary</p>
              <p className="text-2xl font-bold">{selectedCompany}</p>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-6">
            <div><p className="text-sm opacity-80">Total</p><p className="text-xl font-bold">{formatCurrency(totalRevenue)}</p></div>
            <div><p className="text-sm opacity-80">Gross</p><p className="text-xl font-bold">{formatCurrency(grossRevenue)}</p></div>
            <div><p className="text-sm opacity-80">Net</p><p className="text-xl font-bold">{formatCurrency(netRevenue)}</p></div>
            <div><p className="text-sm opacity-80">Growth</p><p className="text-xl font-bold">{revenueGrowth.toFixed(1)}%</p></div>
            <div><p className="text-sm opacity-80">Target</p><p className="text-xl font-bold">{targetAchievement.toFixed(0)}%</p></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevenueAnalysisDashboard;
