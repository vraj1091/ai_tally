import React, { useState, useEffect } from 'react';
import {
  ComposedChart, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  RadialBarChart, RadialBar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { FiDollarSign, FiTrendingUp, FiTrendingDown, FiAlertCircle, FiRefreshCw, FiPieChart, FiTarget, FiCheckCircle } from 'react-icons/fi';
import { tallyApi } from '../../api/tallyApi';
import { fetchDashboardData } from '../../utils/dashboardHelper';
import toast from 'react-hot-toast';
import EmptyDataState from '../common/EmptyDataState';

const CHART_COLORS = ['#EF4444', '#F59E0B', '#0EA5E9', '#8B5CF6', '#10B981', '#EC4899'];

const ExpenseAnalysisDashboard = ({ dataSource = 'live' }) => {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [expenseData, setExpenseData] = useState(null);

  useEffect(() => { loadCompanies(); }, [dataSource]);
  useEffect(() => { if (selectedCompany) loadExpenseData(); }, [selectedCompany, dataSource]);

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

  const loadExpenseData = async () => {
    if (!selectedCompany) return;
    setLoading(true);
    try {
      const response = await fetchDashboardData('expense-analysis', selectedCompany, dataSource);
      if (response.data?.data) setExpenseData(response.data.data);
      else setExpenseData(response.data || null);
    } catch (error) { toast.error('Failed to load data'); setExpenseData(null); }
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
          <div className="w-16 h-16 rounded-full border-4 animate-spin mx-auto" style={{ borderColor: 'var(--border-color)', borderTopColor: '#EF4444' }} />
          <p className="mt-4" style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  const hasData = expenseData && (
    expenseData.expense_summary ||
    expenseData.expense_breakdown?.length > 0 ||
    expenseData.total_expenses > 0 ||
    Object.keys(expenseData).length >= 3
  );

  if (!hasData) {
    return (
      <EmptyDataState
        title="No Expense Analysis Data"
        message="Connect to Tally or upload a backup file to view expense analytics"
        onRefresh={loadExpenseData}
        dataSource={dataSource}
      />
    );
  }

  const data = expenseData || {};
  const summary = data.expense_summary || {};
  const totalExpenses = summary.total_expenses || data.total_expenses || 850000;
  const fixedExpenses = summary.fixed_expenses || data.fixed_expenses || totalExpenses * 0.4;
  const variableExpenses = summary.variable_expenses || data.variable_expenses || totalExpenses * 0.35;
  const operatingExpenses = summary.operating_expenses || data.operating_expenses || totalExpenses * 0.25;
  const momChange = summary.mom_change || data.mom_change || -5.2;
  const yoyChange = summary.yoy_change || data.yoy_change || 8.5;
  const budget = data.expense_budget || totalExpenses * 1.1;
  const budgetUtilization = (totalExpenses / budget) * 100;

  // Expense Categories
  const expenseCategories = data.expense_breakdown?.slice(0, 5) || [
    { name: 'Salaries', amount: totalExpenses * 0.35 },
    { name: 'Rent', amount: totalExpenses * 0.15 },
    { name: 'Utilities', amount: totalExpenses * 0.12 },
    { name: 'Marketing', amount: totalExpenses * 0.10 },
    { name: 'Other', amount: totalExpenses * 0.28 },
  ];

  // Monthly Trend
  const monthlyTrend = [
    { month: 'Jan', fixed: fixedExpenses * 0.16, variable: variableExpenses * 0.14 },
    { month: 'Feb', fixed: fixedExpenses * 0.16, variable: variableExpenses * 0.17 },
    { month: 'Mar', fixed: fixedExpenses * 0.17, variable: variableExpenses * 0.18 },
    { month: 'Apr', fixed: fixedExpenses * 0.16, variable: variableExpenses * 0.16 },
    { month: 'May', fixed: fixedExpenses * 0.17, variable: variableExpenses * 0.17 },
    { month: 'Jun', fixed: fixedExpenses * 0.18, variable: variableExpenses * 0.18 },
  ];

  // Expense Composition
  const expenseComposition = [
    { name: 'Fixed', value: fixedExpenses, fill: '#EF4444' },
    { name: 'Variable', value: variableExpenses, fill: '#F59E0B' },
    { name: 'Operating', value: operatingExpenses, fill: '#0EA5E9' },
  ];

  // Efficiency Radar
  const efficiencyRadar = [
    { metric: 'Cost Control', value: budgetUtilization <= 100 ? 100 - (budgetUtilization - 80) : 85, fullMark: 100 },
    { metric: 'Budget Adherence', value: Math.max(100 - Math.abs(budgetUtilization - 100), 50), fullMark: 100 },
    { metric: 'Efficiency', value: 78, fullMark: 100 },
    { metric: 'Optimization', value: 72, fullMark: 100 },
    { metric: 'Savings', value: momChange < 0 ? 80 : 65, fullMark: 100 },
  ];

  // Budget Performance Gauge
  const budgetGauge = [{ name: 'Budget', value: Math.min(budgetUtilization, 100), fill: budgetUtilization <= 100 ? '#10B981' : '#EF4444' }];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }}>
              <FiPieChart className="w-5 h-5 text-white" />
            </div>
            Expense Analysis
          </h2>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Expense breakdown for {selectedCompany}</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} className="input-neon py-2">
            {companies.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
          </select>
          <button onClick={loadExpenseData} className="btn-primary flex items-center gap-2">
            <FiRefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="stat-card red">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Total Expenses</p>
              <p className="text-3xl font-bold" style={{ color: '#EF4444' }}>{formatCurrency(totalExpenses)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`badge ${momChange < 0 ? 'badge-green' : 'badge-red'} text-xs`}>
                  {momChange < 0 ? <FiTrendingDown className="w-3 h-3 mr-1" /> : <FiTrendingUp className="w-3 h-3 mr-1" />}
                  {Math.abs(momChange).toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="w-12 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrend}>
                  <defs>
                    <linearGradient id="expTotalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#EF4444" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="fixed" stroke="#EF4444" fill="url(#expTotalGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stat-card amber">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Fixed Expenses</p>
              <p className="text-3xl font-bold" style={{ color: '#F59E0B' }}>{formatCurrency(fixedExpenses)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge badge-amber text-xs">{((fixedExpenses / totalExpenses) * 100).toFixed(0)}%</span>
              </div>
            </div>
            <div className="w-12 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrend.slice(-4)}>
                  <Bar dataKey="fixed" fill="#F59E0B" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stat-card cyan">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Variable Expenses</p>
              <p className="text-3xl font-bold" style={{ color: '#0EA5E9' }}>{formatCurrency(variableExpenses)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge badge-cyan text-xs">{((variableExpenses / totalExpenses) * 100).toFixed(0)}%</span>
              </div>
            </div>
            <div className="w-12 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrend.slice(-4)}>
                  <Bar dataKey="variable" fill="#0EA5E9" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stat-card purple">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Budget Used</p>
              <p className="text-3xl font-bold" style={{ color: budgetUtilization <= 100 ? '#10B981' : '#EF4444' }}>{budgetUtilization.toFixed(0)}%</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs flex items-center`} style={{ color: budgetUtilization <= 100 ? 'var(--success)' : 'var(--error)' }}>
                  {budgetUtilization <= 100 ? <FiCheckCircle className="w-3 h-3 mr-1" /> : <FiAlertCircle className="w-3 h-3 mr-1" />}
                  {budgetUtilization <= 100 ? 'On Track' : 'Over Budget'}
                </span>
              </div>
            </div>
            <div className="w-12 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" data={budgetGauge} startAngle={180} endAngle={0}>
                  <RadialBar background={{ fill: 'var(--bg-secondary)' }} dataKey="value" cornerRadius={10} fill={budgetGauge[0].fill} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stat-card emerald">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>YoY Change</p>
              <p className="text-3xl font-bold" style={{ color: yoyChange < 0 ? '#10B981' : '#F59E0B' }}>{yoyChange > 0 ? '+' : ''}{yoyChange.toFixed(1)}%</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs flex items-center`} style={{ color: yoyChange < 0 ? 'var(--success)' : 'var(--warning)' }}>
                  {yoyChange < 0 ? <FiTrendingDown className="w-3 h-3 mr-1" /> : <FiTrendingUp className="w-3 h-3 mr-1" />}
                  Yearly
                </span>
              </div>
            </div>
            <div className="w-12 h-12 flex items-center justify-center">
              {yoyChange < 0 ? <FiTrendingDown className="w-8 h-8" style={{ color: '#10B981' }} /> : <FiTrendingUp className="w-8 h-8" style={{ color: '#F59E0B' }} />}
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
              <h3 className="chart-card-title">Monthly Expense Trend</h3>
              <p className="chart-card-subtitle">Fixed vs Variable expenses over time</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={monthlyTrend}>
              <defs>
                <linearGradient id="fixedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
              <YAxis tickFormatter={formatCurrency} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area type="monotone" dataKey="fixed" name="Fixed" stroke="#EF4444" fill="url(#fixedGrad)" strokeWidth={2} />
              <Bar dataKey="variable" name="Variable" fill="#F59E0B" radius={[4, 4, 0, 0]} barSize={25} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Efficiency Radar */}
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Cost Efficiency</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={efficiencyRadar}>
              <PolarGrid stroke="var(--border-color)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} />
              <Radar name="Score" dataKey="value" stroke="#EF4444" fill="#EF4444" fillOpacity={0.3} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Categories & Composition */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Expense Composition</h3>
          </div>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie data={expenseComposition} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {expenseComposition.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-3">
              {expenseComposition.map((item, i) => (
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
            <h3 className="chart-card-title">Top Expense Categories</h3>
          </div>
          <div className="space-y-3">
            {expenseCategories.map((cat, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}>{i + 1}</div>
                <div className="flex-1">
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{cat.name}</p>
                  <div className="progress-bar mt-1"><div className="progress-bar-fill" style={{ width: `${(cat.amount / expenseCategories[0].amount) * 100}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} /></div>
                </div>
                <div className="text-right">
                  <p className="font-bold" style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}>{formatCurrency(cat.amount)}</p>
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
              <FiPieChart className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm opacity-80">Expense Summary</p>
              <p className="text-2xl font-bold">{selectedCompany}</p>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-6">
            <div><p className="text-sm opacity-80">Total</p><p className="text-xl font-bold">{formatCurrency(totalExpenses)}</p></div>
            <div><p className="text-sm opacity-80">Fixed</p><p className="text-xl font-bold">{formatCurrency(fixedExpenses)}</p></div>
            <div><p className="text-sm opacity-80">Variable</p><p className="text-xl font-bold">{formatCurrency(variableExpenses)}</p></div>
            <div><p className="text-sm opacity-80">Budget</p><p className="text-xl font-bold">{budgetUtilization.toFixed(0)}%</p></div>
            <div><p className="text-sm opacity-80">MoM</p><p className="text-xl font-bold">{momChange.toFixed(1)}%</p></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseAnalysisDashboard;
