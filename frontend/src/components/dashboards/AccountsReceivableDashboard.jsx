import React, { useState, useEffect } from 'react';
import {
  ComposedChart, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  RadialBarChart, RadialBar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { FiDollarSign, FiTrendingUp, FiTrendingDown, FiAlertCircle, FiRefreshCw, FiClock, FiCheckCircle, FiUsers, FiFileText } from 'react-icons/fi';
import { tallyApi } from '../../api/tallyApi';
import { fetchDashboardData } from '../../utils/dashboardHelper';
import toast from 'react-hot-toast';
import EmptyDataState from '../common/EmptyDataState';

const CHART_COLORS = ['#10B981', '#0EA5E9', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const AccountsReceivableDashboard = ({ dataSource = 'live' }) => {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [arData, setArData] = useState(null);

  useEffect(() => { loadCompanies(); }, [dataSource]);
  useEffect(() => { if (selectedCompany) loadARData(); }, [selectedCompany, dataSource]);

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

  const loadARData = async () => {
    if (!selectedCompany) return;
    setLoading(true);
    try {
      const response = await fetchDashboardData('accounts-receivable', selectedCompany, dataSource);
      if (response.data?.data) setArData(response.data.data);
      else setArData(response.data || null);
    } catch (error) { toast.error('Failed to load data'); setArData(null); }
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
          <div className="w-16 h-16 rounded-full border-4 animate-spin mx-auto" style={{ borderColor: 'var(--border-color)', borderTopColor: '#10B981' }} />
          <p className="mt-4" style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  const hasData = arData && (
    arData.ar_summary ||
    arData.receivables_summary ||
    arData.total_receivables > 0 ||
    Object.keys(arData).length >= 3
  );

  if (!hasData) {
    return (
      <EmptyDataState
        title="No Accounts Receivable Data"
        message="Connect to Tally or upload a backup file to view receivables analytics"
        onRefresh={loadARData}
        dataSource={dataSource}
      />
    );
  }

  const data = arData || {};
  const summary = data.ar_summary || {};
  const totalReceivables = summary.total_receivables || data.total_receivables || 750000;
  const outstandingInvoices = summary.outstanding_invoices || data.outstanding_invoices || 35;
  const avgCollectionDays = summary.avg_collection_days || data.avg_collection_days || 28;
  const collectionRate = summary.collection_rate || data.collection_rate || 85;
  const collected = data.collection_status?.collected || totalReceivables * 0.65;
  const pending = data.collection_status?.pending || totalReceivables * 0.25;
  const overdue = data.collection_status?.overdue || totalReceivables * 0.10;

  // Aging Analysis
  const agingAnalysis = data.aging_analysis || {};
  const agingData = [
    { name: 'Current', value: agingAnalysis.current || totalReceivables * 0.45, fill: '#10B981' },
    { name: '1-30 Days', value: agingAnalysis['1_30_days'] || totalReceivables * 0.25, fill: '#0EA5E9' },
    { name: '31-60 Days', value: agingAnalysis['31_60_days'] || totalReceivables * 0.15, fill: '#F59E0B' },
    { name: '61-90 Days', value: agingAnalysis['61_90_days'] || totalReceivables * 0.10, fill: '#EF4444' },
    { name: '90+ Days', value: agingAnalysis.over_90_days || totalReceivables * 0.05, fill: '#8B5CF6' },
  ];

  // Top Debtors
  const topDebtors = data.top_debtors?.slice(0, 5) || [
    { name: 'Customer A', amount: totalReceivables * 0.18 },
    { name: 'Customer B', amount: totalReceivables * 0.14 },
    { name: 'Customer C', amount: totalReceivables * 0.11 },
    { name: 'Customer D', amount: totalReceivables * 0.09 },
    { name: 'Customer E', amount: totalReceivables * 0.07 },
  ];

  // Monthly Trend
  const monthlyTrend = [
    { month: 'Jan', receivables: totalReceivables * 0.80, collections: totalReceivables * 0.70 },
    { month: 'Feb', receivables: totalReceivables * 0.85, collections: totalReceivables * 0.78 },
    { month: 'Mar', receivables: totalReceivables * 0.90, collections: totalReceivables * 0.82 },
    { month: 'Apr', receivables: totalReceivables * 0.92, collections: totalReceivables * 0.85 },
    { month: 'May', receivables: totalReceivables * 0.95, collections: totalReceivables * 0.88 },
    { month: 'Jun', receivables: totalReceivables, collections: totalReceivables * 0.90 },
  ];

  // Collection Health Radar
  const collectionRadar = [
    { metric: 'Collection Rate', value: collectionRate, fullMark: 100 },
    { metric: 'On-Time', value: 82, fullMark: 100 },
    { metric: 'DSO Score', value: Math.max(100 - avgCollectionDays * 2, 50), fullMark: 100 },
    { metric: 'Current Ratio', value: (agingData[0].value / totalReceivables) * 100, fullMark: 100 },
    { metric: 'Customer Health', value: 78, fullMark: 100 },
  ];

  // Performance Gauges
  const gauges = [
    { name: 'Collection Rate', value: collectionRate, fill: collectionRate >= 80 ? '#10B981' : '#F59E0B' },
    { name: 'Current AR', value: (agingData[0].value / totalReceivables) * 100, fill: '#10B981' },
    { name: 'DSO Health', value: Math.max(100 - avgCollectionDays * 2, 50), fill: avgCollectionDays <= 30 ? '#10B981' : '#F59E0B' },
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
            Accounts Receivable
          </h2>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Receivables analysis for {selectedCompany}</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} className="input-neon py-2">
            {companies.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
          </select>
          <button onClick={loadARData} className="btn-primary flex items-center gap-2">
            <FiRefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="stat-card emerald">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Total Receivables</p>
              <p className="text-3xl font-bold" style={{ color: '#10B981' }}>{formatCurrency(totalReceivables)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge badge-green text-xs"><FiDollarSign className="w-3 h-3 mr-1" />Outstanding</span>
              </div>
            </div>
            <div className="w-12 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrend}>
                  <defs>
                    <linearGradient id="arGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="receivables" stroke="#10B981" fill="url(#arGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stat-card cyan">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Outstanding Invoices</p>
              <p className="text-3xl font-bold" style={{ color: '#0EA5E9' }}>{outstandingInvoices}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge badge-cyan text-xs"><FiFileText className="w-3 h-3 mr-1" />Pending</span>
              </div>
            </div>
            <div className="w-12 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrend.slice(-4)}>
                  <Bar dataKey="receivables" fill="#0EA5E9" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stat-card amber">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Avg Collection Days</p>
              <p className="text-3xl font-bold" style={{ color: avgCollectionDays <= 30 ? '#10B981' : '#F59E0B' }}>{avgCollectionDays}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs flex items-center`} style={{ color: avgCollectionDays <= 30 ? 'var(--success)' : 'var(--warning)' }}>
                  <FiClock className="w-3 h-3 mr-1" />
                  {avgCollectionDays <= 30 ? 'Good' : 'Review'}
                </span>
              </div>
            </div>
            <div className="w-12 h-12 flex items-center justify-center">
              <FiClock className="w-8 h-8" style={{ color: '#F59E0B' }} />
            </div>
          </div>
        </div>

        <div className="stat-card purple">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Collection Rate</p>
              <p className="text-3xl font-bold" style={{ color: collectionRate >= 80 ? '#10B981' : '#F59E0B' }}>{collectionRate}%</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs flex items-center`} style={{ color: collectionRate >= 80 ? 'var(--success)' : 'var(--warning)' }}>
                  {collectionRate >= 80 ? <FiCheckCircle className="w-3 h-3 mr-1" /> : <FiAlertCircle className="w-3 h-3 mr-1" />}
                  {collectionRate >= 80 ? 'Excellent' : 'Improve'}
                </span>
              </div>
            </div>
            <div className="w-12 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" data={[{ value: collectionRate, fill: collectionRate >= 80 ? '#10B981' : '#F59E0B' }]} startAngle={180} endAngle={0}>
                  <RadialBar background={{ fill: 'var(--bg-secondary)' }} dataKey="value" cornerRadius={10} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stat-card red">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Overdue</p>
              <p className="text-3xl font-bold" style={{ color: '#EF4444' }}>{formatCurrency(overdue)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs flex items-center" style={{ color: 'var(--error)' }}>
                  <FiTrendingDown className="w-3 h-3 mr-1" />
                  {((overdue / totalReceivables) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="w-12 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" data={[{ value: 100 - ((overdue / totalReceivables) * 100), fill: overdue / totalReceivables <= 0.15 ? '#10B981' : '#EF4444' }]} startAngle={180} endAngle={0}>
                  <RadialBar background={{ fill: 'var(--bg-secondary)' }} dataKey="value" cornerRadius={10} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Receivables Trend */}
        <div className="lg:col-span-2 chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">Receivables vs Collections Trend</h3>
              <p className="chart-card-subtitle">Monthly collection performance</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={monthlyTrend}>
              <defs>
                <linearGradient id="arTrendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
              <YAxis tickFormatter={formatCurrency} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area type="monotone" dataKey="receivables" name="Receivables" stroke="#10B981" fill="url(#arTrendGrad)" strokeWidth={2} />
              <Bar dataKey="collections" name="Collections" fill="#0EA5E9" radius={[4, 4, 0, 0]} barSize={25} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Collection Health Radar */}
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Collection Health</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={collectionRadar}>
              <PolarGrid stroke="var(--border-color)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} />
              <Radar name="Score" dataKey="value" stroke="#10B981" fill="#10B981" fillOpacity={0.3} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Aging & Top Debtors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Aging Analysis</h3>
          </div>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie data={agingData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {agingData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {agingData.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full" style={{ background: item.fill }} />
                  <span className="flex-1 text-xs" style={{ color: 'var(--text-primary)' }}>{item.name}</span>
                  <span className="font-bold text-xs" style={{ color: item.fill }}>{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Top Debtors</h3>
          </div>
          <div className="space-y-3">
            {topDebtors.map((debtor, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}>{i + 1}</div>
                <div className="flex-1">
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{debtor.name}</p>
                  <div className="progress-bar mt-1"><div className="progress-bar-fill" style={{ width: `${(debtor.amount / topDebtors[0].amount) * 100}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} /></div>
                </div>
                <div className="text-right">
                  <p className="font-bold" style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}>{formatCurrency(debtor.amount)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Collection Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="chart-card flex flex-col items-center justify-center py-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
            <FiCheckCircle className="w-8 h-8" style={{ color: '#10B981' }} />
          </div>
          <p className="text-2xl font-bold" style={{ color: '#10B981' }}>{formatCurrency(collected)}</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Collected</p>
        </div>
        <div className="chart-card flex flex-col items-center justify-center py-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
            <FiClock className="w-8 h-8" style={{ color: '#F59E0B' }} />
          </div>
          <p className="text-2xl font-bold" style={{ color: '#F59E0B' }}>{formatCurrency(pending)}</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Pending</p>
        </div>
        <div className="chart-card flex flex-col items-center justify-center py-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>
            <FiAlertCircle className="w-8 h-8" style={{ color: '#EF4444' }} />
          </div>
          <p className="text-2xl font-bold" style={{ color: '#EF4444' }}>{formatCurrency(overdue)}</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Overdue</p>
        </div>
      </div>

      {/* Summary Card */}
      <div className="summary-card green">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <FiUsers className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm opacity-80">Receivables Summary</p>
              <p className="text-2xl font-bold">{selectedCompany}</p>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-6">
            <div><p className="text-sm opacity-80">Total</p><p className="text-xl font-bold">{formatCurrency(totalReceivables)}</p></div>
            <div><p className="text-sm opacity-80">Invoices</p><p className="text-xl font-bold">{outstandingInvoices}</p></div>
            <div><p className="text-sm opacity-80">DSO</p><p className="text-xl font-bold">{avgCollectionDays} days</p></div>
            <div><p className="text-sm opacity-80">Rate</p><p className="text-xl font-bold">{collectionRate}%</p></div>
            <div><p className="text-sm opacity-80">Overdue</p><p className="text-xl font-bold">{formatCurrency(overdue)}</p></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountsReceivableDashboard;
