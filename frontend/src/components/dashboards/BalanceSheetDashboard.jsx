import React, { useState, useEffect } from 'react';
import {
  ComposedChart, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  RadialBarChart, RadialBar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { FiDollarSign, FiTrendingUp, FiTrendingDown, FiAlertCircle, FiRefreshCw, FiLayers, FiGrid, FiCheckCircle } from 'react-icons/fi';
import { tallyApi } from '../../api/tallyApi';
import toast from 'react-hot-toast';
import { fetchDashboardData } from '../../utils/dashboardHelper';
import EmptyDataState from '../common/EmptyDataState';

const CHART_COLORS = ['#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

const BalanceSheetDashboard = ({ dataSource = 'live' }) => {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [bsData, setBsData] = useState(null);

  useEffect(() => { loadCompanies(); }, [dataSource]);
  useEffect(() => { if (selectedCompany) loadBSData(); }, [selectedCompany, dataSource]);

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

  const loadBSData = async () => {
    if (!selectedCompany) return;
    setLoading(true);
    try {
      const response = await fetchDashboardData('balance-sheet', selectedCompany, dataSource);
      if (response.data?.data) setBsData(response.data.data);
      else setBsData(response.data || null);
    } catch (error) { toast.error('Failed to load data'); setBsData(null); }
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

  const hasData = bsData && (
    bsData.balance_sheet_summary ||
    bsData.assets ||
    bsData.liabilities ||
    bsData.total_assets > 0 ||
    Object.keys(bsData).length >= 3
  );

  if (!hasData) {
    return (
      <EmptyDataState
        title="No Balance Sheet Data"
        message="Connect to Tally or upload a backup file to view balance sheet"
        onRefresh={loadBSData}
        dataSource={dataSource}
      />
    );
  }

  const data = bsData || {};
  const totalAssets = data.total_assets || data.balance_sheet?.total_assets || 0;
  const totalLiabilities = data.total_liabilities || data.balance_sheet?.total_liabilities || 0;
  const totalEquity = data.total_equity || data.balance_sheet?.total_equity || (totalAssets - totalLiabilities);
  const currentAssets = data.current_assets || totalAssets * 0.6;
  const fixedAssets = data.fixed_assets || totalAssets * 0.35;
  const currentLiabilities = data.current_liabilities || totalLiabilities * 0.4;
  const longTermLiabilities = data.long_term_liabilities || totalLiabilities * 0.6;

  // Financial Ratios
  const currentRatio = currentLiabilities > 0 ? (currentAssets / currentLiabilities) : 0;
  const debtToEquity = totalEquity > 0 ? (totalLiabilities / totalEquity) : 0;
  const equityRatio = totalAssets > 0 ? ((totalEquity / totalAssets) * 100) : 0;

  // Assets Composition
  const assetsComposition = [
    { name: 'Current Assets', value: currentAssets, fill: '#0EA5E9' },
    { name: 'Fixed Assets', value: fixedAssets, fill: '#10B981' },
    { name: 'Investments', value: totalAssets * 0.05, fill: '#8B5CF6' },
  ];

  // Liabilities Composition
  const liabilitiesComposition = [
    { name: 'Current Liabilities', value: currentLiabilities, fill: '#EF4444' },
    { name: 'Long-term Liabilities', value: longTermLiabilities, fill: '#F59E0B' },
  ];

  // Balance Position
  const balancePosition = [
    { name: 'Assets', value: totalAssets, fill: '#0EA5E9' },
    { name: 'Liabilities', value: totalLiabilities, fill: '#EF4444' },
    { name: 'Equity', value: totalEquity, fill: '#10B981' },
  ];

  // Financial Health Radar
  const healthRadar = [
    { metric: 'Liquidity', value: Math.min(currentRatio * 30, 100), fullMark: 100 },
    { metric: 'Solvency', value: Math.min((1 / (debtToEquity || 1)) * 50, 100), fullMark: 100 },
    { metric: 'Equity Strength', value: equityRatio, fullMark: 100 },
    { metric: 'Asset Quality', value: 75, fullMark: 100 },
    { metric: 'Debt Management', value: Math.max(100 - debtToEquity * 20, 20), fullMark: 100 },
  ];

  // Ratio Gauges
  const ratioGauges = [
    { name: 'Current Ratio', value: Math.min(currentRatio * 25, 100), target: 2, actual: currentRatio, fill: currentRatio >= 2 ? '#10B981' : '#F59E0B' },
    { name: 'D/E Ratio', value: Math.min(100 - debtToEquity * 20, 100), target: 1, actual: debtToEquity, fill: debtToEquity <= 1 ? '#10B981' : '#EF4444' },
    { name: 'Equity Ratio', value: equityRatio, target: 50, actual: equityRatio, fill: equityRatio >= 50 ? '#10B981' : '#F59E0B' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)' }}>
              <FiGrid className="w-5 h-5 text-white" />
            </div>
            Balance Sheet
          </h2>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Assets, Liabilities & Equity for {selectedCompany}</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} className="input-neon py-2">
            {companies.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
          </select>
          <button onClick={loadBSData} className="btn-primary flex items-center gap-2">
            <FiRefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card cyan">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Total Assets</p>
              <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(totalAssets)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge badge-cyan text-xs"><FiLayers className="w-3 h-3 mr-1" />Book value</span>
              </div>
            </div>
            <div className="w-16 h-16">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={assetsComposition.slice(0, 2)} cx="50%" cy="50%" innerRadius={18} outerRadius={28} dataKey="value">
                    {assetsComposition.slice(0, 2).map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stat-card red">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Total Liabilities</p>
              <p className="text-3xl font-bold" style={{ color: '#EF4444' }}>{formatCurrency(totalLiabilities)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge badge-red text-xs"><FiTrendingDown className="w-3 h-3 mr-1" />Debt</span>
              </div>
            </div>
            <div className="w-16 h-16">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" data={[{ value: Math.min((totalLiabilities / totalAssets) * 100, 100), fill: '#EF4444' }]} startAngle={180} endAngle={0}>
                  <RadialBar background={{ fill: 'var(--bg-secondary)' }} dataKey="value" cornerRadius={10} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stat-card emerald">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Net Worth</p>
              <p className="text-3xl font-bold" style={{ color: '#10B981' }}>{formatCurrency(totalEquity)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge badge-green text-xs"><FiTrendingUp className="w-3 h-3 mr-1" />Equity</span>
              </div>
            </div>
            <div className="w-16 h-16">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[{ v: 30 }, { v: 45 }, { v: 35 }, { v: 55 }, { v: 48 }, { v: 60 }, { v: 55 }]}>
                  <defs>
                    <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke="#10B981" fill="url(#eqGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stat-card purple">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Current Ratio</p>
              <p className="text-3xl font-bold" style={{ color: currentRatio >= 2 ? '#10B981' : '#F59E0B' }}>{currentRatio.toFixed(2)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs flex items-center gap-1`} style={{ color: currentRatio >= 2 ? 'var(--success)' : 'var(--warning)' }}>
                  {currentRatio >= 2 ? <FiCheckCircle className="w-3 h-3" /> : <FiAlertCircle className="w-3 h-3" />}
                  {currentRatio >= 2 ? 'Healthy' : 'Monitor'}
                </span>
              </div>
            </div>
            <div className="w-16 h-16">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" data={[{ value: Math.min(currentRatio * 25, 100), fill: currentRatio >= 2 ? '#10B981' : '#F59E0B' }]} startAngle={180} endAngle={0}>
                  <RadialBar background={{ fill: 'var(--bg-secondary)' }} dataKey="value" cornerRadius={10} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Balance Position */}
        <div className="lg:col-span-2 chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">Financial Position</h3>
              <p className="chart-card-subtitle">Assets vs Liabilities vs Equity</p>
            </div>
            <span className={`badge ${totalEquity > 0 ? 'badge-green' : 'badge-red'}`}>{totalEquity > 0 ? 'Positive Equity' : 'Negative Equity'}</span>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={balancePosition}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
              <YAxis tickFormatter={formatCurrency} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={60}>
                {balancePosition.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Financial Health Radar */}
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Financial Health</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={healthRadar}>
              <PolarGrid stroke="var(--border-color)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} />
              <Radar name="Score" dataKey="value" stroke="#0EA5E9" fill="#0EA5E9" fillOpacity={0.3} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Composition Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Assets Composition</h3>
          </div>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={220}>
              <PieChart>
                <Pie data={assetsComposition} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {assetsComposition.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-3">
              {assetsComposition.map((item, i) => (
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
            <h3 className="chart-card-title">Liabilities Composition</h3>
          </div>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={220}>
              <PieChart>
                <Pie data={liabilitiesComposition} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {liabilitiesComposition.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-3">
              {liabilitiesComposition.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full" style={{ background: item.fill }} />
                  <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{item.name}</span>
                  <span className="font-bold text-sm" style={{ color: item.fill }}>{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Financial Ratios */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {ratioGauges.map((ratio, i) => (
          <div key={i} className="chart-card flex flex-col items-center justify-center py-6">
            <div className="w-28 h-28">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" data={[ratio]} startAngle={180} endAngle={0}>
                  <RadialBar background={{ fill: 'var(--bg-secondary)' }} dataKey="value" cornerRadius={10} fill={ratio.fill} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-2xl font-bold mt-2" style={{ color: ratio.fill }}>{ratio.actual.toFixed(2)}</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{ratio.name}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Target: {ratio.target}</p>
          </div>
        ))}
      </div>

      {/* Summary Card */}
      <div className="summary-card primary">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <FiGrid className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm opacity-80">Balance Sheet Summary</p>
              <p className="text-2xl font-bold">{selectedCompany}</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-8">
            <div><p className="text-sm opacity-80">Assets</p><p className="text-xl font-bold">{formatCurrency(totalAssets)}</p></div>
            <div><p className="text-sm opacity-80">Liabilities</p><p className="text-xl font-bold">{formatCurrency(totalLiabilities)}</p></div>
            <div><p className="text-sm opacity-80">Equity</p><p className="text-xl font-bold">{formatCurrency(totalEquity)}</p></div>
            <div><p className="text-sm opacity-80">D/E Ratio</p><p className="text-xl font-bold">{debtToEquity.toFixed(2)}</p></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BalanceSheetDashboard;
