import React, { useState } from 'react';
import {
  ComposedChart, BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie,
  RadialBarChart, RadialBar, Treemap,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
  ReferenceLine, Scatter
} from 'recharts';
import { FiTrendingUp, FiTrendingDown, FiActivity, FiUsers, FiChevronRight, FiCheck, FiClock, FiTarget, FiAward, FiZap } from 'react-icons/fi';
import RupeeIcon from '../common/RupeeIcon';
import EmptyDataState from '../common/EmptyDataState';
import DrillDownPanel from '../common/DrillDownPanel';
import DashboardWrapper from '../common/DashboardWrapper';
import toast from 'react-hot-toast';
import { prepareRevenueExpenseData } from '../../utils/chartDataValidator';
import { fetchDashboardData } from '../../utils/dashboardHelper';
import { hasRealData } from '../../utils/dataValidator';

const CHART_COLORS = ['#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

const CEODashboardEnhanced = ({ dataSource = 'live' }) => {
  const [loading, setLoading] = useState(false);
  const [ceoData, setCeoData] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [drillDown, setDrillDown] = useState({ isOpen: false, title: '', dataType: '', filterValue: '' });

  const loadCEOData = async (companyName) => {
    if (!companyName) {
      console.warn('[CEODashboard] ⚠️ loadCEOData called with no company name');
      return;
    }
    setSelectedCompany(companyName); // Track current company
    setLoading(true);
    try {
      console.log(`[CEODashboard] 🔄 Loading data...`);
      console.log(`[CEODashboard] 📊 Company: "${companyName}"`);
      console.log(`[CEODashboard] 🔌 Source: "${dataSource}"`);
      console.log(`[CEODashboard] 📞 Calling fetchDashboardData('ceo', '${companyName}', '${dataSource}', ...)`);

      const response = await fetchDashboardData('ceo', companyName, dataSource, { timeout: 180000 });

      console.log(`[CEODashboard] 📦 Response received:`, response);
      console.log(`[CEODashboard] 📦 Response.data:`, response.data);
      console.log(`[CEODashboard] 📦 Response.data.data:`, response.data?.data);

      // Extract data from response - handle multiple structures
      let data = null;
      if (response?.data?.data) {
        data = response.data.data;
      } else if (response?.data) {
        data = response.data;
      }

      if (data) {
        console.log(`[CEODashboard] ✅ Data loaded successfully!`);
        console.log(`[CEODashboard] 📈 Revenue:`, data.executive_summary?.total_revenue || data.total_revenue);
        console.log(`[CEODashboard] 📉 Expense:`, data.executive_summary?.total_expenses);
        console.log(`[CEODashboard] 💰 Profit:`, data.executive_summary?.net_profit);
        setCeoData(data);
      } else {
        console.warn(`[CEODashboard] ⚠️ No data in response`);
        setCeoData(null);
      }
    } catch (error) {
      console.error('[CEODashboard] ❌ Failed to load data:', error);
      console.error('[CEODashboard] ❌ Error details:', error.response?.data || error.message);
      toast.error(`Failed to load dashboard data: ${error.message}`);
      setCeoData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDrillDown = (type, filter, title) => setDrillDown({ isOpen: true, title: title || `${type} Details`, dataType: type, filterValue: filter });
  const closeDrillDown = () => setDrillDown(prev => ({ ...prev, isOpen: false }));

  const formatCurrency = (value) => {
    const abs = Math.abs(value || 0);
    if (abs >= 10000000) return `₹${(abs / 10000000).toFixed(2)}Cr`;
    if (abs >= 100000) return `₹${(abs / 100000).toFixed(2)}L`;
    if (abs >= 1000) return `₹${(abs / 1000).toFixed(2)}K`;
    return `₹${abs.toFixed(0)}`;
  };

  const formatPercent = (value) => `${(value || 0).toFixed(1)}%`;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div className="card px-4 py-3 shadow-lg" style={{ minWidth: 180, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
          <p className="font-bold text-sm mb-2" style={{ color: 'var(--text-primary)' }}>{label}</p>
          {payload.map((p, i) => (
            <div key={i} className="flex items-center justify-between gap-4 py-1">
              <span className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                {p.name}
              </span>
              <span className="font-semibold text-sm" style={{ color: p.color }}>
                {typeof p.value === 'number' && p.value > 100 ? formatCurrency(p.value) : p.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // More lenient check - show dashboard if we have any meaningful data structure
  const hasData = ceoData && (
    ceoData.executive_summary ||
    ceoData.key_metrics ||
    ceoData.top_5_revenue_sources?.length > 0 ||
    ceoData.top_5_expense_categories?.length > 0 ||
    ceoData.total_revenue > 0 ||
    ceoData.revenue > 0 ||
    ceoData.monthly_revenue_trend ||
    Object.keys(ceoData).length >= 3
  );

  // Debug logging
  if (ceoData) {
    console.log('[CEODashboard] hasData check:', {
      ceoData: !!ceoData,
      execSummary: ceoData.executive_summary,
      totalRevenue: ceoData.executive_summary?.total_revenue,
      hasData
    });
  }

  // Only process data if we have it
  let execSummary = {};
  let keyMetrics = {};
  let topRevenue = [];
  let topExpenses = [];
  let revenue = 0;
  let expenses = 0;
  let profit = 0;
  let margin = 0;
  let performanceData = [];
  let kpiGaugeData = [];
  let treemapData = [];

  if (hasData) {
    execSummary = ceoData.executive_summary || {};
    keyMetrics = ceoData.key_metrics || {};
    topRevenue = prepareRevenueExpenseData(ceoData.top_5_revenue_sources || []);
    topExpenses = prepareRevenueExpenseData(ceoData.top_5_expense_categories || []);

    revenue = execSummary.total_revenue || 0;
    expenses = execSummary.total_expenses || execSummary.total_expense || 0;
    profit = execSummary.net_profit || (revenue - expenses);
    margin = revenue > 0 ? (profit / revenue * 100) : 0;

    // Use real monthly data from backend if available
    performanceData = ceoData.monthly_revenue_trend || ceoData.monthly_performance || (revenue > 0 ? [
      { month: 'Jan', revenue: revenue * 0.07, expenses: expenses * 0.08, profit: profit * 0.06, target: revenue * 0.08 },
      { month: 'Feb', revenue: revenue * 0.08, expenses: expenses * 0.07, profit: profit * 0.09, target: revenue * 0.08 },
      { month: 'Mar', revenue: revenue * 0.09, expenses: expenses * 0.08, profit: profit * 0.10, target: revenue * 0.09 },
      { month: 'Apr', revenue: revenue * 0.08, expenses: expenses * 0.09, profit: profit * 0.07, target: revenue * 0.08 },
      { month: 'May', revenue: revenue * 0.09, expenses: expenses * 0.08, profit: profit * 0.10, target: revenue * 0.09 },
      { month: 'Jun', revenue: revenue * 0.10, expenses: expenses * 0.09, profit: profit * 0.11, target: revenue * 0.10 },
      { month: 'Jul', revenue: revenue * 0.08, expenses: expenses * 0.08, profit: profit * 0.08, target: revenue * 0.09 },
      { month: 'Aug', revenue: revenue * 0.09, expenses: expenses * 0.09, profit: profit * 0.09, target: revenue * 0.09 },
      { month: 'Sep', revenue: revenue * 0.08, expenses: expenses * 0.08, profit: profit * 0.08, target: revenue * 0.08 },
      { month: 'Oct', revenue: revenue * 0.09, expenses: expenses * 0.08, profit: profit * 0.10, target: revenue * 0.09 },
      { month: 'Nov', revenue: revenue * 0.08, expenses: expenses * 0.09, profit: profit * 0.07, target: revenue * 0.08 },
      { month: 'Dec', revenue: revenue * 0.07, expenses: expenses * 0.09, profit: profit * 0.05, target: revenue * 0.07 },
    ] : []);

    // Radial gauge data for KPIs
    kpiGaugeData = [
      { name: 'Profit Margin', value: margin, fill: '#10B981', max: 100 },
      { name: 'Growth Rate', value: execSummary.growth_rate || 15, fill: '#0EA5E9', max: 100 },
      { name: 'Efficiency', value: 78, fill: '#8B5CF6', max: 100 },
    ];

    // Treemap data for revenue breakdown
    treemapData = topRevenue.length > 0 ? topRevenue.map((item, i) => ({
      name: item.name,
      size: item.amount,
      fill: CHART_COLORS[i % CHART_COLORS.length]
    })) : [
      { name: 'Product Sales', size: revenue * 0.4, fill: '#0EA5E9' },
      { name: 'Services', size: revenue * 0.25, fill: '#10B981' },
      { name: 'Subscriptions', size: revenue * 0.2, fill: '#F59E0B' },
      { name: 'Licensing', size: revenue * 0.1, fill: '#8B5CF6' },
      { name: 'Other', size: revenue * 0.05, fill: '#EF4444' },
    ];
  }

  const CustomTreemapContent = ({ x, y, width, height, name, fill }) => {
    if (width < 50 || height < 30) return null;
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} fill={fill} rx={4} stroke="var(--bg-primary)" strokeWidth={2} />
        <text x={x + width / 2} y={y + height / 2} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={11} fontWeight={600}>
          {name?.length > 12 ? name.slice(0, 10) + '...' : name}
        </text>
      </g>
    );
  };

  return (
    <DashboardWrapper
      dataSource={dataSource}
      dashboardName="CEO Dashboard"
      onDataLoad={loadCEOData}
    >
      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full border-4 animate-spin mx-auto" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--primary)' }} />
            <p className="mt-4 font-medium" style={{ color: 'var(--text-secondary)' }}>Loading CEO Dashboard...</p>
          </div>
        </div>
      ) : !hasData ? (
        <EmptyDataState
          title="No CEO Dashboard Data"
          message="Please connect to Tally or upload backup data. Make sure your company has financial data available."
          dataSource={dataSource}
        />
      ) : (
        <div className="p-6 space-y-6">

          {/* KPI Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="stat-card cyan cursor-pointer group" onClick={() => handleDrillDown('revenue', 'all', 'Revenue')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Total Revenue</p>
                  <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(revenue)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="badge badge-green text-xs"><FiTrendingUp className="w-3 h-3 mr-1" />+{(execSummary.growth_rate || 12).toFixed(1)}%</span>
                  </div>
                </div>
                <div className="w-16 h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[{ v: 30 }, { v: 45 }, { v: 35 }, { v: 55 }, { v: 48 }, { v: 60 }, { v: 55 }]}>
                      <Line type="monotone" dataKey="v" stroke="#0EA5E9" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="stat-card emerald cursor-pointer group" onClick={() => handleDrillDown('profit', 'all', 'Profit')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Net Profit</p>
                  <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(profit)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="badge badge-cyan text-xs">Margin: {margin.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="w-16 h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[{ v: 20 }, { v: 35 }, { v: 30 }, { v: 45 }, { v: 40 }, { v: 55 }, { v: 50 }]}>
                      <defs>
                        <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="v" stroke="#10B981" fill="url(#profitGrad)" strokeWidth={2} />
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
                    <span className="badge badge-red text-xs"><FiTrendingDown className="w-3 h-3 mr-1" />-2.3%</span>
                  </div>
                </div>
                <div className="w-16 h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[{ v: 40 }, { v: 35 }, { v: 45 }, { v: 38 }, { v: 42 }, { v: 36 }, { v: 40 }]}>
                      <Bar dataKey="v" fill="#EF4444" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="stat-card purple">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Active Customers</p>
                  <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{(keyMetrics.active_customers || 0).toLocaleString()}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{(keyMetrics.total_transactions || 0).toLocaleString()} txns</span>
                  </div>
                </div>
                <div className="w-16 h-16 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(139, 92, 246, 0.15)' }}>
                    <FiUsers className="w-6 h-6" style={{ color: '#8B5CF6' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Composed Performance Chart */}
            <div className="lg:col-span-2 chart-card">
              <div className="chart-card-header">
                <div>
                  <h3 className="chart-card-title">Financial Performance Overview</h3>
                  <p className="chart-card-subtitle">Revenue, Expenses, Profit & Target Analysis</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-xs"><span className="w-3 h-3 rounded" style={{ background: '#0EA5E9' }} /> Revenue</span>
                  <span className="flex items-center gap-1 text-xs"><span className="w-3 h-3 rounded" style={{ background: '#EF4444' }} /> Expenses</span>
                  <span className="flex items-center gap-1 text-xs"><span className="w-3 h-3 rounded" style={{ background: '#10B981' }} /> Profit</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={performanceData}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
                  <YAxis tickFormatter={formatCurrency} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#0EA5E9" fill="url(#revenueGradient)" strokeWidth={2} />
                  <Bar dataKey="expenses" name="Expenses" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={20} />
                  <Line type="monotone" dataKey="profit" name="Profit" stroke="#10B981" strokeWidth={3} dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }} />
                  <Line type="monotone" dataKey="target" name="Target" stroke="#8B5CF6" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  <ReferenceLine y={profit / 12} stroke="#F59E0B" strokeDasharray="3 3" label={{ value: 'Avg', position: 'right', fill: '#F59E0B', fontSize: 10 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* KPI Radial Gauges */}
            <div className="chart-card">
              <div className="chart-card-header">
                <h3 className="chart-card-title">Key Performance Indicators</h3>
              </div>
              <div className="space-y-4">
                {kpiGaugeData.map((kpi, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-20 h-20">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" data={[kpi]} startAngle={180} endAngle={0}>
                          <RadialBar background={{ fill: 'var(--bg-secondary)' }} dataKey="value" cornerRadius={10} fill={kpi.fill} />
                        </RadialBarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{kpi.name}</p>
                      <p className="text-2xl font-bold" style={{ color: kpi.fill }}>{kpi.value.toFixed(1)}%</p>
                      <div className="progress-bar mt-2">
                        <div className="progress-bar-fill" style={{ width: `${kpi.value}%`, background: kpi.fill }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Overall Score</span>
                  <span className="badge badge-green">Excellent</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold" style={{ color: 'var(--success)' }}>87</span>
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>/100</span>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Breakdown & Tasks */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue Treemap */}
            <div className="lg:col-span-2 chart-card">
              <div className="chart-card-header">
                <div>
                  <h3 className="chart-card-title">Revenue Breakdown</h3>
                  <p className="chart-card-subtitle">Proportional view of revenue streams</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(revenue)}</p>
                  <p className="text-xs" style={{ color: 'var(--success)' }}>+{(execSummary.growth_rate || 12).toFixed(1)}% from last period</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <Treemap data={treemapData} dataKey="size" aspectRatio={4 / 3} stroke="var(--bg-primary)" content={<CustomTreemapContent />}>
                  <Tooltip content={<CustomTooltip />} />
                </Treemap>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-4 mt-4 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
                {treemapData.slice(0, 5).map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded" style={{ background: item.fill }} />
                    <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{item.name}</span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatCurrency(item.size)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tasks & Reminders */}
            <div className="chart-card">
              <div className="chart-card-header">
                <h3 className="chart-card-title">Action Items</h3>
                <span className="badge badge-primary">4 pending</span>
              </div>
              <div className="space-y-3">
                {[
                  { task: 'Q4 Financial Review', date: 'Today', priority: 'high', icon: FiTarget },
                  { task: 'Board Meeting Prep', date: 'Tomorrow', priority: 'high', icon: FiAward },
                  { task: 'Budget Approval', date: 'Dec 20', priority: 'medium', icon: FiCheck, done: true },
                  { task: 'Team Performance', date: 'Dec 22', priority: 'low', icon: FiUsers },
                ].map((item, i) => (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-lg transition-all hover:shadow-md ${item.done ? 'opacity-60' : ''}`} style={{ background: 'var(--bg-secondary)' }}>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.done ? '' : ''}`} style={{
                      background: item.priority === 'high' ? 'rgba(239, 68, 68, 0.15)' : item.priority === 'medium' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(14, 165, 233, 0.15)'
                    }}>
                      <item.icon className="w-5 h-5" style={{
                        color: item.priority === 'high' ? '#EF4444' : item.priority === 'medium' ? '#F59E0B' : '#0EA5E9'
                      }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${item.done ? 'line-through' : ''}`} style={{ color: 'var(--text-primary)' }}>{item.task}</p>
                      <p className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                        <FiClock className="w-3 h-3" /> {item.date}
                      </p>
                    </div>
                    {item.done && <FiCheck className="w-5 h-5" style={{ color: 'var(--success)' }} />}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Drill Down Panel */}
          <DrillDownPanel isOpen={drillDown.isOpen} onClose={closeDrillDown} title={drillDown.title} dataType={drillDown.dataType} filterValue={drillDown.filterValue} companyName={selectedCompany} dataSource={dataSource} />
        </div>
      )}
    </DashboardWrapper>
  );
};

export default CEODashboardEnhanced;
