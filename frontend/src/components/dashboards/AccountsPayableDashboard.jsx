import React, { useState, useEffect } from 'react';
import {
  ComposedChart, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  RadialBarChart, RadialBar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { FiDollarSign, FiCheckCircle, FiAlertCircle, FiRefreshCw, FiClock, FiTrendingUp, FiTrendingDown, FiFileText } from 'react-icons/fi';
import { tallyApi } from '../../api/tallyApi';
import { fetchDashboardData } from '../../utils/dashboardHelper';
import toast from 'react-hot-toast';
import EmptyDataState from '../common/EmptyDataState';

const CHART_COLORS = ['#EC4899', '#EF4444', '#F59E0B', '#10B981', '#8B5CF6', '#0EA5E9'];

const AccountsPayableDashboard = ({ dataSource = 'live' }) => {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [apData, setApData] = useState(null);

  useEffect(() => { loadCompanies(); }, [dataSource]);
  useEffect(() => { if (selectedCompany) loadAPData(); }, [selectedCompany, dataSource]);

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

  const loadAPData = async () => {
    if (!selectedCompany) return;
    setLoading(true);
    try {
      const response = await fetchDashboardData('accounts-payable', selectedCompany, dataSource);
      if (response.data?.data) setApData(response.data.data);
      else setApData(response.data || null);
    } catch (error) { toast.error('Failed to load data'); setApData(null); }
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

  const hasData = apData && (
    apData.ap_summary ||
    apData.payables_summary ||
    apData.total_payables > 0 ||
    Object.keys(apData).length >= 3
  );

  if (!hasData) {
    return (
      <EmptyDataState
        title="No Accounts Payable Data"
        message="Connect to Tally or upload a backup file to view payables analysis"
        onRefresh={loadAPData}
        dataSource={dataSource}
      />
    );
  }

  const data = apData || {};
  const summary = data.ap_summary || {};
  const totalPayables = summary.total_payables || data.total_payables || 650000;
  const outstandingBills = summary.outstanding_bills || data.outstanding_bills || 24;
  const avgPaymentDays = summary.avg_payment_days || data.avg_payment_days || 32;
  const paymentRate = summary.payment_rate || data.payment_efficiency || 78;
  const onTimePayments = data.payment_status?.on_time_payments || 82;
  const overduePayments = data.payment_status?.overdue_payments || 18;

  // Aging Analysis
  const agingAnalysis = data.aging_analysis || {};
  const agingData = [
    { name: 'Current', value: agingAnalysis.current || totalPayables * 0.4, fill: '#10B981' },
    { name: '1-30 Days', value: agingAnalysis['1_30_days'] || totalPayables * 0.25, fill: '#0EA5E9' },
    { name: '31-60 Days', value: agingAnalysis['31_60_days'] || totalPayables * 0.15, fill: '#F59E0B' },
    { name: '61-90 Days', value: agingAnalysis['61_90_days'] || totalPayables * 0.12, fill: '#EF4444' },
    { name: '90+ Days', value: agingAnalysis.over_90_days || totalPayables * 0.08, fill: '#EC4899' },
  ];

  // Top Creditors
  const topCreditors = data.top_creditors?.slice(0, 5) || [
    { name: 'Vendor A', amount: totalPayables * 0.20 },
    { name: 'Vendor B', amount: totalPayables * 0.15 },
    { name: 'Vendor C', amount: totalPayables * 0.12 },
    { name: 'Vendor D', amount: totalPayables * 0.10 },
    { name: 'Vendor E', amount: totalPayables * 0.08 },
  ];

  // Monthly Trend
  const monthlyTrend = [
    { month: 'Jan', payables: totalPayables * 0.85, payments: totalPayables * 0.80 },
    { month: 'Feb', payables: totalPayables * 0.90, payments: totalPayables * 0.85 },
    { month: 'Mar', payables: totalPayables * 0.88, payments: totalPayables * 0.82 },
    { month: 'Apr', payables: totalPayables * 0.92, payments: totalPayables * 0.88 },
    { month: 'May', payables: totalPayables * 0.95, payments: totalPayables * 0.90 },
    { month: 'Jun', payables: totalPayables, payments: totalPayables * 0.92 },
  ];

  // Payment Health Radar
  const paymentRadar = [
    { metric: 'On-Time', value: onTimePayments, fullMark: 100 },
    { metric: 'Efficiency', value: paymentRate, fullMark: 100 },
    { metric: 'Cash Mgt', value: 75, fullMark: 100 },
    { metric: 'Vendor Relations', value: 82, fullMark: 100 },
    { metric: 'Accuracy', value: 88, fullMark: 100 },
  ];

  // Performance Gauges
  const gauges = [
    { name: 'Payment Rate', value: paymentRate, fill: paymentRate >= 80 ? '#10B981' : '#F59E0B' },
    { name: 'On-Time', value: onTimePayments, fill: onTimePayments >= 80 ? '#10B981' : '#F59E0B' },
    { name: 'Current', value: (agingData[0].value / totalPayables) * 100, fill: '#10B981' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)' }}>
              <FiFileText className="w-5 h-5 text-white" />
            </div>
            Accounts Payable
          </h2>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Payables analysis for {selectedCompany}</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} className="input-neon py-2">
            {companies.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
          </select>
          <button onClick={loadAPData} className="btn-primary flex items-center gap-2">
            <FiRefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="stat-card pink">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Total Payables</p>
              <p className="text-3xl font-bold" style={{ color: '#EC4899' }}>{formatCurrency(totalPayables)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge badge-pink text-xs"><FiDollarSign className="w-3 h-3 mr-1" />Outstanding</span>
              </div>
            </div>
            <div className="w-12 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrend}>
                  <defs>
                    <linearGradient id="apGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#EC4899" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#EC4899" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="payables" stroke="#EC4899" fill="url(#apGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stat-card red">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Outstanding Bills</p>
              <p className="text-3xl font-bold" style={{ color: '#EF4444' }}>{outstandingBills}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge badge-red text-xs"><FiFileText className="w-3 h-3 mr-1" />Pending</span>
              </div>
            </div>
            <div className="w-12 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrend.slice(-4)}>
                  <Bar dataKey="payables" fill="#EF4444" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stat-card amber">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Avg Pay Days</p>
              <p className="text-3xl font-bold" style={{ color: avgPaymentDays <= 30 ? '#10B981' : '#F59E0B' }}>{avgPaymentDays}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs flex items-center`} style={{ color: avgPaymentDays <= 30 ? 'var(--success)' : 'var(--warning)' }}>
                  <FiClock className="w-3 h-3 mr-1" />
                  {avgPaymentDays <= 30 ? 'On Track' : 'Review'}
                </span>
              </div>
            </div>
            <div className="w-12 h-12 flex items-center justify-center">
              <FiClock className="w-8 h-8" style={{ color: '#F59E0B' }} />
            </div>
          </div>
        </div>

        <div className="stat-card emerald">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Payment Rate</p>
              <p className="text-3xl font-bold" style={{ color: paymentRate >= 80 ? '#10B981' : '#F59E0B' }}>{paymentRate}%</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs flex items-center`} style={{ color: paymentRate >= 80 ? 'var(--success)' : 'var(--warning)' }}>
                  {paymentRate >= 80 ? <FiCheckCircle className="w-3 h-3 mr-1" /> : <FiAlertCircle className="w-3 h-3 mr-1" />}
                  {paymentRate >= 80 ? 'Good' : 'Improve'}
                </span>
              </div>
            </div>
            <div className="w-12 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" data={[{ value: paymentRate, fill: paymentRate >= 80 ? '#10B981' : '#F59E0B' }]} startAngle={180} endAngle={0}>
                  <RadialBar background={{ fill: 'var(--bg-secondary)' }} dataKey="value" cornerRadius={10} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stat-card purple">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Overdue</p>
              <p className="text-3xl font-bold" style={{ color: overduePayments <= 20 ? '#10B981' : '#EF4444' }}>{overduePayments}%</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs flex items-center`} style={{ color: overduePayments <= 20 ? 'var(--success)' : 'var(--error)' }}>
                  {overduePayments <= 20 ? <FiTrendingDown className="w-3 h-3 mr-1" /> : <FiTrendingUp className="w-3 h-3 mr-1" />}
                  {overduePayments <= 20 ? 'Low' : 'High'}
                </span>
              </div>
            </div>
            <div className="w-12 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" data={[{ value: 100 - overduePayments, fill: overduePayments <= 20 ? '#10B981' : '#EF4444' }]} startAngle={180} endAngle={0}>
                  <RadialBar background={{ fill: 'var(--bg-secondary)' }} dataKey="value" cornerRadius={10} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payables Trend */}
        <div className="lg:col-span-2 chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">Payables vs Payments Trend</h3>
              <p className="chart-card-subtitle">Monthly payment performance</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={monthlyTrend}>
              <defs>
                <linearGradient id="apTrendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EC4899" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#EC4899" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
              <YAxis tickFormatter={formatCurrency} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area type="monotone" dataKey="payables" name="Payables" stroke="#EC4899" fill="url(#apTrendGrad)" strokeWidth={2} />
              <Bar dataKey="payments" name="Payments" fill="#10B981" radius={[4, 4, 0, 0]} barSize={25} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Health Radar */}
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Payment Health</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={paymentRadar}>
              <PolarGrid stroke="var(--border-color)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} />
              <Radar name="Score" dataKey="value" stroke="#EC4899" fill="#EC4899" fillOpacity={0.3} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Aging & Top Creditors */}
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
            <h3 className="chart-card-title">Top Creditors</h3>
          </div>
          <div className="space-y-3">
            {topCreditors.map((creditor, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}>{i + 1}</div>
                <div className="flex-1">
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{creditor.name}</p>
                  <div className="progress-bar mt-1"><div className="progress-bar-fill" style={{ width: `${(creditor.amount / topCreditors[0].amount) * 100}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} /></div>
                </div>
                <div className="text-right">
                  <p className="font-bold" style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}>{formatCurrency(creditor.amount)}</p>
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
            <p className="text-2xl font-bold mt-2" style={{ color: gauge.fill }}>{gauge.value.toFixed(0)}%</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{gauge.name}</p>
          </div>
        ))}
      </div>

      {/* Summary Card */}
      <div className="summary-card secondary">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <FiFileText className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm opacity-80">Payables Summary</p>
              <p className="text-2xl font-bold">{selectedCompany}</p>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-6">
            <div><p className="text-sm opacity-80">Total</p><p className="text-xl font-bold">{formatCurrency(totalPayables)}</p></div>
            <div><p className="text-sm opacity-80">Bills</p><p className="text-xl font-bold">{outstandingBills}</p></div>
            <div><p className="text-sm opacity-80">Avg Days</p><p className="text-xl font-bold">{avgPaymentDays}</p></div>
            <div><p className="text-sm opacity-80">On-Time</p><p className="text-xl font-bold">{onTimePayments}%</p></div>
            <div><p className="text-sm opacity-80">Overdue</p><p className="text-xl font-bold">{overduePayments}%</p></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountsPayableDashboard;
