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
  FiArrowUpRight, FiArrowDownRight, FiMoreHorizontal, FiEye
} from 'react-icons/fi';

// Unique warm color palette - Coral, Amber, Sage
const CHART_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];

const AnalyticsPage = () => {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [multiCompanyData, setMultiCompanyData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState('single');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      fetchAnalytics(selectedCompany);
    }
  }, [selectedCompany]);

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
    } catch (error) {
      console.error('Error fetching companies');
    }
  };

  const fetchAnalytics = async (companyName, forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const company = companies.find(c => c.name === companyName);
      const source = company?.source || 'live';
      
      const response = await apiClient.get(`/analytics/company/${encodeURIComponent(companyName)}`, {
        params: { refresh: forceRefresh, source },
        timeout: 60000
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
      toast.success('Data refreshed');
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
    toast.success('Exported!');
  };

  // Stat Card with glassmorphism
  const StatCard = ({ label, value, subValue, trend, icon: Icon, accent }) => (
    <div className="group relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${accent} opacity-5 group-hover:opacity-10 transition-opacity duration-500`} />
      <div className="relative bg-white/70 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.12)] transition-all duration-500 hover:-translate-y-1">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${accent} flex items-center justify-center shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 text-sm font-semibold ${trend >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
              {trend >= 0 ? <FiArrowUpRight /> : <FiArrowDownRight />}
              {Math.abs(trend).toFixed(1)}%
            </div>
          )}
        </div>
        <p className="text-slate-500 text-sm font-medium tracking-wide uppercase">{label}</p>
        <p className="text-3xl font-black text-slate-800 mt-1 tracking-tight">{value}</p>
        {subValue && <p className="text-slate-400 text-xs mt-2">{subValue}</p>}
      </div>
    </div>
  );

  // Circular Progress for Health Score
  const HealthRing = ({ score, status }) => {
    const circumference = 2 * Math.PI * 45;
    const progress = (score / 100) * circumference;
    const color = score >= 80 ? '#10B981' : score >= 60 ? '#3B82F6' : score >= 40 ? '#F59E0B' : '#EF4444';
    
    return (
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-white/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-white/5 to-transparent rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative flex items-center gap-8">
          <div className="relative">
            <svg className="w-32 h-32 -rotate-90">
              <circle cx="64" cy="64" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
              <circle 
                cx="64" cy="64" r="45" fill="none" stroke={color} strokeWidth="8"
                strokeDasharray={circumference} strokeDashoffset={circumference - progress}
                strokeLinecap="round" className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black">{Math.round(score)}</span>
              <span className="text-xs text-slate-400 uppercase tracking-wider">Score</span>
            </div>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-2">Business Health</h3>
            <p className="text-slate-400 text-sm mb-4">Overall financial wellness indicator</p>
            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold`}
                  style={{ backgroundColor: color + '20', color }}>
              <FiAward className="w-4 h-4" />
              {status || (score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Needs Attention')}
            </span>
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
            <div className="w-20 h-20 rounded-full border-4 border-slate-200" />
            <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-transparent border-t-rose-500 animate-spin" />
          </div>
          <p className="mt-6 text-slate-500 font-medium">Crunching numbers...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-20 bg-rose-50 rounded-3xl border-2 border-dashed border-rose-200">
          <FiAlertCircle className="w-16 h-16 text-rose-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-rose-800 mb-2">Oops! Something went wrong</h3>
          <p className="text-rose-600 mb-6">{error}</p>
          <button onClick={handleRefresh} className="px-6 py-3 bg-rose-500 text-white rounded-xl font-semibold hover:bg-rose-600 transition-colors">
            Try Again
          </button>
        </div>
      );
    }

    if (!analytics) {
      return (
        <div className="text-center py-20">
          <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
            <FiLayers className="w-12 h-12 text-amber-600" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-2">Select a Company</h3>
          <p className="text-slate-500">Choose from the dropdown above to view analytics</p>
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
      { name: 'Profit Margin', value: analytics.profit_margin || 0, fill: '#FF6B6B' },
      { name: 'ROA', value: analytics.return_on_assets || 0, fill: '#4ECDC4' },
      { name: 'ROE', value: analytics.return_on_equity || 0, fill: '#45B7D1' },
      { name: 'Expense Ratio', value: analytics.expense_ratio || 0, fill: '#96CEB4' }
    ];

    return (
      <div className="space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <StatCard 
            label="Revenue" 
            value={formatCurrency(analytics.total_revenue)} 
            subValue="Total income generated"
            trend={12.5}
            icon={FiTrendingUp} 
            accent="from-emerald-400 to-teal-500" 
          />
          <StatCard 
            label="Expenses" 
            value={formatCurrency(analytics.total_expense)} 
            subValue="Total costs incurred"
            icon={FiTrendingDown} 
            accent="from-rose-400 to-pink-500" 
          />
          <StatCard 
            label="Net Profit" 
            value={formatCurrency(analytics.net_profit)} 
            subValue={`${formatPercent(profitMargin)} margin`}
            trend={profitMargin}
            icon={FiTarget} 
            accent="from-blue-400 to-indigo-500" 
          />
          <StatCard 
            label="Profit Margin" 
            value={formatPercent(profitMargin)} 
            subValue="Profitability ratio"
            icon={FiStar} 
            accent="from-amber-400 to-orange-500" 
          />
        </div>

        {/* Health Score + Revenue Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2">
            <HealthRing score={analytics.health_score || 0} status={analytics.health_status} />
          </div>
          
          <div className="lg:col-span-3 bg-white/70 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <FiActivity className="text-blue-500" />
              Financial Overview
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenueData} layout="vertical" barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                <XAxis type="number" tickFormatter={formatCurrency} tick={{ fill: '#64748B', fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={80} tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} />
                <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  <Cell fill="#10B981" />
                  <Cell fill="#EF4444" />
                  <Cell fill="#3B82F6" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ratios Chart + Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Financial Ratios</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={ratiosData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} />
                <Tooltip formatter={(v) => formatPercent(v)} contentStyle={{ borderRadius: 16, border: 'none' }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {ratiosData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Balance Sheet</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Assets', value: Math.abs(analytics.total_assets || 0) },
                    { name: 'Liabilities', value: Math.abs(analytics.total_liabilities || 0) },
                    { name: 'Equity', value: Math.abs(analytics.total_equity || 0) }
                  ]}
                  dataKey="value"
                  cx="50%" cy="50%"
                  innerRadius={60} outerRadius={100}
                  paddingAngle={4}
                >
                  <Cell fill="#FF6B6B" />
                  <Cell fill="#4ECDC4" />
                  <Cell fill="#45B7D1" />
                </Pie>
                <Tooltip formatter={formatCurrency} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Sources */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {analytics.top_revenue_ledgers?.length > 0 && (
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                Top Revenue Sources
              </h3>
              <div className="space-y-4">
                {analytics.top_revenue_ledgers.slice(0, 5).map((l, i) => {
                  const max = Math.max(...analytics.top_revenue_ledgers.map(x => x.amount || 0));
                  const pct = max > 0 ? ((l.amount || 0) / max) * 100 : 0;
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-slate-700 truncate max-w-[60%]">{l.name}</span>
                        <span className="font-bold text-emerald-600">{formatCurrency(l.amount)}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {analytics.top_expense_ledgers?.length > 0 && (
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                Top Expense Categories
              </h3>
              <div className="space-y-4">
                {analytics.top_expense_ledgers.slice(0, 5).map((l, i) => {
                  const max = Math.max(...analytics.top_expense_ledgers.map(x => x.amount || 0));
                  const pct = max > 0 ? ((l.amount || 0) / max) * 100 : 0;
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-slate-700 truncate max-w-[60%]">{l.name}</span>
                        <span className="font-bold text-rose-600">{formatCurrency(l.amount)}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-rose-400 to-pink-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
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
          <div className="w-20 h-20 rounded-full border-4 border-transparent border-t-purple-500 animate-spin" />
          <p className="mt-6 text-slate-500 font-medium">Loading comparison...</p>
        </div>
      );
    }

    if (!multiCompanyData.length) {
      return (
        <div className="text-center py-20 bg-purple-50 rounded-3xl border-2 border-dashed border-purple-200">
          <FiLayers className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-purple-800 mb-2">No Multi-Company Data</h3>
          <p className="text-purple-600 mb-6">Upload data for multiple companies to compare</p>
          <button onClick={() => setView('single')} className="px-6 py-3 bg-purple-500 text-white rounded-xl font-semibold">
            View Single Company
          </button>
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
                 className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition-all cursor-pointer hover:-translate-y-1">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-slate-800 truncate">{c.company_name}</h4>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  c.health_score >= 80 ? 'bg-emerald-100 text-emerald-700' :
                  c.health_score >= 60 ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                }`}>{Math.round(c.health_score)}%</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Revenue</span><span className="font-semibold text-emerald-600">{formatCurrency(c.total_revenue)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Profit</span><span className="font-semibold text-blue-600">{formatCurrency(c.net_profit)}</span></div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-lg">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Comparison</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={formatCurrency} />
              <Tooltip formatter={formatCurrency} />
              <Legend />
              <Bar dataKey="revenue" fill="#10B981" name="Revenue" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" fill="#EF4444" name="Expense" radius={[4, 4, 0, 0]} />
              <Bar dataKey="profit" fill="#3B82F6" name="Profit" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Decorative Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-rose-200/40 to-orange-200/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-blue-200/40 to-cyan-200/40 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                Analytics
              </h1>
              <p className="text-slate-500 mt-2 text-lg">Deep dive into your financial performance</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button onClick={handleExport} disabled={!analytics}
                className="px-5 py-2.5 bg-white text-slate-600 rounded-xl font-medium border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-all flex items-center gap-2 shadow-sm">
                <FiDownload className="w-4 h-4" /> Export
              </button>
              <button onClick={handleRefresh} disabled={refreshing}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg">
                <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex p-1.5 bg-white rounded-2xl shadow-sm border border-slate-200">
            <button onClick={() => setView('single')}
              className={`px-6 py-2.5 rounded-xl font-semibold transition-all ${
                view === 'single' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'
              }`}>
              Single Company
            </button>
            <button onClick={() => { setView('multi'); if (!multiCompanyData.length) fetchMultiCompanyAnalytics(); }}
              className={`px-6 py-2.5 rounded-xl font-semibold transition-all ${
                view === 'multi' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'
              }`}>
              Multi-Company
            </button>
          </div>

          {view === 'single' && (
            <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)}
              className="flex-1 px-5 py-3 bg-white border border-slate-200 rounded-2xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 shadow-sm">
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
    </div>
  );
};

export default AnalyticsPage;
