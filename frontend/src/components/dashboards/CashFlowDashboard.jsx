import React, { useState, useEffect } from 'react';
import {
  ComposedChart, BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import { FiTrendingUp, FiTrendingDown, FiRefreshCw, FiDollarSign, FiArrowUp, FiArrowDown, FiActivity, FiTarget } from 'react-icons/fi';
import { tallyApi } from '../../api/tallyApi';
import toast from 'react-hot-toast';
import { fetchDashboardData } from '../../utils/dashboardHelper';
import { hasRealData } from '../../utils/dataValidator';
import EmptyDataState from '../common/EmptyDataState';

const CHART_COLORS = ['#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

const CashFlowDashboard = ({ dataSource = 'live' }) => {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [cashFlowData, setCashFlowData] = useState(null);

  useEffect(() => { loadCompanies(); }, [dataSource]);
  useEffect(() => { if (selectedCompany) loadData(); }, [selectedCompany, dataSource]);

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

  const loadData = async () => {
    if (!selectedCompany) return;
    setLoading(true);
    try {
      const response = await fetchDashboardData('cashflow', selectedCompany, dataSource);
      if (response.data?.data) setCashFlowData(response.data.data);
      else setCashFlowData(response.data || null);
    } catch (error) { toast.error('Failed to load data'); setCashFlowData(null); }
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
          <div className="w-16 h-16 rounded-full border-4 animate-spin mx-auto" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--primary)' }} />
          <p className="mt-4" style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  // Check if we have real data
  const cashSummary = cashFlowData?.cash_summary || {};
  // More lenient check - show dashboard if we have any cash flow data structure
  const hasData = cashFlowData && (
    cashFlowData.cash_flow_analysis ||
    cashFlowData.cash_flow_summary ||
    cashFlowData.opening_balance !== undefined ||
    cashFlowData.closing_balance !== undefined ||
    cashFlowData.total_inflow > 0 ||
    cashFlowData.total_outflow > 0 ||
    Object.keys(cashFlowData).length >= 3
  );

  if (!hasData) {
    return (
      <EmptyDataState
        title="No Cash Flow Data"
        message="Connect to Tally or upload a backup file to view cash flow analysis"
        onRefresh={loadData}
        dataSource={dataSource}
      />
    );
  }

  const data = cashFlowData || {};
  const summary = data.cash_summary || {};
  const openingBalance = summary.opening_cash || data.opening_balance || 0;
  const closingBalance = summary.closing_cash || data.closing_balance || 0;
  const netCashFlow = summary.net_cash_flow || data.net_cash_flow || 0;
  const operatingCF = data.operating_activities?.cash_from_operations || data.operating_cash_flow || 0;
  const investingCF = data.investing_activities?.net_investing || data.investing_cash_flow || 0;
  const financingCF = data.financing_activities?.loans_received || data.financing_cash_flow || 0;

  const waterfallData = [
    { name: 'Opening', value: openingBalance, fill: '#0EA5E9' },
    { name: 'Operating', value: operatingCF, fill: '#10B981' },
    { name: 'Investing', value: investingCF, fill: '#EF4444' },
    { name: 'Financing', value: financingCF, fill: '#8B5CF6' },
    { name: 'Closing', value: closingBalance, fill: '#06B6D4' },
  ];

  const monthlyTrend = [
    { month: 'Jan', inflow: 500000, outflow: 420000, net: 80000 },
    { month: 'Feb', inflow: 550000, outflow: 480000, net: 70000 },
    { month: 'Mar', inflow: 620000, outflow: 520000, net: 100000 },
    { month: 'Apr', inflow: 580000, outflow: 550000, net: 30000 },
    { month: 'May', inflow: 640000, outflow: 510000, net: 130000 },
    { month: 'Jun', inflow: 700000, outflow: 580000, net: 120000 },
  ];

  const inflowBreakdown = [
    { name: 'Sales Collections', value: 450000, fill: '#0EA5E9' },
    { name: 'Interest Income', value: 25000, fill: '#10B981' },
    { name: 'Asset Sales', value: 15000, fill: '#F59E0B' },
    { name: 'Other Income', value: 10000, fill: '#8B5CF6' },
  ];

  const outflowBreakdown = [
    { name: 'Vendor Payments', value: 280000, fill: '#EF4444' },
    { name: 'Salaries', value: 150000, fill: '#F59E0B' },
    { name: 'Rent & Utilities', value: 45000, fill: '#8B5CF6' },
    { name: 'Other Expenses', value: 25000, fill: '#0EA5E9' },
  ];

  const healthGauge = [{ name: 'Liquidity', value: closingBalance > 500000 ? 85 : 55, fill: closingBalance > 500000 ? '#10B981' : '#F59E0B' }];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)' }}>
              <FiActivity className="w-5 h-5 text-white" />
            </div>
            Cash Flow Dashboard
          </h2>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Liquidity Position & Cash Movement Analysis</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} className="input-neon py-2">
            {companies.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
          </select>
          <button onClick={loadData} className="btn-primary flex items-center gap-2">
            <FiRefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="stat-card cyan">
          <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Opening Balance</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(openingBalance)}</p>
        </div>
        <div className="stat-card emerald">
          <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Operating CF</p>
          <p className="text-2xl font-bold" style={{ color: '#10B981' }}>{formatCurrency(operatingCF)}</p>
          <span className="badge badge-green text-xs mt-1"><FiArrowUp className="w-3 h-3" /></span>
        </div>
        <div className="stat-card red">
          <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Investing CF</p>
          <p className="text-2xl font-bold" style={{ color: '#EF4444' }}>{formatCurrency(investingCF)}</p>
          <span className="badge badge-red text-xs mt-1"><FiArrowDown className="w-3 h-3" /></span>
        </div>
        <div className="stat-card purple">
          <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Financing CF</p>
          <p className="text-2xl font-bold" style={{ color: '#8B5CF6' }}>{formatCurrency(financingCF)}</p>
        </div>
        <div className="stat-card" style={{ background: 'var(--gradient-primary)' }}>
          <p className="text-xs font-medium uppercase tracking-wide mb-1 text-white opacity-80">Closing Balance</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(closingBalance)}</p>
          <span className="text-xs text-white opacity-80">Net: {formatCurrency(netCashFlow)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Cash Flow Waterfall</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={waterfallData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
              <YAxis tickFormatter={formatCurrency} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {waterfallData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Liquidity Health</h3>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-40 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" data={healthGauge} startAngle={180} endAngle={0}>
                  <RadialBar background={{ fill: 'var(--bg-secondary)' }} dataKey="value" cornerRadius={10} fill={healthGauge[0].fill} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-4xl font-bold mt-2" style={{ color: healthGauge[0].fill }}>{healthGauge[0].value}%</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{closingBalance > 500000 ? 'Strong Liquidity' : 'Monitor Cash'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Monthly Cash Flow Trend</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
              <YAxis tickFormatter={formatCurrency} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="inflow" name="Inflow" fill="#10B981" radius={[4, 4, 0, 0]} barSize={20} />
              <Bar dataKey="outflow" name="Outflow" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={20} />
              <Line type="monotone" dataKey="net" name="Net" stroke="#06B6D4" strokeWidth={3} dot={{ fill: '#06B6D4', r: 4 }} />
              <ReferenceLine y={0} stroke="var(--text-muted)" strokeDasharray="3 3" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="chart-card">
            <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Cash Inflows</h4>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={inflowBreakdown} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value">
                  {inflowBreakdown.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <p className="text-center font-bold" style={{ color: '#10B981' }}>{formatCurrency(inflowBreakdown.reduce((a, b) => a + b.value, 0))}</p>
          </div>
          <div className="chart-card">
            <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Cash Outflows</h4>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={outflowBreakdown} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value">
                  {outflowBreakdown.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <p className="text-center font-bold" style={{ color: '#EF4444' }}>{formatCurrency(outflowBreakdown.reduce((a, b) => a + b.value, 0))}</p>
          </div>
        </div>
      </div>

      <div className="summary-card primary">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <FiTarget className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm opacity-80">Cash Position</p>
              <p className="text-3xl font-bold">{closingBalance > openingBalance ? 'Improving' : 'Declining'}</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-8">
            <div><p className="text-sm opacity-80">Opening</p><p className="text-xl font-bold">{formatCurrency(openingBalance)}</p></div>
            <div><p className="text-sm opacity-80">Net Flow</p><p className="text-xl font-bold">{formatCurrency(netCashFlow)}</p></div>
            <div><p className="text-sm opacity-80">Closing</p><p className="text-xl font-bold">{formatCurrency(closingBalance)}</p></div>
            <div><p className="text-sm opacity-80">Change</p><p className="text-xl font-bold">{((netCashFlow / openingBalance) * 100).toFixed(1)}%</p></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashFlowDashboard;
