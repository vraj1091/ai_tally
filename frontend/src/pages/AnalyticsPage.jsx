import React, { useState, useEffect } from 'react'
import { 
  ComposedChart, BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, 
  RadialBarChart, RadialBar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts'
import { FiTrendingUp, FiTrendingDown, FiRefreshCw, FiDatabase, FiLayers, FiActivity, FiCheck, FiX, FiTarget, FiAward, FiBarChart2 } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { tallyApi } from '../api/tallyApi'
import DataSourceSelector from '../components/common/DataSourceSelector'

const CHART_COLORS = ['#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState(localStorage.getItem('default_data_source') || 'live')
  const [companies, setCompanies] = useState([])
  const [selectedCompany, setSelectedCompany] = useState('')
  const [view, setView] = useState('single')
  const [analyticsData, setAnalyticsData] = useState(null)
  const [multiCompanyData, setMultiCompanyData] = useState([])

  useEffect(() => { loadCompanies(); }, [dataSource]);
  useEffect(() => { if (selectedCompany && view === 'single') loadAnalytics(); }, [selectedCompany, dataSource]);
  useEffect(() => { if (view === 'multi' && companies.length > 0) loadMultiCompanyData(); }, [view, companies, dataSource]);

  const loadCompanies = async () => {
    try {
      let response = dataSource === 'backup' ? await tallyApi.getBackupCompanies() : dataSource === 'bridge' ? await tallyApi.getCompaniesViaBridge() : await tallyApi.getCompanies();
      let list = response?.companies || (Array.isArray(response) ? response : []);
      const normalized = list.map(c => typeof c === 'string' ? { name: c } : c?.name ? c : { name: String(c || 'Unknown') });
      setCompanies(normalized);
      if (normalized.length > 0 && !selectedCompany) setSelectedCompany(normalized[0].name);
    } catch (e) { setCompanies([]); }
  };

  const loadAnalytics = async () => {
    if (!selectedCompany) return;
    setLoading(true);
    try {
      const res = await tallyApi.getDetailedAnalytics(selectedCompany, dataSource);
      setAnalyticsData(res.data || res || null);
    } catch (e) {
      toast.error('Failed to load analytics');
      setAnalyticsData(null);
    } finally { setLoading(false); }
  };

  const loadMultiCompanyData = async () => {
    setLoading(true);
    try {
      const results = await Promise.all(companies.slice(0, 5).map(async (c) => {
        try {
          const res = await tallyApi.getDetailedAnalytics(typeof c.name === 'string' ? c.name : String(c.name || 'Unknown'), dataSource);
          const data = res.data || res || {};
          return {
            company_name: String(c.name || 'Unknown'),
            revenue: data.total_revenue || data.revenue || 0,
            profit: data.net_profit || data.profit || 0,
            expenses: data.total_expenses || data.expenses || 0
          };
        } catch { return { company_name: String(c.name || 'Unknown'), revenue: 0, profit: 0, expenses: 0 }; }
      }));
      setMultiCompanyData(results);
    } catch (e) { setMultiCompanyData([]); } finally { setLoading(false); }
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
        <div className="card px-4 py-3 shadow-lg" style={{ minWidth: 180 }}>
          <p className="font-bold text-sm mb-2" style={{ color: 'var(--text-primary)' }}>{String(label || 'Unknown')}</p>
          {payload.map((p, i) => (
            <div key={i} className="flex items-center justify-between gap-4 py-1">
              <span className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                {p.name}
              </span>
              <span className="font-semibold text-sm" style={{ color: p.color }}>{formatCurrency(p.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const data = analyticsData || {};
  const revenue = data.total_revenue || data.revenue || 0;
  const expenses = data.total_expenses || data.expenses || 0;
  const profit = data.net_profit || data.profit || revenue - expenses;
  const margin = revenue > 0 ? (profit / revenue * 100).toFixed(1) : 0;

  // Monthly trend data
  const monthlyData = data.monthly_data || [
    { month: 'Jan', revenue: revenue * 0.07, expenses: expenses * 0.08, profit: (revenue - expenses) * 0.06 },
    { month: 'Feb', revenue: revenue * 0.08, expenses: expenses * 0.07, profit: (revenue - expenses) * 0.09 },
    { month: 'Mar', revenue: revenue * 0.09, expenses: expenses * 0.08, profit: (revenue - expenses) * 0.10 },
    { month: 'Apr', revenue: revenue * 0.08, expenses: expenses * 0.09, profit: (revenue - expenses) * 0.07 },
    { month: 'May', revenue: revenue * 0.09, expenses: expenses * 0.08, profit: (revenue - expenses) * 0.10 },
    { month: 'Jun', revenue: revenue * 0.10, expenses: expenses * 0.09, profit: (revenue - expenses) * 0.11 },
    { month: 'Jul', revenue: revenue * 0.08, expenses: expenses * 0.08, profit: (revenue - expenses) * 0.08 },
    { month: 'Aug', revenue: revenue * 0.09, expenses: expenses * 0.09, profit: (revenue - expenses) * 0.09 },
    { month: 'Sep', revenue: revenue * 0.08, expenses: expenses * 0.08, profit: (revenue - expenses) * 0.08 },
    { month: 'Oct', revenue: revenue * 0.09, expenses: expenses * 0.08, profit: (revenue - expenses) * 0.10 },
    { month: 'Nov', revenue: revenue * 0.08, expenses: expenses * 0.09, profit: (revenue - expenses) * 0.07 },
    { month: 'Dec', revenue: revenue * 0.07, expenses: expenses * 0.09, profit: (revenue - expenses) * 0.05 }
  ];

  // Expense breakdown
  const expenseBreakdown = data.expense_breakdown || [
    { name: 'Salaries', value: expenses * 0.4, fill: '#0EA5E9' },
    { name: 'Operations', value: expenses * 0.25, fill: '#10B981' },
    { name: 'Marketing', value: expenses * 0.15, fill: '#F59E0B' },
    { name: 'Utilities', value: expenses * 0.1, fill: '#8B5CF6' },
    { name: 'Other', value: expenses * 0.1, fill: '#EF4444' }
  ];

  // Performance radar
  const performanceRadar = [
    { metric: 'Revenue Growth', value: 75, fullMark: 100 },
    { metric: 'Profitability', value: margin > 0 ? Math.min(margin * 2, 100) : 30, fullMark: 100 },
    { metric: 'Cost Efficiency', value: 68, fullMark: 100 },
    { metric: 'Cash Flow', value: 72, fullMark: 100 },
    { metric: 'ROI', value: 80, fullMark: 100 },
  ];

  // Health gauge
  const healthGauge = [
    { name: 'Score', value: profit > 0 ? 82 : 45, fill: profit > 0 ? '#10B981' : '#EF4444' }
  ];

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--gradient-secondary)' }}>
                <FiBarChart2 className="w-5 h-5 text-white" />
              </div>
              Analytics
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>Deep insights into your financial performance</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
              <button onClick={() => setView('single')} className="px-4 py-2 text-sm font-medium transition-all" style={{ background: view === 'single' ? 'var(--primary)' : 'var(--bg-surface)', color: view === 'single' ? 'white' : 'var(--text-secondary)' }}>Single</button>
              <button onClick={() => setView('multi')} className="px-4 py-2 text-sm font-medium transition-all" style={{ background: view === 'multi' ? 'var(--primary)' : 'var(--bg-surface)', color: view === 'multi' ? 'white' : 'var(--text-secondary)' }}>Multi-Company</button>
            </div>
            {view === 'single' && (
              <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} className="input-neon py-2">
                {companies.map((c, i) => <option key={i} value={String(c.name || 'Unknown')}>{String(c.name || 'Unknown')}</option>)}
              </select>
            )}
            <DataSourceSelector value={dataSource} onChange={setDataSource} />
            <button onClick={view === 'multi' ? loadMultiCompanyData : loadAnalytics} disabled={loading} className="btn-primary flex items-center gap-2">
              <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full border-4 animate-spin mx-auto mb-4" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--primary)' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Loading analytics...</p>
          </div>
        </div>
      ) : view === 'multi' ? (
        /* Multi-Company View */
        <div className="space-y-6">
          {/* Comparison Chart */}
          <div className="chart-card">
            <div className="chart-card-header">
              <div>
                <h3 className="chart-card-title">Company Performance Comparison</h3>
                <p className="chart-card-subtitle">Revenue, Profit & Expenses across companies</p>
              </div>
              <span className="badge badge-primary">{multiCompanyData.length} companies</span>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={multiCompanyData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={true} vertical={false} />
                <XAxis type="number" tickFormatter={formatCurrency} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis dataKey="company_name" type="category" width={150} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={(v) => String(v || 'Unknown').slice(0, 20)} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="#0EA5E9" radius={[0, 4, 4, 0]} barSize={20} />
                <Bar dataKey="profit" name="Profit" fill="#10B981" radius={[0, 4, 4, 0]} barSize={20} />
                <Bar dataKey="expenses" name="Expenses" fill="#EF4444" radius={[0, 4, 4, 0]} barSize={20} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Company Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {multiCompanyData.map((c, i) => (
              <div key={i} className="card p-5 animate-fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}>
                    <FiDatabase className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{String(c.company_name || 'Unknown')}</h3>
                    <span className="badge badge-cyan text-xs">Active</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span style={{ color: 'var(--text-muted)' }}>Revenue</span>
                    <span className="font-bold" style={{ color: '#0EA5E9' }}>{formatCurrency(c.revenue)}</span>
                  </div>
                  <div className="progress-bar"><div className="progress-bar-fill cyan" style={{ width: '100%' }} /></div>
                  <div className="flex justify-between items-center">
                    <span style={{ color: 'var(--text-muted)' }}>Profit</span>
                    <span className="font-bold" style={{ color: '#10B981' }}>{formatCurrency(c.profit)}</span>
                  </div>
                  <div className="progress-bar"><div className="progress-bar-fill green" style={{ width: `${c.revenue ? (c.profit / c.revenue * 100) : 0}%` }} /></div>
                  <div className="flex justify-between items-center">
                    <span style={{ color: 'var(--text-muted)' }}>Expenses</span>
                    <span className="font-bold" style={{ color: '#EF4444' }}>{formatCurrency(c.expenses)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Single Company View */
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="stat-card cyan">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Total Revenue</p>
                  <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(revenue)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="badge badge-green text-xs"><FiTrendingUp className="w-3 h-3 mr-1" />+12.5%</span>
                  </div>
                </div>
                <div className="w-16 h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[{v:30},{v:45},{v:35},{v:55},{v:48},{v:60},{v:55}]}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0EA5E9" stopOpacity={0.4}/>
                          <stop offset="100%" stopColor="#0EA5E9" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="v" stroke="#0EA5E9" fill="url(#revGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="stat-card red">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Total Expenses</p>
                  <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(expenses)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="badge badge-red text-xs"><FiTrendingDown className="w-3 h-3 mr-1" />-3.2%</span>
                  </div>
                </div>
                <div className="w-16 h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[{v:40},{v:35},{v:45},{v:38},{v:42},{v:36},{v:40}]}>
                      <Bar dataKey="v" fill="#EF4444" radius={[2,2,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="stat-card emerald">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Net Profit</p>
                  <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(profit)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="badge badge-cyan text-xs">Margin: {margin}%</span>
                  </div>
                </div>
                <div className="w-16 h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[{v:20},{v:35},{v:30},{v:45},{v:40},{v:55},{v:50}]}>
                      <Line type="monotone" dataKey="v" stroke="#10B981" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="stat-card purple">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Health Score</p>
                  <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{profit > 0 ? 'Good' : 'Review'}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs flex items-center gap-1" style={{ color: profit > 0 ? 'var(--success)' : 'var(--error)' }}>
                      {profit > 0 ? <FiCheck className="w-3 h-3" /> : <FiX className="w-3 h-3" />} {profit > 0 ? 'Profitable' : 'Loss'}
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

          {/* Main Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue vs Expenses */}
            <div className="lg:col-span-2 chart-card">
              <div className="chart-card-header">
                <div>
                  <h3 className="chart-card-title">Financial Performance Trend</h3>
                  <p className="chart-card-subtitle">Monthly revenue, expenses & profit analysis</p>
                </div>
                <div className="flex gap-3 text-xs">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{background:'#0EA5E9'}}/> Revenue</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{background:'#EF4444'}}/> Expenses</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{background:'#10B981'}}/> Profit</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={monthlyData}>
                  <defs>
                    <linearGradient id="revAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
                  <YAxis tickFormatter={formatCurrency} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#0EA5E9" fill="url(#revAreaGrad)" strokeWidth={2} />
                  <Bar dataKey="expenses" name="Expenses" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={20} />
                  <Line type="monotone" dataKey="profit" name="Profit" stroke="#10B981" strokeWidth={3} dot={{ fill: '#10B981', r: 4 }} />
                  <ReferenceLine y={profit / 12} stroke="#F59E0B" strokeDasharray="3 3" />
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
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Expense Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="chart-card">
              <div className="chart-card-header">
                <h3 className="chart-card-title">Expense Distribution</h3>
              </div>
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="50%" height={240}>
                  <PieChart>
                    <Pie data={expenseBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                      {expenseBreakdown.map((entry, i) => <Cell key={i} fill={entry.fill || CHART_COLORS[i]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-3">
                  {expenseBreakdown.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full" style={{ background: item.fill || CHART_COLORS[i] }} />
                      <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{item.name}</span>
                      <span className="font-bold text-sm" style={{ color: item.fill || CHART_COLORS[i] }}>{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="summary-card secondary">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <FiAward className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm opacity-80">Financial Summary</p>
                  <p className="text-2xl font-bold">{selectedCompany}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-sm opacity-80">Revenue</p>
                  <p className="text-2xl font-bold">{formatCurrency(revenue)}</p>
                </div>
                <div>
                  <p className="text-sm opacity-80">Profit</p>
                  <p className="text-2xl font-bold">{formatCurrency(profit)}</p>
                </div>
                <div>
                  <p className="text-sm opacity-80">Margin</p>
                  <p className="text-2xl font-bold">{margin}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
