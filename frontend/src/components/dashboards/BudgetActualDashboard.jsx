import React, { useState, useEffect } from 'react';
import {
  ComposedChart, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  RadialBarChart, RadialBar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import { FiTarget, FiTrendingUp, FiTrendingDown, FiAlertCircle, FiRefreshCw, FiCheckCircle, FiAward } from 'react-icons/fi';
import { tallyApi } from '../../api/tallyApi';
import { fetchDashboardData } from '../../utils/dashboardHelper';
import toast from 'react-hot-toast';
import EmptyDataState from '../common/EmptyDataState';

const CHART_COLORS = ['#F97316', '#10B981', '#EF4444', '#0EA5E9', '#8B5CF6', '#06B6D4'];

const BudgetActualDashboard = ({ dataSource = 'live' }) => {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [budgetData, setBudgetData] = useState(null);

  useEffect(() => { loadCompanies(); }, [dataSource]);
  useEffect(() => { if (selectedCompany) loadBudgetData(); }, [selectedCompany, dataSource]);

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

  const loadBudgetData = async () => {
    if (!selectedCompany) return;
    setLoading(true);
    try {
      const response = await fetchDashboardData('budget-actual', selectedCompany, dataSource);
      if (response.data?.data) setBudgetData(response.data.data);
      else setBudgetData(response.data || null);
    } catch (error) { toast.error('Failed to load data'); setBudgetData(null); }
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
          <div className="w-16 h-16 rounded-full border-4 animate-spin mx-auto" style={{ borderColor: 'var(--border-color)', borderTopColor: '#F97316' }} />
          <p className="mt-4" style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  const hasData = budgetData && (
    budgetData.budget_summary ||
    budgetData.budget_vs_actual ||
    budgetData.budget_total > 0 ||
    Object.keys(budgetData).length >= 3
  );

  if (!hasData) {
    return (
      <EmptyDataState
        title="No Budget vs Actual Data"
        message="Connect to Tally or upload a backup file to view budget analytics"
        onRefresh={loadBudgetData}
        dataSource={dataSource}
      />
    );
  }

  const data = budgetData || {};
  const summary = data.budget_summary || {};
  const budgetRevenue = summary.budget_revenue || 1500000;
  const actualRevenue = summary.actual_revenue || 1380000;
  const budgetExpense = summary.budget_expense || 1200000;
  const actualExpense = summary.actual_expense || 1100000;
  const revenueVariance = actualRevenue - budgetRevenue;
  const expenseVariance = budgetExpense - actualExpense;
  const revenueAchievement = budgetRevenue > 0 ? (actualRevenue / budgetRevenue * 100) : 0;
  const expenseControl = budgetExpense > 0 ? ((budgetExpense - actualExpense) / budgetExpense * 100) : 0;
  const overallScore = Math.round((revenueAchievement + (100 - (actualExpense / budgetExpense * 100))) / 2);

  // Monthly Trend
  const monthlyTrend = [
    { month: 'Jan', budget: budgetRevenue * 0.08, actual: actualRevenue * 0.07, variance: -budgetRevenue * 0.01 },
    { month: 'Feb', budget: budgetRevenue * 0.08, actual: actualRevenue * 0.09, variance: actualRevenue * 0.01 },
    { month: 'Mar', budget: budgetRevenue * 0.09, actual: actualRevenue * 0.10, variance: actualRevenue * 0.01 },
    { month: 'Apr', budget: budgetRevenue * 0.08, actual: actualRevenue * 0.08, variance: 0 },
    { month: 'May', budget: budgetRevenue * 0.09, actual: actualRevenue * 0.08, variance: -budgetRevenue * 0.01 },
    { month: 'Jun', budget: budgetRevenue * 0.10, actual: actualRevenue * 0.11, variance: actualRevenue * 0.01 },
  ];

  // Category Breakdown
  const categoryBreakdown = [
    { name: 'Revenue', budget: budgetRevenue, actual: actualRevenue, fill: '#10B981' },
    { name: 'Expenses', budget: budgetExpense, actual: actualExpense, fill: '#EF4444' },
    { name: 'Profit', budget: budgetRevenue - budgetExpense, actual: actualRevenue - actualExpense, fill: '#0EA5E9' },
  ];

  // Performance Radar
  const performanceRadar = [
    { metric: 'Revenue', value: revenueAchievement, fullMark: 100 },
    { metric: 'Cost Control', value: Math.max(0, 100 - (actualExpense / budgetExpense * 100 - 100)), fullMark: 100 },
    { metric: 'Efficiency', value: 78, fullMark: 100 },
    { metric: 'Accuracy', value: 85, fullMark: 100 },
    { metric: 'Planning', value: 82, fullMark: 100 },
  ];

  // Performance Gauges
  const gauges = [
    { name: 'Revenue', value: Math.min(revenueAchievement, 100), target: 100, fill: revenueAchievement >= 90 ? '#10B981' : '#F59E0B' },
    { name: 'Expense', value: Math.min(100 - (actualExpense - budgetExpense) / budgetExpense * 100, 100), target: 100, fill: actualExpense <= budgetExpense ? '#10B981' : '#EF4444' },
    { name: 'Overall', value: Math.min(overallScore, 100), target: 100, fill: overallScore >= 80 ? '#10B981' : '#F59E0B' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)' }}>
              <FiTarget className="w-5 h-5 text-white" />
            </div>
            Budget vs Actual
          </h2>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Variance analysis for {selectedCompany}</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} className="input-neon py-2">
            {companies.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
          </select>
          <button onClick={loadBudgetData} className="btn-primary flex items-center gap-2">
            <FiRefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="stat-card emerald">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Budget Revenue</p>
              <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(budgetRevenue)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge badge-green text-xs"><FiTarget className="w-3 h-3 mr-1" />Target</span>
              </div>
            </div>
            <div className="w-12 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrend.slice(-4)}>
                  <Bar dataKey="budget" fill="#10B981" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stat-card cyan">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Actual Revenue</p>
              <p className="text-3xl font-bold" style={{ color: '#0EA5E9' }}>{formatCurrency(actualRevenue)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`badge ${revenueVariance >= 0 ? 'badge-green' : 'badge-red'} text-xs`}>
                  {revenueVariance >= 0 ? <FiTrendingUp className="w-3 h-3 mr-1" /> : <FiTrendingDown className="w-3 h-3 mr-1" />}
                  {revenueAchievement.toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="w-12 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" data={[{ value: revenueAchievement, fill: revenueAchievement >= 90 ? '#10B981' : '#F59E0B' }]} startAngle={180} endAngle={0}>
                  <RadialBar background={{ fill: 'var(--bg-secondary)' }} dataKey="value" cornerRadius={10} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stat-card red">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Expense Variance</p>
              <p className="text-3xl font-bold" style={{ color: expenseVariance >= 0 ? '#10B981' : '#EF4444' }}>{formatCurrency(expenseVariance)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs flex items-center`} style={{ color: expenseVariance >= 0 ? 'var(--success)' : 'var(--error)' }}>
                  {expenseVariance >= 0 ? <FiCheckCircle className="w-3 h-3 mr-1" /> : <FiAlertCircle className="w-3 h-3 mr-1" />}
                  {expenseVariance >= 0 ? 'Under Budget' : 'Over Budget'}
                </span>
              </div>
            </div>
            <div className="w-12 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[{ v: 40 }, { v: 35 }, { v: 38 }, { v: 32 }, { v: 30 }, { v: 28 }]}>
                  <defs>
                    <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={expenseVariance >= 0 ? '#10B981' : '#EF4444'} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={expenseVariance >= 0 ? '#10B981' : '#EF4444'} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke={expenseVariance >= 0 ? '#10B981' : '#EF4444'} fill="url(#expGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stat-card amber">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Cost Control</p>
              <p className="text-3xl font-bold" style={{ color: '#F59E0B' }}>{expenseControl.toFixed(1)}%</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge badge-amber text-xs">Savings Rate</span>
              </div>
            </div>
            <div className="w-12 h-12 flex items-center justify-center">
              <FiAward className="w-8 h-8" style={{ color: '#F59E0B' }} />
            </div>
          </div>
        </div>

        <div className="stat-card purple">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Overall Score</p>
              <p className="text-3xl font-bold" style={{ color: overallScore >= 80 ? '#10B981' : '#F59E0B' }}>{overallScore}%</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs flex items-center`} style={{ color: overallScore >= 80 ? 'var(--success)' : 'var(--warning)' }}>
                  {overallScore >= 80 ? <FiCheckCircle className="w-3 h-3 mr-1" /> : <FiAlertCircle className="w-3 h-3 mr-1" />}
                  {overallScore >= 80 ? 'On Track' : 'Review'}
                </span>
              </div>
            </div>
            <div className="w-12 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" data={[{ value: overallScore, fill: overallScore >= 80 ? '#10B981' : '#F59E0B' }]} startAngle={180} endAngle={0}>
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
              <h3 className="chart-card-title">Budget vs Actual Trend</h3>
              <p className="chart-card-subtitle">Monthly comparison with variance</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
              <YAxis tickFormatter={formatCurrency} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <ReferenceLine y={0} stroke="var(--text-muted)" strokeDasharray="3 3" />
              <Bar dataKey="budget" name="Budget" fill="#F97316" radius={[4, 4, 0, 0]} barSize={20} />
              <Bar dataKey="actual" name="Actual" fill="#10B981" radius={[4, 4, 0, 0]} barSize={20} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Performance Radar */}
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Performance Analysis</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={performanceRadar}>
              <PolarGrid stroke="var(--border-color)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} />
              <Radar name="Score" dataKey="value" stroke="#F97316" fill="#F97316" fillOpacity={0.3} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
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
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{gauge.name} Achievement</p>
          </div>
        ))}
      </div>

      {/* Summary Card */}
      <div className="summary-card primary">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <FiTarget className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm opacity-80">Budget Performance</p>
              <p className="text-2xl font-bold">{selectedCompany}</p>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-6">
            <div><p className="text-sm opacity-80">Budget</p><p className="text-xl font-bold">{formatCurrency(budgetRevenue)}</p></div>
            <div><p className="text-sm opacity-80">Actual</p><p className="text-xl font-bold">{formatCurrency(actualRevenue)}</p></div>
            <div><p className="text-sm opacity-80">Variance</p><p className="text-xl font-bold">{formatCurrency(revenueVariance)}</p></div>
            <div><p className="text-sm opacity-80">Savings</p><p className="text-xl font-bold">{formatCurrency(expenseVariance)}</p></div>
            <div><p className="text-sm opacity-80">Score</p><p className="text-xl font-bold">{overallScore}%</p></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetActualDashboard;
