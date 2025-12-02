import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { FiShield, FiAlertCircle, FiRefreshCw, FiCheckCircle, FiXCircle, FiFileText } from 'react-icons/fi';
import { tallyApi } from '../../api/tallyApi';
import apiClient from '../../api/client';
import toast from 'react-hot-toast';
import { validateChartData, validateNumeric, validateArrayData } from '../../utils/chartDataValidator';

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
      const response = await apiClient.get(`/dashboards/compliance/${encodeURIComponent(selectedCompany)}?source=${currentSource}`);
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
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading Regulatory Compliance...</p>
        </div>
      </div>
    );
  }

  if (!complianceData) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <FiAlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Data Available</h3>
        <p className="text-gray-600">Please connect to Tally or select a company with data</p>
      </div>
    );
  }

  const complianceScore = complianceData.compliance_score || 0;
  const regulatoryRequirements = complianceData.regulatory_requirements || {};
  const complianceAlerts = complianceData.compliance_alerts || [];
  const auditStatus = complianceData.audit_status || {};
  const filingStatus = complianceData.filing_status || {};

  // Compliance radar data
  const radarData = [
    { requirement: 'GST', score: regulatoryRequirements.gst_compliance?.score || 0 },
    { requirement: 'TDS', score: regulatoryRequirements.tds_compliance?.score || 0 },
    { requirement: 'Statutory', score: regulatoryRequirements.statutory_compliance?.score || 0 },
    { requirement: 'Audit', score: regulatoryRequirements.audit_requirements?.score || 0 }
  ];

  // Compliance status data
  const complianceStatusData = [
    { name: 'GST', status: regulatoryRequirements.gst_compliance?.status || 'Unknown', score: regulatoryRequirements.gst_compliance?.score || 0 },
    { name: 'TDS', status: regulatoryRequirements.tds_compliance?.status || 'Unknown', score: regulatoryRequirements.tds_compliance?.score || 0 },
    { name: 'Statutory', status: regulatoryRequirements.statutory_compliance?.status || 'Unknown', score: regulatoryRequirements.statutory_compliance?.score || 0 },
    { name: 'Audit', status: regulatoryRequirements.audit_requirements?.status || 'Unknown', score: regulatoryRequirements.audit_requirements?.score || 0 }
  ];

  const getStatusColor = (status) => {
    if (status === 'Compliant') return 'text-green-600';
    if (status === 'Pending') return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBg = (status) => {
    if (status === 'Compliant') return 'bg-green-50 border-green-500';
    if (status === 'Pending') return 'bg-yellow-50 border-yellow-500';
    return 'bg-red-50 border-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Regulatory Compliance</h2>
          <p className="text-gray-600 mt-1">Compliance Status & Regulatory Requirements</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            {companies.map((company, idx) => (
              <option key={idx} value={company.name}>{company.name}</option>
            ))}
          </select>
          <button
            onClick={loadComplianceData}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 flex items-center gap-2"
          >
            <FiRefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Compliance Score Card */}
      <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium opacity-90 mb-2">Overall Compliance Score</p>
            <p className="text-6xl font-bold">{complianceScore}%</p>
            <p className="text-sm opacity-75 mt-2">
              {complianceScore >= 80 ? 'Excellent' : complianceScore >= 60 ? 'Good' : complianceScore >= 40 ? 'Fair' : 'Needs Improvement'}
            </p>
          </div>
          <FiShield className="w-24 h-24 opacity-25" />
        </div>
      </div>

      {/* Regulatory Requirements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Compliance Status</h3>
          <div className="space-y-3">
            {complianceStatusData.map((item, idx) => (
              <div key={idx} className={`p-4 rounded-lg border-2 ${getStatusBg(item.status)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {item.status === 'Compliant' ? (
                      <FiCheckCircle className="w-5 h-5 text-green-600" />
                    ) : item.status === 'Pending' ? (
                      <FiAlertCircle className="w-5 h-5 text-yellow-600" />
                    ) : (
                      <FiXCircle className="w-5 h-5 text-red-600" />
                    )}
                    <div>
                      <p className="font-semibold text-gray-900">{item.name} Compliance</p>
                      <p className={`text-sm ${getStatusColor(item.status)}`}>{item.status}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{item.score}%</p>
                    <p className="text-xs text-gray-500">Score</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Compliance Radar</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="requirement" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar name="Compliance" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.6} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filing Status */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filing Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-500">
            <div className="flex items-center gap-2 mb-2">
              <FiFileText className="w-5 h-5 text-blue-600" />
              <p className="text-sm font-semibold text-gray-700">GST Returns</p>
            </div>
            <p className={`text-lg font-bold ${filingStatus.gst_returns === 'Filed' ? 'text-green-700' : 'text-yellow-700'}`}>
              {filingStatus.gst_returns || 'Unknown'}
            </p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-500">
            <div className="flex items-center gap-2 mb-2">
              <FiFileText className="w-5 h-5 text-blue-600" />
              <p className="text-sm font-semibold text-gray-700">TDS Returns</p>
            </div>
            <p className={`text-lg font-bold ${filingStatus.tds_returns === 'Filed' ? 'text-green-700' : 'text-yellow-700'}`}>
              {filingStatus.tds_returns || 'Unknown'}
            </p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-500">
            <div className="flex items-center gap-2 mb-2">
              <FiFileText className="w-5 h-5 text-blue-600" />
              <p className="text-sm font-semibold text-gray-700">Annual Returns</p>
          </div>
            <p className={`text-lg font-bold ${filingStatus.annual_returns === 'Filed' ? 'text-green-700' : 'text-red-700'}`}>
              {filingStatus.annual_returns || 'Unknown'}
            </p>
          </div>
        </div>
      </div>

      {/* Audit Status */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Audit Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Last Audit Date</p>
            <p className="text-lg font-bold text-gray-900">{auditStatus.last_audit_date || 'N/A'}</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Next Audit Due</p>
            <p className="text-lg font-bold text-gray-900">{auditStatus.next_audit_due || 'N/A'}</p>
        </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Audit Findings</p>
            <p className="text-lg font-bold text-gray-900">{auditStatus.audit_findings?.length || 0}</p>
        </div>
        </div>
      </div>

      {/* Compliance Alerts */}
      {complianceAlerts.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Compliance Alerts</h3>
          <div className="space-y-2">
            {complianceAlerts.map((alert, idx) => (
              <div key={idx} className="p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                <p className="text-sm text-gray-700">{alert}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplianceDashboard;
