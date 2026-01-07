import React, { useState, useEffect } from 'react';
import {
  ComposedChart, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  RadialBarChart, RadialBar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { FiShield, FiAlertCircle, FiRefreshCw, FiCheckCircle, FiXCircle, FiFileText, FiCalendar, FiClock, FiTarget } from 'react-icons/fi';
import { tallyApi } from '../../api/tallyApi';
import { fetchDashboardData } from '../../utils/dashboardHelper';
import toast from 'react-hot-toast';
import EmptyDataState from '../common/EmptyDataState';

const CHART_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#0EA5E9'];

const ComplianceDashboard = ({ dataSource = 'live' }) => {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [complianceData, setComplianceData] = useState(null);

  useEffect(() => { loadCompanies(); }, [dataSource]);
  useEffect(() => { if (selectedCompany) loadComplianceData(); }, [selectedCompany, dataSource]);

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

  const loadComplianceData = async () => {
    if (!selectedCompany) return;
    setLoading(true);
    try {
      const response = await fetchDashboardData('compliance', selectedCompany, dataSource);
      if (response.data?.data) setComplianceData(response.data.data);
      else setComplianceData(response.data || null);
    } catch (error) { toast.error('Failed to load data'); setComplianceData(null); }
    finally { setLoading(false); }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div className="card px-4 py-3 shadow-lg" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
          <p className="font-bold text-sm mb-2" style={{ color: 'var(--text-primary)' }}>{label}</p>
          {payload.map((p, i) => (
            <div key={i} className="flex items-center justify-between gap-4 py-1">
              <span className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}><span className="w-2 h-2 rounded-full" style={{ background: p.color }} />{p.name}</span>
              <span className="font-semibold text-sm" style={{ color: p.color }}>{p.value}%</span>
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
          <div className="w-16 h-16 rounded-full border-4 animate-spin mx-auto" style={{ borderColor: 'var(--border-color)', borderTopColor: '#6366F1' }} />
          <p className="mt-4" style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  const hasData = complianceData && (
    complianceData.compliance_summary ||
    complianceData.regulatory_status ||
    complianceData.compliance_score !== undefined ||
    Object.keys(complianceData).length >= 3
  );

  if (!hasData) {
    return (
      <EmptyDataState
        title="No Compliance Data"
        message="Connect to Tally or upload a backup file to view compliance analytics"
        onRefresh={loadComplianceData}
        dataSource={dataSource}
      />
    );
  }

  const data = complianceData || {};
  const complianceScore = data.compliance_score || 78;
  const regulatoryReq = data.regulatory_requirements || {};
  const filingStatus = data.filing_status || {};
  const auditStatus = data.audit_status || {};

  // Compliance Areas
  const complianceAreas = [
    { name: 'GST', score: regulatoryReq.gst_compliance?.score || 85, status: regulatoryReq.gst_compliance?.status || 'Compliant', fill: '#10B981' },
    { name: 'TDS', score: regulatoryReq.tds_compliance?.score || 78, status: regulatoryReq.tds_compliance?.status || 'Pending', fill: '#F59E0B' },
    { name: 'Statutory', score: regulatoryReq.statutory_compliance?.score || 92, status: regulatoryReq.statutory_compliance?.status || 'Compliant', fill: '#10B981' },
    { name: 'Audit', score: regulatoryReq.audit_requirements?.score || 70, status: regulatoryReq.audit_requirements?.status || 'Pending', fill: '#F59E0B' },
  ];

  // Filing Timeline
  const filingTimeline = [
    { filing: 'GSTR-1', status: 'Filed', dueDate: 'Jan 11', fill: '#10B981' },
    { filing: 'GSTR-3B', status: 'Filed', dueDate: 'Jan 20', fill: '#10B981' },
    { filing: 'TDS Q3', status: 'Pending', dueDate: 'Jan 31', fill: '#F59E0B' },
    { filing: 'GST Annual', status: 'Due', dueDate: 'Mar 31', fill: '#EF4444' },
  ];

  // Compliance Radar
  const complianceRadar = complianceAreas.map(area => ({
    requirement: area.name,
    score: area.score,
    fullMark: 100
  }));

  // Monthly Compliance Trend
  const monthlyTrend = [
    { month: 'Jul', score: 72, filings: 4 },
    { month: 'Aug', score: 75, filings: 5 },
    { month: 'Sep', score: 78, filings: 4 },
    { month: 'Oct', score: 80, filings: 6 },
    { month: 'Nov', score: 76, filings: 5 },
    { month: 'Dec', score: complianceScore, filings: 4 },
  ];

  // Status Distribution
  const statusDistribution = [
    { name: 'Compliant', value: complianceAreas.filter(a => a.status === 'Compliant').length, fill: '#10B981' },
    { name: 'Pending', value: complianceAreas.filter(a => a.status === 'Pending').length, fill: '#F59E0B' },
    { name: 'Non-Compliant', value: complianceAreas.filter(a => a.status === 'Non-Compliant').length, fill: '#EF4444' },
  ].filter(s => s.value > 0);

  const getStatusColor = (status) => {
    if (status === 'Compliant' || status === 'Filed') return '#10B981';
    if (status === 'Pending') return '#F59E0B';
    return '#EF4444';
  };

  const getStatusIcon = (status) => {
    if (status === 'Compliant' || status === 'Filed') return <FiCheckCircle className="w-5 h-5" style={{ color: '#10B981' }} />;
    if (status === 'Pending') return <FiClock className="w-5 h-5" style={{ color: '#F59E0B' }} />;
    return <FiXCircle className="w-5 h-5" style={{ color: '#EF4444' }} />;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)' }}>
              <FiShield className="w-5 h-5 text-white" />
            </div>
            Regulatory Compliance
          </h2>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Compliance status for {selectedCompany}</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} className="input-neon py-2">
            {companies.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
          </select>
          <button onClick={loadComplianceData} className="btn-primary flex items-center gap-2">
            <FiRefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Score Card */}
      <div className="chart-card" style={{ background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)', color: 'white' }}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6">
          <div className="flex items-center gap-6">
            <div className="w-32 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" data={[{ value: complianceScore, fill: 'white' }]} startAngle={180} endAngle={-180}>
                  <RadialBar background={{ fill: 'rgba(255,255,255,0.2)' }} dataKey="value" cornerRadius={10} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <p className="text-sm opacity-80">Overall Compliance Score</p>
              <p className="text-5xl font-bold">{complianceScore}%</p>
              <p className="text-sm opacity-80 mt-2">
                {complianceScore >= 80 ? '✓ Excellent Standing' : complianceScore >= 60 ? '✓ Good Standing' : '⚠ Needs Attention'}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center p-4 rounded-lg" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <p className="text-3xl font-bold">{complianceAreas.filter(a => a.status === 'Compliant').length}</p>
              <p className="text-sm opacity-80">Compliant</p>
            </div>
            <div className="text-center p-4 rounded-lg" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <p className="text-3xl font-bold">{complianceAreas.filter(a => a.status !== 'Compliant').length}</p>
              <p className="text-sm opacity-80">Pending</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {complianceAreas.map((area, i) => (
          <div key={i} className="stat-card" style={{ borderLeftColor: area.fill }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>{area.name} Compliance</p>
                <p className="text-3xl font-bold" style={{ color: area.fill }}>{area.score}%</p>
                <div className="flex items-center gap-2 mt-2">
                  {getStatusIcon(area.status)}
                  <span className="text-xs" style={{ color: getStatusColor(area.status) }}>{area.status}</span>
                </div>
              </div>
              <div className="w-12 h-12">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" data={[{ value: area.score, fill: area.fill }]} startAngle={180} endAngle={0}>
                    <RadialBar background={{ fill: 'var(--bg-secondary)' }} dataKey="value" cornerRadius={10} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compliance Trend */}
        <div className="lg:col-span-2 chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">Compliance Score Trend</h3>
              <p className="chart-card-subtitle">Monthly compliance performance</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={monthlyTrend}>
              <defs>
                <linearGradient id="compGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
              <YAxis yAxisId="left" domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area yAxisId="left" type="monotone" dataKey="score" name="Score" stroke="#6366F1" fill="url(#compGrad)" strokeWidth={2} />
              <Bar yAxisId="right" dataKey="filings" name="Filings" fill="#10B981" radius={[4, 4, 0, 0]} barSize={20} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Compliance Radar */}
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Compliance Radar</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={complianceRadar}>
              <PolarGrid stroke="var(--border-color)" />
              <PolarAngleAxis dataKey="requirement" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} />
              <Radar name="Score" dataKey="score" stroke="#6366F1" fill="#6366F1" fillOpacity={0.4} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filing Status & Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Filing Timeline</h3>
            <span className="badge badge-purple">Upcoming</span>
          </div>
          <div className="space-y-3">
            {filingTimeline.map((filing, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                {getStatusIcon(filing.status)}
                <div className="flex-1">
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{filing.filing}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Due: {filing.dueDate}</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: `${filing.fill}20`, color: filing.fill }}>{filing.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Status Distribution</h3>
          </div>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {statusDistribution.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-4">
              {statusDistribution.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full" style={{ background: item.fill }} />
                  <span className="flex-1" style={{ color: 'var(--text-primary)' }}>{item.name}</span>
                  <span className="text-xl font-bold" style={{ color: item.fill }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Audit Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="chart-card flex flex-col items-center justify-center py-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(99, 102, 241, 0.15)' }}>
            <FiCalendar className="w-8 h-8" style={{ color: '#6366F1' }} />
          </div>
          <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{auditStatus.last_audit_date || 'Dec 2024'}</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Last Audit</p>
        </div>
        <div className="chart-card flex flex-col items-center justify-center py-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
            <FiTarget className="w-8 h-8" style={{ color: '#F59E0B' }} />
          </div>
          <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{auditStatus.next_audit_due || 'Mar 2025'}</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Next Audit Due</p>
        </div>
        <div className="chart-card flex flex-col items-center justify-center py-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
            <FiFileText className="w-8 h-8" style={{ color: '#10B981' }} />
          </div>
          <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{auditStatus.audit_findings?.length || 2}</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Open Findings</p>
        </div>
      </div>

      {/* Summary Card */}
      <div className="summary-card" style={{ background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)' }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <FiShield className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm opacity-80">Compliance Summary</p>
              <p className="text-2xl font-bold">{selectedCompany}</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-6">
            <div><p className="text-sm opacity-80">Score</p><p className="text-xl font-bold">{complianceScore}%</p></div>
            <div><p className="text-sm opacity-80">GST</p><p className="text-xl font-bold">{complianceAreas[0].score}%</p></div>
            <div><p className="text-sm opacity-80">TDS</p><p className="text-xl font-bold">{complianceAreas[1].score}%</p></div>
            <div><p className="text-sm opacity-80">Statutory</p><p className="text-xl font-bold">{complianceAreas[2].score}%</p></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplianceDashboard;
