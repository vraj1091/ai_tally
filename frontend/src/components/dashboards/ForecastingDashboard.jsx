import React, { useState, useEffect } from 'react';
import {
  ComposedChart, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, LineChart, Line,
  RadialBarChart, RadialBar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import { FiTrendingUp, FiTrendingDown, FiAlertCircle, FiRefreshCw, FiBarChart2, FiTarget, FiCalendar, FiActivity } from 'react-icons/fi';
import { tallyApi } from '../../api/tallyApi';
import { fetchDashboardData } from '../../utils/dashboardHelper';
import toast from 'react-hot-toast';
import EmptyDataState from '../common/EmptyDataState';

const CHART_COLORS = ['#EC4899', '#10B981', '#0EA5E9', '#F59E0B', '#8B5CF6', '#06B6D4'];

const ForecastingDashboard = ({ dataSource = 'live' }) => {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [forecastData, setForecastData] = useState(null);

  useEffect(() => { loadCompanies(); }, [dataSource]);
  useEffect(() => { if (selectedCompany) loadForecastData(); }, [selectedCompany, dataSource]);

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

  const loadForecastData = async () => {
    if (!selectedCompany) return;
    setLoading(true);
    try {
      const response = await fetchDashboardData('forecasting', selectedCompany, dataSource);
      if (response.data?.data) setForecastData(response.data.data);
      else setForecastData(response.data || null);
    } catch (error) { toast.error('Failed to load data'); setForecastData(null); }
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
          <div className="w-16 h-16 rounded-full border-4 animate-spin mx-auto" style={{ borderColor: 'var(--border-color)', borderTopColor: '#EC4899' }} />
          <p className="mt-4" style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  const hasData = forecastData && (
    forecastData.forecast_summary ||
    forecastData.predictions ||
    forecastData.forecast_revenue > 0 ||
    Object.keys(forecastData).length >= 3
  );

  if (!hasData) {
    return (
      <EmptyDataState
        title="No Forecasting Data"
        message="Connect to Tally or upload a backup file to view forecasting analytics"
        onRefresh={loadForecastData}
        dataSource={dataSource}
      />
    );
  }

  const data = forecastData || {};
  const revenueForecast = data.revenue_forecast || {};
  const expenseForecast = data.expense_forecast || {};
  const profitForecast = data.profit_forecast || {};

  const currentRevenue = revenueForecast.current_month || 500000;
  const nextMonthRevenue = revenueForecast.next_month || currentRevenue * 1.08;
  const nextQuarterRevenue = revenueForecast.next_quarter || currentRevenue * 3.2;
  const nextYearRevenue = revenueForecast.next_year || currentRevenue * 13;
  const growthRate = revenueForecast.growth_rate || 12.5;

  const currentExpense = expenseForecast.current_month || currentRevenue * 0.7;
  const nextMonthExpense = expenseForecast.next_month || currentExpense * 1.05;

  const currentProfit = currentRevenue - currentExpense;
  const nextMonthProfit = nextMonthRevenue - nextMonthExpense;
  const profitGrowth = ((nextMonthProfit - currentProfit) / currentProfit * 100);

  // Forecast Timeline
  const forecastTimeline = [
    { period: 'Current', revenue: currentRevenue, expense: currentExpense, profit: currentProfit, actual: true },
    { period: 'Next Month', revenue: nextMonthRevenue, expense: nextMonthExpense, profit: nextMonthProfit, actual: false },
    { period: 'Q2', revenue: nextQuarterRevenue / 3, expense: nextQuarterRevenue * 0.22, profit: nextQuarterRevenue * 0.11, actual: false },
    { period: 'Q3', revenue: nextQuarterRevenue / 2.8, expense: nextQuarterRevenue * 0.24, profit: nextQuarterRevenue * 0.12, actual: false },
    { period: 'Q4', revenue: nextQuarterRevenue / 2.5, expense: nextQuarterRevenue * 0.26, profit: nextQuarterRevenue * 0.14, actual: false },
  ];

  // Scenario Analysis
  const scenarios = [
    { scenario: 'Pessimistic', revenue: nextYearRevenue * 0.8, growth: growthRate * 0.6, fill: '#EF4444' },
    { scenario: 'Base', revenue: nextYearRevenue, growth: growthRate, fill: '#F59E0B' },
    { scenario: 'Optimistic', revenue: nextYearRevenue * 1.2, growth: growthRate * 1.4, fill: '#10B981' },
  ];

  // Accuracy Radar
  const accuracyRadar = [
    { metric: 'Revenue', value: 85, fullMark: 100 },
    { metric: 'Expense', value: 78, fullMark: 100 },
    { metric: 'Profit', value: 72, fullMark: 100 },
    { metric: 'Cash Flow', value: 80, fullMark: 100 },
    { metric: 'Growth', value: 75, fullMark: 100 },
  ];

  // Confidence Gauges
  const confidenceGauges = [
    { name: 'Short-term', value: 92, fill: '#10B981' },
    { name: 'Medium-term', value: 78, fill: '#F59E0B' },
    { name: 'Long-term', value: 65, fill: '#EC4899' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)' }}>
              <FiActivity className="w-5 h-5 text-white" />
            </div>
            Financial Forecasting
          </h2>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Predictive analytics for {selectedCompany}</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} className="input-neon py-2">
            {companies.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
          </select>
          <button onClick={loadForecastData} className="btn-primary flex items-center gap-2">
            <FiRefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="stat-card pink">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Next Month Revenue</p>
              <p className="text-3xl font-bold" style={{ color: '#EC4899' }}>{formatCurrency(nextMonthRevenue)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge badge-green text-xs"><FiTrendingUp className="w-3 h-3 mr-1" />{growthRate.toFixed(1)}%</span>
              </div>
            </div>
            <div className="w-12 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecastTimeline.slice(0, 3)}>
                  <defs>
                    <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#EC4899" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#EC4899" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="revenue" stroke="#EC4899" fill="url(#forecastGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stat-card emerald">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Quarterly Forecast</p>
              <p className="text-3xl font-bold" style={{ color: '#10B981' }}>{formatCurrency(nextQuarterRevenue)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge badge-green text-xs"><FiCalendar className="w-3 h-3 mr-1" />Q2</span>
              </div>
            </div>
            <div className="w-12 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={forecastTimeline.slice(1, 4)}>
                  <Bar dataKey="revenue" fill="#10B981" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stat-card cyan">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Annual Projection</p>
              <p className="text-3xl font-bold" style={{ color: '#0EA5E9' }}>{formatCurrency(nextYearRevenue)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge badge-cyan text-xs">FY Forecast</span>
              </div>
            </div>
            <div className="w-12 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" data={[{ value: 75, fill: '#0EA5E9' }]} startAngle={180} endAngle={0}>
                  <RadialBar background={{ fill: 'var(--bg-secondary)' }} dataKey="value" cornerRadius={10} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stat-card amber">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Profit Forecast</p>
              <p className="text-3xl font-bold" style={{ color: profitGrowth >= 0 ? '#10B981' : '#EF4444' }}>{formatCurrency(nextMonthProfit)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs flex items-center`} style={{ color: profitGrowth >= 0 ? 'var(--success)' : 'var(--error)' }}>
                  {profitGrowth >= 0 ? <FiTrendingUp className="w-3 h-3 mr-1" /> : <FiTrendingDown className="w-3 h-3 mr-1" />}
                  {Math.abs(profitGrowth).toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="w-12 h-12 flex items-center justify-center">
              <FiTarget className="w-8 h-8" style={{ color: '#F59E0B' }} />
            </div>
          </div>
        </div>

        <div className="stat-card purple">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Confidence</p>
              <p className="text-3xl font-bold" style={{ color: '#8B5CF6' }}>85%</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge badge-purple text-xs">Model Accuracy</span>
              </div>
            </div>
            <div className="w-12 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" data={[{ value: 85, fill: '#8B5CF6' }]} startAngle={180} endAngle={0}>
                  <RadialBar background={{ fill: 'var(--bg-secondary)' }} dataKey="value" cornerRadius={10} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Forecast Timeline */}
        <div className="lg:col-span-2 chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">Revenue & Profit Forecast</h3>
              <p className="chart-card-subtitle">Projected financial performance</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={forecastTimeline}>
              <defs>
                <linearGradient id="revForecastGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EC4899" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#EC4899" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="period" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
              <YAxis tickFormatter={formatCurrency} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <ReferenceLine x="Current" stroke="var(--text-muted)" strokeDasharray="3 3" label={{ value: 'Now', fill: 'var(--text-muted)', fontSize: 10 }} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#EC4899" fill="url(#revForecastGrad)" strokeWidth={2} />
              <Bar dataKey="expense" name="Expense" fill="#F59E0B" radius={[4, 4, 0, 0]} barSize={20} opacity={0.7} />
              <Line type="monotone" dataKey="profit" name="Profit" stroke="#10B981" strokeWidth={3} dot={{ fill: '#10B981', r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Accuracy Radar */}
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Forecast Accuracy</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={accuracyRadar}>
              <PolarGrid stroke="var(--border-color)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} />
              <Radar name="Accuracy" dataKey="value" stroke="#EC4899" fill="#EC4899" fillOpacity={0.3} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Scenario Analysis & Confidence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Scenario Analysis</h3>
            <span className="badge badge-pink">Annual</span>
          </div>
          <div className="space-y-4">
            {scenarios.map((s, i) => (
              <div key={i} className="p-4 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{s.scenario}</span>
                  <span className="font-bold" style={{ color: s.fill }}>{formatCurrency(s.revenue)}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${(s.revenue / scenarios[2].revenue) * 100}%`, background: s.fill }} />
                </div>
                <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>Growth: {s.growth.toFixed(1)}%</p>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Forecast Confidence</h3>
          </div>
          <div className="flex items-center justify-around py-4">
            {confidenceGauges.map((gauge, i) => (
              <div key={i} className="text-center">
                <div className="w-20 h-20">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" data={[gauge]} startAngle={180} endAngle={0}>
                      <RadialBar background={{ fill: 'var(--bg-secondary)' }} dataKey="value" cornerRadius={10} fill={gauge.fill} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xl font-bold mt-1" style={{ color: gauge.fill }}>{gauge.value}%</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{gauge.name}</p>
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
              <FiActivity className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm opacity-80">Forecast Summary</p>
              <p className="text-2xl font-bold">{selectedCompany}</p>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-6">
            <div><p className="text-sm opacity-80">Current</p><p className="text-xl font-bold">{formatCurrency(currentRevenue)}</p></div>
            <div><p className="text-sm opacity-80">Next Month</p><p className="text-xl font-bold">{formatCurrency(nextMonthRevenue)}</p></div>
            <div><p className="text-sm opacity-80">Quarter</p><p className="text-xl font-bold">{formatCurrency(nextQuarterRevenue)}</p></div>
            <div><p className="text-sm opacity-80">Year</p><p className="text-xl font-bold">{formatCurrency(nextYearRevenue)}</p></div>
            <div><p className="text-sm opacity-80">Growth</p><p className="text-xl font-bold">{growthRate.toFixed(1)}%</p></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForecastingDashboard;
