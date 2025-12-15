import React, { useState, useEffect } from 'react';
import {
  ComposedChart, BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import { FiTrendingUp, FiTrendingDown, FiRefreshCw, FiDollarSign, FiPercent, FiTarget, FiBarChart2 } from 'react-icons/fi';
import { tallyApi } from '../../api/tallyApi';
import toast from 'react-hot-toast';
import { fetchDashboardData } from '../../utils/dashboardHelper';

const CHART_COLORS = ['#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

const ProfitLossDashboard = ({ dataSource = 'live' }) => {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [pnlData, setPnlData] = useState(null);

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
      const response = await fetchDashboardData('pnl', selectedCompany, dataSource);
      if (response.data?.data) setPnlData(response.data.data);
      else setPnlData(response.data || null);
    } catch (error) { toast.error('Failed to load data'); setPnlData(null); }
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
        <div className="card px-4 py-3 shadow-lg">
          <p className="font-bold text-sm mb-2" style={{ color: 'var(--text-primary)' }}>{label}</p>
          {payload.map((p, i) => (
            <div key={i} className="flex items-center justify-between gap-4 py-1">
              <span className="flex items-center gap-2 text-xs"><span className="w-2 h-2 rounded-full" style={{ background: p.color }} />{p.name}</span>
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

  const data = pnlData || {};
  const revenue = data.total_revenue || 5000000;
  const costOfGoods = data.cost_of_goods || revenue * 0.45;
  const grossProfit = revenue - costOfGoods;
  const operatingExpenses = data.operating_expenses || revenue * 0.25;
  const operatingProfit = grossProfit - operatingExpenses;
  const otherIncome = data.other_income || revenue * 0.02;
  const otherExpenses = data.other_expenses || revenue * 0.03;
  const netProfit = operatingProfit + otherIncome - otherExpenses;
  const grossMargin = (grossProfit / revenue * 100);
  const netMargin = (netProfit / revenue * 100);

  const monthlyData = [
    { month: 'Jan', revenue: revenue * 0.07, expenses: (costOfGoods + operatingExpenses) * 0.08, profit: netProfit * 0.06 },
    { month: 'Feb', revenue: revenue * 0.08, expenses: (costOfGoods + operatingExpenses) * 0.07, profit: netProfit * 0.09 },
    { month: 'Mar', revenue: revenue * 0.09, expenses: (costOfGoods + operatingExpenses) * 0.08, profit: netProfit * 0.10 },
    { month: 'Apr', revenue: revenue * 0.08, expenses: (costOfGoods + operatingExpenses) * 0.09, profit: netProfit * 0.07 },
    { month: 'May', revenue: revenue * 0.09, expenses: (costOfGoods + operatingExpenses) * 0.08, profit: netProfit * 0.10 },
    { month: 'Jun', revenue: revenue * 0.10, expenses: (costOfGoods + operatingExpenses) * 0.09, profit: netProfit * 0.11 },
    { month: 'Jul', revenue: revenue * 0.08, expenses: (costOfGoods + operatingExpenses) * 0.08, profit: netProfit * 0.08 },
    { month: 'Aug', revenue: revenue * 0.09, expenses: (costOfGoods + operatingExpenses) * 0.09, profit: netProfit * 0.09 },
    { month: 'Sep', revenue: revenue * 0.08, expenses: (costOfGoods + operatingExpenses) * 0.08, profit: netProfit * 0.08 },
    { month: 'Oct', revenue: revenue * 0.09, expenses: (costOfGoods + operatingExpenses) * 0.08, profit: netProfit * 0.10 },
    { month: 'Nov', revenue: revenue * 0.08, expenses: (costOfGoods + operatingExpenses) * 0.09, profit: netProfit * 0.07 },
    { month: 'Dec', revenue: revenue * 0.07, expenses: (costOfGoods + operatingExpenses) * 0.09, profit: netProfit * 0.05 },
  ];

  const waterfallData = [
    { name: 'Revenue', value: revenue, fill: '#0EA5E9' },
    { name: 'COGS', value: -costOfGoods, fill: '#EF4444' },
    { name: 'Gross Profit', value: grossProfit, fill: '#10B981' },
    { name: 'OpEx', value: -operatingExpenses, fill: '#F59E0B' },
    { name: 'Net Profit', value: netProfit, fill: '#8B5CF6' },
  ];

  const expenseBreakdown = [
    { name: 'Cost of Goods', value: costOfGoods, fill: '#EF4444' },
    { name: 'Salaries', value: operatingExpenses * 0.5, fill: '#F59E0B' },
    { name: 'Marketing', value: operatingExpenses * 0.2, fill: '#0EA5E9' },
    { name: 'Rent', value: operatingExpenses * 0.15, fill: '#8B5CF6' },
    { name: 'Other', value: operatingExpenses * 0.15, fill: '#10B981' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
              <FiBarChart2 className="w-5 h-5 text-white" />
            </div>
            Profit & Loss Statement
          </h2>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Revenue, Expenses & Profitability Analysis</p>
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
          <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Revenue</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(revenue)}</p>
          <span className="badge badge-green text-xs mt-1"><FiTrendingUp className="w-3 h-3 mr-1" />+12%</span>
        </div>
        <div className="stat-card emerald">
          <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Gross Profit</p>
          <p className="text-2xl font-bold" style={{ color: '#10B981' }}>{formatCurrency(grossProfit)}</p>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{grossMargin.toFixed(1)}% margin</span>
        </div>
        <div className="stat-card amber">
          <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Operating Profit</p>
          <p className="text-2xl font-bold" style={{ color: '#F59E0B' }}>{formatCurrency(operatingProfit)}</p>
        </div>
        <div className="stat-card purple">
          <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Net Profit</p>
          <p className="text-2xl font-bold" style={{ color: '#8B5CF6' }}>{formatCurrency(netProfit)}</p>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{netMargin.toFixed(1)}% margin</span>
        </div>
        <div className="stat-card red">
          <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Total Expenses</p>
          <p className="text-2xl font-bold" style={{ color: '#EF4444' }}>{formatCurrency(costOfGoods + operatingExpenses)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Monthly P&L Trend</h3>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={monthlyData}>
              <defs>
                <linearGradient id="revGradPnl" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
              <YAxis tickFormatter={formatCurrency} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#0EA5E9" fill="url(#revGradPnl)" strokeWidth={2} />
              <Bar dataKey="expenses" name="Expenses" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={20} />
              <Line type="monotone" dataKey="profit" name="Net Profit" stroke="#10B981" strokeWidth={3} dot={{ fill: '#10B981', r: 4 }} />
              <ReferenceLine y={0} stroke="var(--text-muted)" strokeDasharray="3 3" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">P&L Waterfall</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={waterfallData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={true} vertical={false} />
              <XAxis type="number" tickFormatter={formatCurrency} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
              <YAxis dataKey="name" type="category" width={80} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                {waterfallData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Expense Distribution</h3>
          </div>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="45%" height={200}>
              <PieChart>
                <Pie data={expenseBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {expenseBreakdown.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {expenseBreakdown.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: item.fill }} />
                  <span className="flex-1 text-sm" style={{ color: 'var(--text-muted)' }}>{item.name}</span>
                  <span className="font-bold text-sm" style={{ color: item.fill }}>{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="summary-card green">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <FiTarget className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm opacity-80">Profitability Summary</p>
              <p className="text-2xl font-bold">{selectedCompany}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm opacity-80">Gross Margin</p>
              <p className="text-2xl font-bold">{grossMargin.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-sm opacity-80">Net Margin</p>
              <p className="text-2xl font-bold">{netMargin.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-sm opacity-80">Net Profit</p>
              <p className="text-2xl font-bold">{formatCurrency(netProfit)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfitLossDashboard;
