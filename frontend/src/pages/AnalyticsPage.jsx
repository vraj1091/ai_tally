import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { 
  FiRefreshCw, FiTrendingUp, FiTrendingDown, FiAlertCircle, 
  FiDownload, FiActivity, FiLayers, FiTarget, FiAward, FiStar,
  FiArrowUpRight, FiArrowDownRight, FiDollarSign, FiPieChart
} from 'react-icons/fi';

// Cyberpunk neon color palette
const CHART_COLORS = ['#00F5FF', '#BF00FF', '#00FF88', '#FF00E5', '#FF6B00', '#0066FF'];

const AnalyticsPage = () => {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [multiCompanyData, setMultiCompanyData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState('single');
  const [error, setError] = useState(null);

  useEffect(() => { fetchCompanies(); }, []);
  useEffect(() => { if (selectedCompany) fetchAnalytics(selectedCompany); }, [selectedCompany]);

  const fetchCompanies = async () => {
    try {
      let allCompanies = [];
      try {
        const liveResponse = await apiClient.get('/tally/companies', { timeout: 10000 });
        if (liveResponse.data.companies?.length > 0) {
          allCompanies = [...liveResponse.data.companies.map(c => ({ name: c.name || c, source: 'live' }))];
        }
      } catch (e) {}
      try {
        const backupResponse = await apiClient.get('/backup/companies');
        if (backupResponse.data.companies?.length > 0) {
          const backup = backupResponse.data.companies
            .filter(c => !allCompanies.some(l => l.name === (c.name || c)))
            .map(c => ({ name: c.name || c, source: 'backup' }));
          allCompanies = [...allCompanies, ...backup];
        }
      } catch (e) {}
      try {
        const bridgeResponse = await apiClient.get('/bridge/user_tally_bridge/companies');
        if (bridgeResponse.data.companies?.length > 0) {
          const bridge = bridgeResponse.data.companies
            .filter(c => c && c !== '0' && !allCompanies.some(l => l.name === c))
            .map(c => ({ name: c, source: 'bridge' }));
          allCompanies = [...allCompanies, ...bridge];
        }
      } catch (e) {}
      if (allCompanies.length > 0) {
        setCompanies(allCompanies);
        setSelectedCompany(allCompanies.find(c => c.source === 'live')?.name || allCompanies[0].name);
      }
    } catch (error) {}
  };

  const fetchAnalytics = async (companyName, forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const company = companies.find(c => c.name === companyName);
      const source = company?.source || 'live';
      const response = await apiClient.get(`/analytics/company/${encodeURIComponent(companyName)}`, {
        params: { refresh: forceRefresh, source }, timeout: 60000
      });
      if (response.data.success) {
        setAnalytics(response.data.data);
      } else {
        setError('No data available');
        setAnalytics(null);
      }
    } catch (error) {
      setError('Failed to load analytics');
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchMultiCompanyAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/analytics/multi-company');
      if (response.data.success && response.data.data) {
        setMultiCompanyData(response.data.data);
      } else {
        setMultiCompanyData([]);
      }
    } catch (error) {
      setMultiCompanyData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (view === 'single' && selectedCompany) {
        await fetchAnalytics(selectedCompany, true);
      } else {
        await fetchMultiCompanyAnalytics();
      }
      toast.success('Data refreshed!');
    } catch (e) {
      toast.error('Refresh failed');
    } finally {
      setRefreshing(false);
    }
  };

  const formatCurrency = (value) => {
    const abs = Math.abs(value || 0);
    if (abs >= 10000000) return `₹${(abs / 10000000).toFixed(1)}Cr`;
    if (abs >= 100000) return `₹${(abs / 100000).toFixed(1)}L`;
    if (abs >= 1000) return `₹${(abs / 1000).toFixed(1)}K`;
    return `₹${abs.toFixed(0)}`;
  };

  const formatPercent = (v) => `${(v || 0).toFixed(1)}%`;

  const handleExport = () => {
    if (!analytics) return;
    const csv = `Company,${analytics.company_name}\nRevenue,${analytics.total_revenue}\nExpense,${analytics.total_expense}\nProfit,${analytics.net_profit}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${analytics.company_name}_report.csv`;
    link.click();
    toast.success('Report exported!');
  };

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card px-4 py-3">
          <p className="text-white/60 text-xs mb-1">{label}</p>
          {payload.map((p, i) => (
            <p key={i} className="text-sm font-semibold" style={{ color: p.color }}>
              {p.name}: {typeof p.value === 'number' && p.value > 1000 ? formatCurrency(p.value) : p.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Stat Card Component
  const StatCard = ({ label, value, subValue, trend, icon: Icon, gradient }) => (
    <div className="glass-card p-6 group animate-fade-up relative overflow-hidden">
      <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br ${gradient} opacity-10 group-hover:opacity-20 blur-2xl transition-all duration-500`} />
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 text-sm font-bold ${trend >= 0 ? 'text-[#00FF88]' : 'text-[#FF6B00]'}`}>
              {trend >= 0 ? <FiArrowUpRight /> : <FiArrowDownRight />}
              {Math.abs(trend).toFixed(1)}%
            </div>
          )}
        </div>
        <p className="text-white/40 text-xs uppercase tracking-wider font-medium">{label}</p>
        <p className="text-3xl font-black mt-1">{value}</p>
        {subValue && <p className="text-white/40 text-xs mt-2">{subValue}</p>}
      </div>
    </div>
  );

  // Health Ring Component
  const HealthRing = ({ score, status }) => {
    const circumference = 2 * Math.PI * 45;
    const progress = (score / 100) * circumference;
    const color = score >= 80 ? '#00FF88' : score >= 60 ? '#00F5FF' : score >= 40 ? '#FF6B00' : '#FF00E5';
    
    return (
      <div className="glass-card p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-[#BF00FF]/20 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
        <div className="relative flex items-center gap-8">
          <div className="relative">
            <svg className="w-32 h-32 -rotate-90">
              <circle cx="64" cy="64" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
              <circle 
                cx="64" cy="64" r="45" fill="none" stroke={color} strokeWidth="8"
                strokeDasharray={circumference} strokeDashoffset={circumference - progress}
                strokeLinecap="round" className="transition-all duration-1000" style={{ filter: `drop-shadow(0 0 10px ${color})` }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black" style={{ color }}>{Math.round(score)}</span>
              <span className="text-xs text-white/40 uppercase tracking-wider">Score</span>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-2">Business Health</h3>
            <p className="text-white/50 text-sm mb-4">Overall financial wellness indicator based on key metrics</p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold" 
                 style={{ backgroundColor: color + '20', color, border: `1px solid ${color}40` }}>
              <FiAward className="w-4 h-4" />
              {status || (score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Needs Attention')}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-32">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-white/10" />
            <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-transparent border-t-[#00F5FF] animate-spin" 
                 style={{ boxShadow: '0 0 30px rgba(0, 245, 255, 0.3)' }} />
          </div>
          <p className="mt-6 text-white/50 font-medium">Analyzing financial data...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="glass-card p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-[#FF6B00]/20 flex items-center justify-center">
            <FiAlertCircle className="w-10 h-10 text-[#FF6B00]" />
          </div>
          <h3 className="text-xl font-bold mb-2">{error}</h3>
          <p className="text-white/50 mb-6">There was a problem loading your analytics</p>
          <button onClick={handleRefresh} className="btn-neon">Try Again</button>
        </div>
      );
    }

    if (!analytics) {
      return (
        <div className="glass-card p-12 text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-[#00F5FF]/20 to-[#BF00FF]/20 flex items-center justify-center">
            <FiPieChart className="w-12 h-12 text-[#00F5FF]" />
          </div>
          <h3 className="text-2xl font-bold mb-2">Select a Company</h3>
          <p className="text-white/50">Choose from the dropdown above to view detailed analytics</p>
        </div>
      );
    }

    const profitMargin = analytics.profit_margin || 0;
    const revenueData = [
      { name: 'Revenue', value: analytics.total_revenue || 0 },
      { name: 'Expenses', value: analytics.total_expense || 0 },
      { name: 'Profit', value: analytics.net_profit || 0 }
    ];

    const ratiosData = [
      { name: 'Profit %', value: analytics.profit_margin || 0 },
      { name: 'ROA', value: analytics.return_on_assets || 0 },
      { name: 'ROE', value: analytics.return_on_equity || 0 },
      { name: 'Expense %', value: analytics.expense_ratio || 0 }
    ];

    return (
      <div className="space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <StatCard label="Revenue" value={formatCurrency(analytics.total_revenue)} subValue="Total income" trend={12.5} icon={FiTrendingUp} gradient="from-[#00FF88] to-[#00F5FF]" />
          <StatCard label="Expenses" value={formatCurrency(analytics.total_expense)} subValue="Total costs" icon={FiTrendingDown} gradient="from-[#FF6B00] to-[#FF00E5]" />
          <StatCard label="Net Profit" value={formatCurrency(analytics.net_profit)} subValue={`${formatPercent(profitMargin)} margin`} trend={profitMargin} icon={FiTarget} gradient="from-[#00F5FF] to-[#BF00FF]" />
          <StatCard label="Profit Margin" value={formatPercent(profitMargin)} subValue="Efficiency" icon={FiStar} gradient="from-[#BF00FF] to-[#FF00E5]" />
        </div>

        {/* Health Score + Overview Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2">
            <HealthRing score={analytics.health_score || 0} status={analytics.health_status} />
          </div>
          
          <div className="lg:col-span-3 glass-card p-6">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <FiActivity className="text-[#00F5FF]" /> Financial Overview
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenueData} layout="vertical" barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tickFormatter={formatCurrency} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                <YAxis type="category" dataKey="name" width={80} tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  <Cell fill="#00FF88" />
                  <Cell fill="#FF6B00" />
                  <Cell fill="#00F5FF" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ratios + Balance Sheet */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card p-6">
            <h3 className="text-lg font-bold mb-6">Financial Ratios</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={ratiosData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {ratiosData.map((entry, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-lg font-bold mb-6">Balance Sheet</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Assets', value: Math.abs(analytics.total_assets || 0) },
                    { name: 'Liabilities', value: Math.abs(analytics.total_liabilities || 0) },
                    { name: 'Equity', value: Math.abs(analytics.total_equity || 0) }
                  ]}
                  dataKey="value" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4}
                >
                  <Cell fill="#00F5FF" />
                  <Cell fill="#FF00E5" />
                  <Cell fill="#00FF88" />
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={(v) => <span className="text-white/70">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Sources */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {analytics.top_revenue_ledgers?.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#00FF88]" /> Top Revenue Sources
              </h3>
              <div className="space-y-4">
                {analytics.top_revenue_ledgers.slice(0, 5).map((l, i) => {
                  const max = Math.max(...analytics.top_revenue_ledgers.map(x => x.amount || 0));
                  const pct = max > 0 ? ((l.amount || 0) / max) * 100 : 0;
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium text-white/80 truncate max-w-[60%]">{l.name}</span>
                        <span className="font-bold text-[#00FF88]">{formatCurrency(l.amount)}</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#00FF88] to-[#00F5FF] rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {analytics.top_expense_ledgers?.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#FF6B00]" /> Top Expense Categories
              </h3>
              <div className="space-y-4">
                {analytics.top_expense_ledgers.slice(0, 5).map((l, i) => {
                  const max = Math.max(...analytics.top_expense_ledgers.map(x => x.amount || 0));
                  const pct = max > 0 ? ((l.amount || 0) / max) * 100 : 0;
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium text-white/80 truncate max-w-[60%]">{l.name}</span>
                        <span className="font-bold text-[#FF6B00]">{formatCurrency(l.amount)}</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#FF6B00] to-[#FF00E5] rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderMultiCompany = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-32">
          <div className="w-20 h-20 rounded-full border-4 border-transparent border-t-[#BF00FF] animate-spin" />
          <p className="mt-6 text-white/50">Loading comparison...</p>
        </div>
      );
    }

    if (!multiCompanyData.length) {
      return (
        <div className="glass-card p-12 text-center">
          <FiLayers className="w-16 h-16 text-[#BF00FF] mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">No Multi-Company Data</h3>
          <p className="text-white/50 mb-6">Upload data for multiple companies to compare</p>
          <button onClick={() => setView('single')} className="btn-neon">View Single Company</button>
        </div>
      );
    }

    const data = multiCompanyData.map(c => ({
      name: String(c.company_name || 'Unknown').slice(0, 12),
      revenue: Number(c.total_revenue) || 0,
      expense: Number(c.total_expense) || 0,
      profit: Number(c.net_profit) || 0,
      health: Number(c.health_score) || 0
    }));

    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {multiCompanyData.slice(0, 6).map((c, i) => (
            <div key={i} onClick={() => { setSelectedCompany(c.company_name); setView('single'); }}
                 className="glass-card p-6 cursor-pointer group">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold truncate group-hover:text-gradient transition-all">{c.company_name}</h4>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  c.health_score >= 80 ? 'bg-[#00FF88]/20 text-[#00FF88]' :
                  c.health_score >= 60 ? 'bg-[#00F5FF]/20 text-[#00F5FF]' : 'bg-[#FF6B00]/20 text-[#FF6B00]'
                }`}>{Math.round(c.health_score)}%</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-white/50">Revenue</span><span className="font-semibold text-[#00FF88]">{formatCurrency(c.total_revenue)}</span></div>
                <div className="flex justify-between"><span className="text-white/50">Profit</span><span className="font-semibold text-[#00F5FF]">{formatCurrency(c.net_profit)}</span></div>
              </div>
            </div>
          ))}
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-bold mb-6">Company Comparison</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
              <YAxis tickFormatter={formatCurrency} tick={{ fill: 'rgba(255,255,255,0.4)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend formatter={(v) => <span className="text-white/70">{v}</span>} />
              <Bar dataKey="revenue" fill="#00FF88" name="Revenue" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" fill="#FF6B00" name="Expense" radius={[4, 4, 0, 0]} />
              <Bar dataKey="profit" fill="#00F5FF" name="Profit" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-6 lg:p-10">
      {/* Header */}
      <header className="mb-10 animate-fade-up">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <h1 className="text-4xl font-black text-gradient">Analytics</h1>
            <p className="text-white/50 mt-2 text-lg">Deep dive into your financial performance</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={handleExport} disabled={!analytics}
              className="btn-ghost flex items-center gap-2 disabled:opacity-40">
              <FiDownload className="w-4 h-4" /> Export
            </button>
            <button onClick={handleRefresh} disabled={refreshing}
              className="btn-neon flex items-center gap-2 disabled:opacity-40">
              <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </header>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-8 animate-fade-up stagger-1">
        <div className="flex p-1 bg-white/5 rounded-xl border border-white/10">
          <button onClick={() => setView('single')}
            className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${
              view === 'single' ? 'bg-gradient-to-r from-[#00F5FF] to-[#BF00FF] text-white shadow-lg' : 'text-white/50 hover:text-white'
            }`}>
            Single Company
          </button>
          <button onClick={() => { setView('multi'); if (!multiCompanyData.length) fetchMultiCompanyAnalytics(); }}
            className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${
              view === 'multi' ? 'bg-gradient-to-r from-[#00F5FF] to-[#BF00FF] text-white shadow-lg' : 'text-white/50 hover:text-white'
            }`}>
            Multi-Company
          </button>
        </div>

        {view === 'single' && (
          <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)}
            className="input-neon flex-1 cursor-pointer">
            <option value="">Select Company</option>
            {companies.map((c, i) => (
              <option key={i} value={c.name}>
                {c.name} {c.source === 'live' ? '● Live' : c.source === 'bridge' ? '◉ Bridge' : '○ Backup'}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Content */}
      {view === 'single' ? renderContent() : renderMultiCompany()}
    </div>
  );
};

export default AnalyticsPage;
