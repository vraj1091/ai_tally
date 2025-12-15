import { useState, useEffect, useCallback } from 'react';
import Card from '../components/common/Card';
import apiClient from '../api/client';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, RadialBarChart, RadialBar
} from 'recharts';
import { 
  FiRefreshCw, FiTrendingUp, FiTrendingDown, FiDollarSign, FiAlertCircle, 
  FiDownload, FiPieChart, FiBarChart2, FiActivity, FiCheckCircle,
  FiUsers, FiPackage, FiCreditCard, FiTarget, FiAward, FiZap
} from 'react-icons/fi';

// Premium color palette - Deep blues with vibrant accents
const COLORS = {
  primary: '#1e40af',       // Deep blue
  secondary: '#7c3aed',     // Vivid purple
  success: '#059669',       // Emerald green
  danger: '#dc2626',        // Red
  warning: '#d97706',       // Amber
  info: '#0891b2',          // Cyan
  gradient1: 'from-blue-600 to-indigo-700',
  gradient2: 'from-emerald-500 to-teal-600',
  gradient3: 'from-purple-500 to-pink-600',
  gradient4: 'from-amber-500 to-orange-600',
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const AnalyticsPage = () => {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [multiCompanyData, setMultiCompanyData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState('single');
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

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
      
      // Try LIVE Tally first
      try {
        const liveResponse = await apiClient.get('/tally/companies', { timeout: 10000 });
        if (liveResponse.data.companies && liveResponse.data.companies.length > 0) {
          const liveCompanies = liveResponse.data.companies.map(c => ({
            ...c,
            name: c.name || c,
            source: 'live'
          }));
          allCompanies = [...allCompanies, ...liveCompanies];
        }
      } catch (liveError) {
        console.warn('Live Tally not available');
      }
      
      // Also get backup companies
      try {
        const backupResponse = await apiClient.get('/backup/companies');
        if (backupResponse.data.companies && backupResponse.data.companies.length > 0) {
          const backupCompanies = backupResponse.data.companies
            .filter(c => !allCompanies.some(live => live.name === (c.name || c)))
            .map(c => ({
              ...c,
              name: c.name || c,
              source: 'backup'
            }));
          allCompanies = [...allCompanies, ...backupCompanies];
        }
      } catch (backupError) {
        console.warn('Backup companies not available');
      }
      
      // Try bridge companies
      try {
        const bridgeResponse = await apiClient.get('/bridge/user_tally_bridge/companies');
        if (bridgeResponse.data.companies && bridgeResponse.data.companies.length > 0) {
          const bridgeCompanies = bridgeResponse.data.companies
            .filter(c => c && c !== '0' && !allCompanies.some(existing => existing.name === c))
            .map(c => ({
              name: c,
              source: 'bridge'
            }));
          allCompanies = [...allCompanies, ...bridgeCompanies];
        }
      } catch (bridgeError) {
        console.warn('Bridge companies not available');
      }
      
      if (allCompanies.length > 0) {
        setCompanies(allCompanies);
        const liveCompany = allCompanies.find(c => c.source === 'live');
        setSelectedCompany(liveCompany ? liveCompany.name : allCompanies[0].name);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const fetchAnalytics = async (companyName, forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const company = companies.find(c => c.name === companyName);
      const source = company?.source || 'live';
      
      const response = await apiClient.get(`/analytics/company/${encodeURIComponent(companyName)}`, {
        params: { refresh: forceRefresh, source: source },
        timeout: 60000
      });
      
      if (response.data.success) {
        setAnalytics(response.data.data);
      } else {
        if (source === 'live') {
          try {
            const backupResponse = await apiClient.get(`/analytics/company/${encodeURIComponent(companyName)}`, {
              params: { refresh: false, source: 'backup' },
              timeout: 60000
            });
            if (backupResponse.data.success) {
              setAnalytics(backupResponse.data.data);
              return;
            }
          } catch (backupError) {
            console.warn('Backup fallback also failed');
          }
        }
        setError(response.data.message || 'No data available');
        setAnalytics(null);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError('Failed to fetch analytics. Please ensure data source is available.');
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchMultiCompanyAnalytics = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/analytics/multi-company', {
        params: { refresh: forceRefresh }
      });
      
      if (response.data.success && response.data.data) {
        setMultiCompanyData(response.data.data);
      } else {
        setError('No multi-company data available');
        setMultiCompanyData([]);
      }
    } catch (error) {
      console.error('Error fetching multi-company analytics:', error);
      setError('Multi-company analytics requires multiple companies with data');
      setMultiCompanyData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    toast('Refreshing analytics...', { icon: '🔄', duration: 2000 });
    
    try {
      if (view === 'single' && selectedCompany) {
        await fetchAnalytics(selectedCompany, true);
      } else {
        await fetchMultiCompanyAnalytics(true);
      }
      toast.success('Analytics refreshed!');
    } catch (error) {
      toast.error('Failed to refresh');
    } finally {
      setRefreshing(false);
    }
  };

  const formatCurrency = (value) => {
    const absValue = Math.abs(value || 0);
    if (absValue >= 10000000) {
      return `₹${(absValue / 10000000).toFixed(2)} Cr`;
    } else if (absValue >= 100000) {
      return `₹${(absValue / 100000).toFixed(2)} L`;
    } else if (absValue >= 1000) {
      return `₹${(absValue / 1000).toFixed(2)} K`;
    }
    return `₹${absValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const formatNumber = (value) => (value || 0).toFixed(2);

  const handleExportData = () => {
    if (!analytics) {
      toast.error('No data to export');
      return;
    }

    let csvContent = `Financial Analytics Report - ${analytics.company_name}\n`;
    csvContent += `Generated: ${new Date().toLocaleString('en-IN')}\n\n`;
    csvContent += `FINANCIAL SUMMARY\n`;
    csvContent += `Revenue,${formatCurrency(analytics.total_revenue)}\n`;
    csvContent += `Expense,${formatCurrency(analytics.total_expense)}\n`;
    csvContent += `Net Profit,${formatCurrency(analytics.net_profit)}\n`;
    csvContent += `Health Score,${analytics.health_score}/100\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${analytics.company_name}_Analytics_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report exported!');
  };

  // Metric Card Component
  const MetricCard = ({ title, value, icon: Icon, trend, trendValue, gradient, subtitle }) => (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-6 text-white shadow-xl transform hover:scale-[1.02] transition-all duration-300`}>
      <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-20 w-20 rounded-full bg-white/10 blur-xl" />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            <Icon className="w-6 h-6" />
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-sm ${trend === 'up' ? 'text-green-200' : 'text-red-200'}`}>
              {trend === 'up' ? <FiTrendingUp /> : <FiTrendingDown />}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <p className="text-white/80 text-sm font-medium mb-1">{title}</p>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        {subtitle && <p className="text-white/60 text-xs mt-2">{subtitle}</p>}
      </div>
    </div>
  );

  // Health Score Gauge
  const HealthGauge = ({ score, status }) => {
    const data = [{ name: 'score', value: score, fill: score >= 80 ? '#10b981' : score >= 60 ? '#3b82f6' : score >= 40 ? '#f59e0b' : '#ef4444' }];
    
    return (
      <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FiActivity className="text-blue-400" />
          Business Health Score
        </h3>
        <div className="flex items-center justify-center">
          <div className="relative">
            <ResponsiveContainer width={200} height={200}>
              <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={data} startAngle={180} endAngle={0}>
                <RadialBar background={{ fill: '#334155' }} dataKey="value" cornerRadius={10} max={100} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-bold">{Math.round(score)}</span>
              <span className="text-sm text-slate-400">out of 100</span>
            </div>
          </div>
        </div>
        <div className="text-center mt-4">
          <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
            score >= 80 ? 'bg-emerald-500/20 text-emerald-400' :
            score >= 60 ? 'bg-blue-500/20 text-blue-400' :
            score >= 40 ? 'bg-amber-500/20 text-amber-400' :
            'bg-red-500/20 text-red-400'
          }`}>
            {score >= 80 ? <FiAward /> : score >= 60 ? <FiCheckCircle /> : <FiAlertCircle />}
            {status || (score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Needs Attention')}
          </span>
        </div>
      </div>
    );
  };

  // Chart Card Component
  const ChartCard = ({ title, icon: Icon, children, className = '' }) => (
    <div className={`bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden ${className}`}>
      <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Icon className="text-blue-600" />
          {title}
        </h3>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );

  const renderSingleCompanyView = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-blue-200"></div>
              <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
              <FiPieChart className="absolute inset-0 m-auto w-8 h-8 text-blue-600" />
            </div>
            <p className="text-slate-600 font-medium">Analyzing financial data...</p>
            <p className="text-slate-400 text-sm mt-1">This may take a moment</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-8 border border-red-100">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiAlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-semibold text-red-800 mb-2">Unable to Load Analytics</h3>
            <p className="text-red-600 mb-6">{error}</p>
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium"
            >
              <FiRefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      );
    }

    if (!analytics) {
      return (
        <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl p-12 border border-slate-200">
          <div className="text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiBarChart2 className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Select a Company</h3>
            <p className="text-slate-500">Choose a company from the dropdown to view detailed analytics</p>
          </div>
        </div>
      );
    }

    const revenueExpenseData = [
      { name: 'Revenue', value: analytics.total_revenue || 0, fill: '#10b981' },
      { name: 'Expense', value: analytics.total_expense || 0, fill: '#ef4444' },
      { name: 'Profit', value: analytics.net_profit || 0, fill: '#3b82f6' }
    ];

    const ratiosData = [
      { metric: 'Profit Margin', value: analytics.profit_margin || 0 },
      { metric: 'ROA', value: analytics.return_on_assets || 0 },
      { metric: 'ROE', value: analytics.return_on_equity || 0 },
      { metric: 'Expense Ratio', value: analytics.expense_ratio || 0 }
    ];

    const balanceData = [
      { name: 'Assets', value: Math.abs(analytics.total_assets || 0), fill: '#3b82f6' },
      { name: 'Liabilities', value: Math.abs(analytics.total_liabilities || 0), fill: '#ef4444' },
      { name: 'Equity', value: Math.abs(analytics.total_equity || 0), fill: '#10b981' }
    ];

    return (
      <div className="space-y-8">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Revenue"
            value={formatCurrency(analytics.total_revenue)}
            icon={FiTrendingUp}
            gradient="from-emerald-500 to-teal-600"
            trend="up"
            trendValue="+12%"
            subtitle="Gross income from all sources"
          />
          <MetricCard
            title="Total Expenses"
            value={formatCurrency(analytics.total_expense)}
            icon={FiCreditCard}
            gradient="from-rose-500 to-pink-600"
            subtitle="Operating and non-operating costs"
          />
          <MetricCard
            title="Net Profit"
            value={formatCurrency(analytics.net_profit)}
            icon={FiDollarSign}
            gradient="from-blue-500 to-indigo-600"
            trend={analytics.net_profit >= 0 ? 'up' : 'down'}
            subtitle="Revenue minus expenses"
          />
          <MetricCard
            title="Profit Margin"
            value={`${formatNumber(analytics.profit_margin)}%`}
            icon={FiTarget}
            gradient="from-violet-500 to-purple-600"
            subtitle="Profitability ratio"
          />
        </div>

        {/* Alerts Section */}
        {analytics.alerts && analytics.alerts.length > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200">
            <h3 className="text-lg font-semibold text-amber-800 mb-4 flex items-center gap-2">
              <FiAlertCircle className="text-amber-600" />
              Financial Alerts
            </h3>
            <div className="grid gap-3">
              {analytics.alerts.map((alert, idx) => (
                <div key={idx} className="flex items-start gap-3 bg-white/60 rounded-xl p-4">
                  <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                  <p className="text-amber-900">{alert}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue vs Expense Chart */}
          <ChartCard title="Financial Overview" icon={FiBarChart2} className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={revenueExpenseData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                <YAxis type="category" dataKey="name" width={80} />
                <Tooltip 
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {revenueExpenseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Health Score */}
          <HealthGauge score={analytics.health_score || 0} status={analytics.health_status} />
        </div>

        {/* Second Row Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Financial Ratios */}
          <ChartCard title="Financial Ratios (%)" icon={FiPieChart}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ratiosData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="metric" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip 
                  formatter={(value) => `${formatNumber(value)}%`}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Balance Sheet */}
          <ChartCard title="Balance Sheet Overview" icon={FiActivity}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={balanceData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                >
                  {balanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Top Revenue & Expense Sources */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {analytics.top_revenue_ledgers && analytics.top_revenue_ledgers.length > 0 && (
            <ChartCard title="Top Revenue Sources" icon={FiTrendingUp}>
              <div className="space-y-3">
                {analytics.top_revenue_ledgers.slice(0, 5).map((ledger, idx) => {
                  const maxAmount = Math.max(...analytics.top_revenue_ledgers.map(l => l.amount || 0));
                  const percentage = maxAmount > 0 ? ((ledger.amount || 0) / maxAmount) * 100 : 0;
                  return (
                    <div key={idx} className="group">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-slate-700 truncate max-w-[60%]">{ledger.name}</span>
                        <span className="text-sm font-bold text-emerald-600">{formatCurrency(ledger.amount)}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-500 group-hover:shadow-lg"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </ChartCard>
          )}

          {analytics.top_expense_ledgers && analytics.top_expense_ledgers.length > 0 && (
            <ChartCard title="Top Expense Categories" icon={FiTrendingDown}>
              <div className="space-y-3">
                {analytics.top_expense_ledgers.slice(0, 5).map((ledger, idx) => {
                  const maxAmount = Math.max(...analytics.top_expense_ledgers.map(l => l.amount || 0));
                  const percentage = maxAmount > 0 ? ((ledger.amount || 0) / maxAmount) * 100 : 0;
                  return (
                    <div key={idx} className="group">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-slate-700 truncate max-w-[60%]">{ledger.name}</span>
                        <span className="text-sm font-bold text-rose-600">{formatCurrency(ledger.amount)}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-rose-400 to-pink-500 rounded-full transition-all duration-500 group-hover:shadow-lg"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </ChartCard>
          )}
        </div>

        {/* Quick Stats */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 text-white">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <FiZap className="text-yellow-400" />
            Quick Financial Insights
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <FiDollarSign className="w-6 h-6 text-blue-400" />
              </div>
              <p className="text-2xl font-bold">{formatCurrency(analytics.total_assets)}</p>
              <p className="text-slate-400 text-sm">Total Assets</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <FiCreditCard className="w-6 h-6 text-red-400" />
              </div>
              <p className="text-2xl font-bold">{formatCurrency(analytics.total_liabilities)}</p>
              <p className="text-slate-400 text-sm">Total Liabilities</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <FiUsers className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold">{formatCurrency(analytics.total_equity)}</p>
              <p className="text-slate-400 text-sm">Total Equity</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <FiActivity className="w-6 h-6 text-purple-400" />
              </div>
              <p className="text-2xl font-bold">{formatNumber(analytics.debt_to_equity_ratio)}</p>
              <p className="text-slate-400 text-sm">Debt to Equity</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMultiCompanyView = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-purple-200"></div>
              <div className="absolute inset-0 rounded-full border-4 border-purple-600 border-t-transparent animate-spin"></div>
              <FiUsers className="absolute inset-0 m-auto w-8 h-8 text-purple-600" />
            </div>
            <p className="text-slate-600 font-medium">Loading multi-company data...</p>
          </div>
        </div>
      );
    }

    if (!multiCompanyData || multiCompanyData.length === 0) {
      return (
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-12 border border-purple-100">
          <div className="text-center">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiUsers className="w-10 h-10 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Multi-Company Comparison</h3>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">
              Upload data for multiple companies to compare their financial performance side by side.
            </p>
            <button
              onClick={() => setView('single')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium"
            >
              View Single Company
            </button>
          </div>
        </div>
      );
    }

    const comparisonData = multiCompanyData.map(company => ({
      name: String(company.company_name || 'Unknown').substring(0, 15),
      revenue: Number(company.total_revenue) || 0,
      expense: Number(company.total_expense) || 0,
      profit: Number(company.net_profit) || 0,
      healthScore: Number(company.health_score) || 0
    }));

    return (
      <div className="space-y-8">
        {/* Company Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {multiCompanyData.slice(0, 6).map((company, idx) => (
            <div 
              key={idx} 
              className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group"
              onClick={() => {
                setSelectedCompany(company.company_name);
                setView('single');
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-lg text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                  {company.company_name}
                </h4>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  company.health_score >= 80 ? 'bg-emerald-100 text-emerald-700' :
                  company.health_score >= 60 ? 'bg-blue-100 text-blue-700' :
                  company.health_score >= 40 ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {Math.round(company.health_score)}%
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-500 text-sm">Revenue</span>
                  <span className="font-semibold text-emerald-600">{formatCurrency(company.total_revenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-sm">Expense</span>
                  <span className="font-semibold text-rose-600">{formatCurrency(company.total_expense)}</span>
                </div>
                <div className="flex justify-between pt-3 border-t border-slate-100">
                  <span className="text-slate-500 text-sm">Net Profit</span>
                  <span className={`font-bold ${company.net_profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {formatCurrency(company.net_profit)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Comparison Charts */}
        <ChartCard title="Revenue & Expense Comparison" icon={FiBarChart2}>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => formatCurrency(v)} />
              <Tooltip 
                formatter={(value) => formatCurrency(value)}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
              />
              <Legend />
              <Bar dataKey="revenue" fill="#10b981" name="Revenue" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" fill="#ef4444" name="Expense" radius={[4, 4, 0, 0]} />
              <Bar dataKey="profit" fill="#3b82f6" name="Profit" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Health Score Comparison" icon={FiActivity}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} />
              <Tooltip 
                formatter={(value) => `${value}%`}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
              />
              <Line 
                type="monotone" 
                dataKey="healthScore" 
                stroke="#8b5cf6" 
                strokeWidth={3}
                dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 6 }}
                name="Health Score"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Financial Analytics
              </h1>
              <p className="text-slate-500 mt-2 text-lg">Real-time insights and comprehensive financial analysis</p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleExportData}
                disabled={!analytics}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-slate-700 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all border border-slate-200 shadow-sm font-medium"
              >
                <FiDownload className="w-4 h-4" />
                Export Report
              </button>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/25 font-medium"
              >
                <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="mb-8 flex flex-col md:flex-row gap-4">
          <div className="inline-flex p-1 bg-white rounded-xl shadow-sm border border-slate-200">
            <button
              onClick={() => setView('single')}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                view === 'single'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <FiPieChart className="inline-block w-4 h-4 mr-2 -mt-0.5" />
              Single Company
            </button>
            <button
              onClick={() => {
                setView('multi');
                if (multiCompanyData.length === 0) {
                  fetchMultiCompanyAnalytics();
                }
              }}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                view === 'multi'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <FiUsers className="inline-block w-4 h-4 mr-2 -mt-0.5" />
              Multi-Company
            </button>
          </div>

          {view === 'single' && (
            <div className="flex-1 relative">
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm appearance-none cursor-pointer font-medium text-slate-700"
              >
                <option value="">Select a Company</option>
                {companies.map((company, idx) => (
                  <option key={idx} value={company.name}>
                    {company.name} {company.source === 'live' ? '● Live' : company.source === 'bridge' ? '◉ Bridge' : '○ Backup'}
                  </option>
                ))}
              </select>
              <FiPackage className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="pb-8">
          {view === 'single' ? renderSingleCompanyView() : renderMultiCompanyView()}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
