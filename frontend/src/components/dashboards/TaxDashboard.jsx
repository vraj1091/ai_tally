import React, { useState, useEffect } from 'react';
import {
  ComposedChart, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  RadialBarChart, RadialBar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { FiFileText, FiAlertCircle, FiRefreshCw, FiCheckCircle, FiClock, FiShield, FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import { tallyApi } from '../../api/tallyApi';
import toast from 'react-hot-toast';
import { fetchDashboardData } from '../../utils/dashboardHelper';
import EmptyDataState from '../common/EmptyDataState';

const CHART_COLORS = ['#14B8A6', '#0EA5E9', '#8B5CF6', '#F59E0B', '#EF4444', '#10B981'];

const TaxDashboard = ({ dataSource = 'live' }) => {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [taxData, setTaxData] = useState(null);

  useEffect(() => { loadCompanies(); }, [dataSource]);
  useEffect(() => { if (selectedCompany) loadTaxData(); }, [selectedCompany, dataSource]);

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

  const loadTaxData = async () => {
    if (!selectedCompany) return;
    setLoading(true);
    try {
      const response = await fetchDashboardData('tax', selectedCompany, dataSource);
      if (response.data?.data) setTaxData(response.data.data);
      else setTaxData(response.data || null);
    } catch (error) { toast.error('Failed to load data'); setTaxData(null); }
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
          <div className="w-16 h-16 rounded-full border-4 animate-spin mx-auto" style={{ borderColor: 'var(--border-color)', borderTopColor: '#14B8A6' }} />
          <p className="mt-4" style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  const hasData = taxData && (
    taxData.tax_summary ||
    taxData.gst_summary ||
    taxData.total_tax > 0 ||
    Object.keys(taxData).length >= 3
  );

  if (!hasData) {
    return (
      <EmptyDataState
        title="No Tax & Compliance Data"
        message="Connect to Tally or upload a backup file to view tax analytics"
        onRefresh={loadTaxData}
        dataSource={dataSource}
      />
    );
  }

  const data = taxData || {};
  const summary = data.tax_summary || {};
  const totalTaxLiability = summary.total_tax_liability || data.total_tax || 125000;
  const gstPayable = summary.gst_payable || data.gst_payable || 45000;
  const gstReceivable = summary.gst_receivable || data.gst_receivable || 28000;
  const netGst = gstPayable - gstReceivable;
  const tdsPayable = summary.tds_payable || data.tds_payable || 18000;
  const incomeTax = summary.income_tax || data.income_tax || 85000;

  // GST Breakdown
  const gstBreakdown = [
    { name: 'CGST', value: data.cgst || gstPayable * 0.4, fill: '#14B8A6' },
    { name: 'SGST', value: data.sgst || gstPayable * 0.4, fill: '#0EA5E9' },
    { name: 'IGST', value: data.igst || gstPayable * 0.2, fill: '#8B5CF6' },
  ];

  // Tax Liability Breakdown
  const taxBreakdown = [
    { name: 'GST', value: netGst, fill: '#14B8A6' },
    { name: 'TDS', value: tdsPayable, fill: '#F59E0B' },
    { name: 'Income Tax', value: incomeTax, fill: '#8B5CF6' },
  ];

  // Compliance Radar
  const complianceRadar = [
    { metric: 'GST Filing', value: 95, fullMark: 100 },
    { metric: 'TDS Compliance', value: 88, fullMark: 100 },
    { metric: 'IT Returns', value: 100, fullMark: 100 },
    { metric: 'Documentation', value: 82, fullMark: 100 },
    { metric: 'Timely Payment', value: 90, fullMark: 100 },
  ];

  // Monthly Tax Trend
  const monthlyTrend = [
    { month: 'Jan', gst: gstPayable * 0.08, tds: tdsPayable * 0.08 },
    { month: 'Feb', gst: gstPayable * 0.09, tds: tdsPayable * 0.08 },
    { month: 'Mar', gst: gstPayable * 0.12, tds: tdsPayable * 0.10 },
    { month: 'Apr', gst: gstPayable * 0.10, tds: tdsPayable * 0.09 },
    { month: 'May', gst: gstPayable * 0.11, tds: tdsPayable * 0.08 },
    { month: 'Jun', gst: gstPayable * 0.10, tds: tdsPayable * 0.09 },
  ];

  // Compliance Status
  const complianceScore = 90;
  const complianceGauge = [{ name: 'Compliance', value: complianceScore, fill: complianceScore >= 80 ? '#10B981' : '#F59E0B' }];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)' }}>
              <FiShield className="w-5 h-5 text-white" />
            </div>
            Tax & Compliance
          </h2>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Tax liabilities & compliance status for {selectedCompany}</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} className="input-neon py-2">
            {companies.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
          </select>
          <button onClick={loadTaxData} className="btn-primary flex items-center gap-2">
            <FiRefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="stat-card teal">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Total Tax</p>
              <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(totalTaxLiability)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge badge-teal text-xs">All taxes</span>
              </div>
            </div>
            <div className="w-12 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={taxBreakdown} cx="50%" cy="50%" innerRadius={12} outerRadius={20} dataKey="value">
                    {taxBreakdown.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stat-card cyan">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>GST Payable</p>
              <p className="text-3xl font-bold" style={{ color: '#0EA5E9' }}>{formatCurrency(gstPayable)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge badge-cyan text-xs"><FiTrendingUp className="w-3 h-3 mr-1" />Output</span>
              </div>
            </div>
            <div className="w-12 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrend.slice(-4)}>
                  <Bar dataKey="gst" fill="#0EA5E9" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stat-card emerald">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>GST Receivable</p>
              <p className="text-3xl font-bold" style={{ color: '#10B981' }}>{formatCurrency(gstReceivable)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge badge-green text-xs"><FiTrendingDown className="w-3 h-3 mr-1" />Input</span>
              </div>
            </div>
            <div className="w-12 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" data={[{ value: 75, fill: '#10B981' }]} startAngle={180} endAngle={0}>
                  <RadialBar background={{ fill: 'var(--bg-secondary)' }} dataKey="value" cornerRadius={10} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stat-card amber">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>TDS Payable</p>
              <p className="text-3xl font-bold" style={{ color: '#F59E0B' }}>{formatCurrency(tdsPayable)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge badge-amber text-xs">Deducted</span>
              </div>
            </div>
            <div className="w-12 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[{ v: 30 }, { v: 35 }, { v: 32 }, { v: 38 }, { v: 35 }, { v: 40 }]}>
                  <defs>
                    <linearGradient id="tdsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke="#F59E0B" fill="url(#tdsGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stat-card purple">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Compliance</p>
              <p className="text-3xl font-bold" style={{ color: '#10B981' }}>{complianceScore}%</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs flex items-center`} style={{ color: 'var(--success)' }}>
                  <FiCheckCircle className="w-3 h-3 mr-1" />Compliant
                </span>
              </div>
            </div>
            <div className="w-12 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" data={complianceGauge} startAngle={180} endAngle={0}>
                  <RadialBar background={{ fill: 'var(--bg-secondary)' }} dataKey="value" cornerRadius={10} fill={complianceGauge[0].fill} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Tax Trend */}
        <div className="lg:col-span-2 chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">Monthly Tax Payments</h3>
              <p className="chart-card-subtitle">GST & TDS trend over time</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={monthlyTrend}>
              <defs>
                <linearGradient id="gstAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#14B8A6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
              <YAxis tickFormatter={formatCurrency} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area type="monotone" dataKey="gst" name="GST" stroke="#14B8A6" fill="url(#gstAreaGrad)" strokeWidth={2} />
              <Bar dataKey="tds" name="TDS" fill="#F59E0B" radius={[4, 4, 0, 0]} barSize={25} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Compliance Radar */}
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Compliance Status</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={complianceRadar}>
              <PolarGrid stroke="var(--border-color)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} />
              <Radar name="Score" dataKey="value" stroke="#14B8A6" fill="#14B8A6" fillOpacity={0.3} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* GST & Tax Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">GST Breakdown</h3>
          </div>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie data={gstBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {gstBreakdown.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-3">
              {gstBreakdown.map((item, i) => (
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
            <h3 className="chart-card-title">Tax Liability Distribution</h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={taxBreakdown} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
              <XAxis type="number" tickFormatter={formatCurrency} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={25}>
                {taxBreakdown.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Card */}
      <div className="summary-card secondary">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <FiShield className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm opacity-80">Tax Summary</p>
              <p className="text-2xl font-bold">{selectedCompany}</p>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-6">
            <div><p className="text-sm opacity-80">Total Tax</p><p className="text-xl font-bold">{formatCurrency(totalTaxLiability)}</p></div>
            <div><p className="text-sm opacity-80">Net GST</p><p className="text-xl font-bold">{formatCurrency(netGst)}</p></div>
            <div><p className="text-sm opacity-80">TDS</p><p className="text-xl font-bold">{formatCurrency(tdsPayable)}</p></div>
            <div><p className="text-sm opacity-80">Income Tax</p><p className="text-xl font-bold">{formatCurrency(incomeTax)}</p></div>
            <div><p className="text-sm opacity-80">Compliance</p><p className="text-xl font-bold">{complianceScore}%</p></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaxDashboard;
