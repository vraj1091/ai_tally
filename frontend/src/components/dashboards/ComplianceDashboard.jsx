import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { FiShield, FiAlertCircle, FiRefreshCw, FiCheckCircle, FiXCircle, FiFileText } from 'react-icons/fi';
import { tallyApi } from '../../api/tallyApi';
import { fetchDashboardData } from '../../utils/dashboardHelper';
import toast from 'react-hot-toast';
import { hasRealData } from '../../utils/dataValidator';
import EmptyDataState from '../common/EmptyDataState';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const ComplianceDashboard = ({ dataSource = 'live' }) => {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [complianceData, setComplianceData] = useState(null);

  useEffect(() => {
    loadCompanies();
  }, [dataSource]);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      let response;
      if (dataSource === 'backup') {
        response = await tallyApi.getBackupCompanies();
      } else if (dataSource === 'bridge') {
        response = await tallyApi.getCompaniesViaBridge();
      } else {
        response = await tallyApi.getCompanies();
      }
      const companyList = response.companies || [];
      setCompanies(companyList);
      if (companyList.length > 0) {
        setSelectedCompany(companyList[0].name);
      } else {
        setSelectedCompany('');
        setComplianceData(null);
      }
      setLoading(false);
    } catch (error) {
      console.error(`Failed to load companies from ${dataSource}:`, error);
      setCompanies([]);
      setSelectedCompany('');
      setComplianceData(null);
      if (dataSource === 'live') {
        toast.error(`Failed to load companies from ${dataSource}`);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCompany && companies.length > 0) {
      loadComplianceData();
    } else if (!selectedCompany) {
      setComplianceData(null);
    }
  }, [selectedCompany, dataSource, companies.length]);

  const loadComplianceData = async () => {
    if (!selectedCompany) {
      setComplianceData(null);
      return;
    }
    
    setLoading(true);
    try {
      const currentSource = dataSource || 'live';
      const response = await fetchDashboardData('compliance', selectedCompany, currentSource);
      setComplianceData(response.data.data);
    } catch (error) {
      console.error('Error loading Compliance data:', error);
      if (error.response?.status === 401 && dataSource === 'live') {
        toast.error('Authentication required for live data. Please login or use backup data.');
      } else {
        toast.error('Failed to load Compliance data');
      }
      setComplianceData(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-4 animate-spin mx-auto" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--primary)' }} />
          <p className="mt-4 font-medium" style={{ color: 'var(--text-secondary)' }}>Loading Regulatory Compliance...</p>
        </div>
      </div>
    );
  }

  // Check if we have real data
  if (!complianceData || !hasRealData(complianceData, ['compliance_score', 'pending_filings', 'overdue_items', 'regulatory_status'])) {
    return (
      <EmptyDataState 
        title="No Compliance Data"
        message="Connect to Tally or upload a backup file to view compliance analytics"
        onRefresh={loadComplianceData}
        dataSource={dataSource}
      />
    );
  }

  const complianceScore = complianceData.compliance_score || 0;
  const regulatoryRequirements = complianceData.regulatory_requirements || {};
  const complianceAlerts = complianceData.compliance_alerts || [];
  const auditStatus = complianceData.audit_status || {};
  const filingStatus = complianceData.filing_status || {};

  const radarData = [
    { requirement: 'GST', score: regulatoryRequirements.gst_compliance?.score || 0 },
    { requirement: 'TDS', score: regulatoryRequirements.tds_compliance?.score || 0 },
    { requirement: 'Statutory', score: regulatoryRequirements.statutory_compliance?.score || 0 },
    { requirement: 'Audit', score: regulatoryRequirements.audit_requirements?.score || 0 }
  ];

  const complianceStatusData = [
    { name: 'GST', status: regulatoryRequirements.gst_compliance?.status || 'Unknown', score: regulatoryRequirements.gst_compliance?.score || 0 },
    { name: 'TDS', status: regulatoryRequirements.tds_compliance?.status || 'Unknown', score: regulatoryRequirements.tds_compliance?.score || 0 },
    { name: 'Statutory', status: regulatoryRequirements.statutory_compliance?.status || 'Unknown', score: regulatoryRequirements.statutory_compliance?.score || 0 },
    { name: 'Audit', status: regulatoryRequirements.audit_requirements?.status || 'Unknown', score: regulatoryRequirements.audit_requirements?.score || 0 }
  ];

  const getStatusColor = (status) => {
    if (status === 'Compliant') return '#10B981';
    if (status === 'Pending') return '#F59E0B';
    return '#EF4444';
  };

  const getStatusBg = (status) => {
    if (status === 'Compliant') return { background: 'rgba(16, 185, 129, 0.1)', border: '2px solid #10B981' };
    if (status === 'Pending') return { background: 'rgba(245, 158, 11, 0.1)', border: '2px solid #F59E0B' };
    return { background: 'rgba(239, 68, 68, 0.1)', border: '2px solid #EF4444' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Regulatory Compliance</h2>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Compliance Status & Regulatory Requirements</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="input-neon"
          >
            {companies.map((company, idx) => (
              <option key={idx} value={company.name}>{company.name}</option>
            ))}
          </select>
          <button
            onClick={loadComplianceData}
            className="btn-primary flex items-center gap-2"
          >
            <FiRefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Compliance Score Card */}
      <div className="card p-8 text-white" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', boxShadow: '0 8px 32px rgba(139, 92, 246, 0.3)' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium opacity-90 mb-2">Overall Compliance Score</p>
            <p className="text-6xl font-bold">{complianceScore}%</p>
            <p className="text-sm opacity-75 mt-2">
              {complianceScore >= 80 ? '✓ Excellent' : complianceScore >= 60 ? '✓ Good' : complianceScore >= 40 ? '⚠ Fair' : '✗ Needs Improvement'}
            </p>
          </div>
          <FiShield className="w-24 h-24 opacity-25" />
        </div>
      </div>

      {/* Regulatory Requirements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Compliance Status</h3>
          <div className="space-y-3">
            {complianceStatusData.map((item, idx) => (
              <div key={idx} className="p-4 rounded-xl" style={getStatusBg(item.status)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {item.status === 'Compliant' ? (
                      <FiCheckCircle className="w-5 h-5" style={{ color: '#10B981' }} />
                    ) : item.status === 'Pending' ? (
                      <FiAlertCircle className="w-5 h-5" style={{ color: '#F59E0B' }} />
                    ) : (
                      <FiXCircle className="w-5 h-5" style={{ color: '#EF4444' }} />
                    )}
                    <div>
                      <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{item.name} Compliance</p>
                      <p className="text-sm" style={{ color: getStatusColor(item.status) }}>{item.status}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{item.score}%</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Score</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Compliance Radar</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--border-color)" />
              <PolarAngleAxis dataKey="requirement" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
              <Radar name="Compliance" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.6} />
              <Tooltip 
                contentStyle={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
                labelStyle={{ color: 'var(--text-primary)' }}
                itemStyle={{ color: 'var(--text-secondary)' }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filing Status */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Filing Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.1) 100%)', border: '2px solid rgba(59, 130, 246, 0.3)' }}>
            <div className="flex items-center gap-2 mb-3">
              <FiFileText className="w-5 h-5" style={{ color: '#3B82F6' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>GST Returns</p>
            </div>
            <p className="text-xl font-bold" style={{ color: filingStatus.gst_returns === 'Filed' ? '#10B981' : '#F59E0B' }}>
              {filingStatus.gst_returns || 'Unknown'}
            </p>
          </div>
          <div className="p-5 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.1) 100%)', border: '2px solid rgba(59, 130, 246, 0.3)' }}>
            <div className="flex items-center gap-2 mb-3">
              <FiFileText className="w-5 h-5" style={{ color: '#3B82F6' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>TDS Returns</p>
            </div>
            <p className="text-xl font-bold" style={{ color: filingStatus.tds_returns === 'Filed' ? '#10B981' : '#F59E0B' }}>
              {filingStatus.tds_returns || 'Unknown'}
            </p>
          </div>
          <div className="p-5 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.1) 100%)', border: '2px solid rgba(59, 130, 246, 0.3)' }}>
            <div className="flex items-center gap-2 mb-3">
              <FiFileText className="w-5 h-5" style={{ color: '#3B82F6' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Annual Returns</p>
            </div>
            <p className="text-xl font-bold" style={{ color: filingStatus.annual_returns === 'Filed' ? '#10B981' : '#EF4444' }}>
              {filingStatus.annual_returns || 'Unknown'}
            </p>
          </div>
        </div>
      </div>

      {/* Audit Status */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Audit Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(99, 102, 241, 0.1) 100%)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
            <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>Last Audit Date</p>
            <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{auditStatus.last_audit_date || 'N/A'}</p>
          </div>
          <div className="p-5 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(99, 102, 241, 0.1) 100%)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
            <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>Next Audit Due</p>
            <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{auditStatus.next_audit_due || 'N/A'}</p>
          </div>
          <div className="p-5 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(99, 102, 241, 0.1) 100%)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
            <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>Audit Findings</p>
            <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{auditStatus.audit_findings?.length || 0}</p>
          </div>
        </div>
      </div>

      {/* Compliance Alerts */}
      {complianceAlerts.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Compliance Alerts</h3>
          <div className="space-y-3">
            {complianceAlerts.map((alert, idx) => (
              <div key={idx} className="p-4 rounded-xl" style={{ background: 'rgba(245, 158, 11, 0.1)', borderLeft: '4px solid #F59E0B' }}>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{alert}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplianceDashboard;
