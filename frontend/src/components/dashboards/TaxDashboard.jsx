import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { FiFileText, FiAlertCircle, FiRefreshCw, FiCheckCircle, FiClock } from 'react-icons/fi';
import RupeeIcon from '../common/RupeeIcon';
import { tallyApi } from '../../api/tallyApi';
import apiClient from '../../api/client';
import toast from 'react-hot-toast';
import { validateChartData, validateNumeric, validateArrayData } from '../../utils/chartDataValidator';

const COLORS = ['#14b8a6', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

const TaxDashboard = ({ dataSource = 'live' }) => {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [taxData, setTaxData] = useState(null);

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
        setTaxData(null);
      }
      setLoading(false);
    } catch (error) {
      console.error(`Failed to load companies from ${dataSource}:`, error);
      setCompanies([]);
      setSelectedCompany('');
      setTaxData(null);
      if (dataSource === 'live') {
        toast.error(`Failed to load companies from ${dataSource}`);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCompany && companies.length > 0) {
      loadTaxData();
    } else if (!selectedCompany) {
      setTaxData(null);
    }
  }, [selectedCompany, dataSource, companies.length]);

  const loadTaxData = async () => {
    if (!selectedCompany) {
      setTaxData(null);
      return;
    }
    
    setLoading(true);
    try {
      const currentSource = dataSource || 'live';
      const response = await apiClient.get(`/dashboards/tax/${encodeURIComponent(selectedCompany)}?source=${currentSource}`);
      setTaxData(response.data.data);
    } catch (error) {
      console.error('Error loading Tax data:', error);
      if (error.response?.status === 401 && dataSource === 'live') {
        toast.error('Authentication required for live data. Please login or use backup data.');
      } else {
        toast.error('Failed to load Tax & Compliance data');
      }
      setTaxData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    if (!value && value !== 0) return '₹0';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '₹0';
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(2)}L`;
    if (num >= 1000) return `₹${(num / 1000).toFixed(2)}K`;
    return `₹${num.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading Tax & Compliance...</p>
        </div>
      </div>
    );
  }

  if (!taxData) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <FiAlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Data Available</h3>
        <p className="text-gray-600">Please connect to Tally or select a company with data</p>
      </div>
    );
  }

  const taxSummary = taxData.tax_summary || {};
  const gstBreakdownRaw = taxData.gst_breakdown || [];
  const complianceStatus = taxData.compliance_status || {};
  const upcomingDeadlines = taxData.upcoming_deadlines || [];

  // GST breakdown data - handle both array and object formats
  const gstData = Array.isArray(gstBreakdownRaw) && gstBreakdownRaw.length > 0
    ? gstBreakdownRaw.map(g => ({ name: g.name, value: g.value || g.amount || 0 }))
    : [
        { name: 'CGST', value: taxData.cgst || 0 },
        { name: 'SGST', value: taxData.sgst || 0 },
        { name: 'IGST', value: taxData.igst || 0 }
      ];

  // Tax liability breakdown
  const taxBreakdown = [
    { name: 'GST Payable', value: taxSummary.gst_payable || 0 },
    { name: 'GST Receivable', value: taxSummary.gst_receivable || 0 },
    { name: 'TDS Payable', value: taxSummary.tds_payable || 0 },
    { name: 'Income Tax', value: taxSummary.income_tax || 0 }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tax & Compliance</h2>
          <p className="text-gray-600 mt-1">Tax Liabilities, GST Summary & Compliance Status</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            {companies.map((company, idx) => (
              <option key={idx} value={company.name}>{company.name}</option>
            ))}
          </select>
          <button
            onClick={loadTaxData}
            className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 flex items-center gap-2"
          >
            <FiRefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Tax Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Total Tax Liability</p>
            <FiFileText className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(taxSummary.total_tax_liability)}</p>
          <p className="text-sm opacity-75">All tax obligations</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">GST Payable</p>
            <RupeeIcon className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(taxSummary.gst_payable)}</p>
          <p className="text-sm opacity-75">Outstanding GST</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">GST Receivable</p>
            <RupeeIcon className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(taxSummary.gst_receivable)}</p>
          <p className="text-sm opacity-75">GST to be received</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Net GST</p>
            <RupeeIcon className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(taxSummary.net_gst)}</p>
          <p className="text-sm opacity-75">Payable - Receivable</p>
        </div>
      </div>

      {/* GST Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">GST Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={gstData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {gstData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(val) => formatCurrency(val)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tax Liability Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={taxBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis tickFormatter={(val) => formatCurrency(val)} />
              <Tooltip formatter={(val) => formatCurrency(val)} />
              <Bar dataKey="value" fill="#14b8a6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Compliance Status */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Compliance Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`p-4 rounded-lg ${complianceStatus.gst_filing_status === 'Compliant' ? 'bg-green-50 border-2 border-green-500' : 'bg-yellow-50 border-2 border-yellow-500'}`}>
            <div className="flex items-center gap-2 mb-2">
              {complianceStatus.gst_filing_status === 'Compliant' ? (
                <FiCheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <FiClock className="w-5 h-5 text-yellow-600" />
              )}
              <p className="text-sm font-semibold text-gray-700">GST Filing</p>
            </div>
            <p className={`text-lg font-bold ${complianceStatus.gst_filing_status === 'Compliant' ? 'text-green-700' : 'text-yellow-700'}`}>
              {complianceStatus.gst_filing_status || 'Unknown'}
            </p>
          </div>

          <div className={`p-4 rounded-lg ${complianceStatus.tds_filing_status === 'Compliant' ? 'bg-green-50 border-2 border-green-500' : 'bg-yellow-50 border-2 border-yellow-500'}`}>
            <div className="flex items-center gap-2 mb-2">
              {complianceStatus.tds_filing_status === 'Compliant' ? (
                <FiCheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <FiClock className="w-5 h-5 text-yellow-600" />
              )}
              <p className="text-sm font-semibold text-gray-700">TDS Filing</p>
            </div>
            <p className={`text-lg font-bold ${complianceStatus.tds_filing_status === 'Compliant' ? 'text-green-700' : 'text-yellow-700'}`}>
              {complianceStatus.tds_filing_status || 'Unknown'}
            </p>
          </div>

          <div className={`p-4 rounded-lg ${complianceStatus.income_tax_filing === 'Filed' ? 'bg-green-50 border-2 border-green-500' : 'bg-red-50 border-2 border-red-500'}`}>
            <div className="flex items-center gap-2 mb-2">
              {complianceStatus.income_tax_filing === 'Filed' ? (
                <FiCheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <FiAlertCircle className="w-5 h-5 text-red-600" />
              )}
              <p className="text-sm font-semibold text-gray-700">Income Tax</p>
            </div>
            <p className={`text-lg font-bold ${complianceStatus.income_tax_filing === 'Filed' ? 'text-green-700' : 'text-red-700'}`}>
              {complianceStatus.income_tax_filing || 'Unknown'}
            </p>
          </div>

          <div className="p-4 rounded-lg bg-blue-50 border-2 border-blue-500">
            <div className="flex items-center gap-2 mb-2">
              <FiFileText className="w-5 h-5 text-blue-600" />
              <p className="text-sm font-semibold text-gray-700">Last Filing</p>
            </div>
            <p className="text-lg font-bold text-blue-700">
              {complianceStatus.last_filing_date || 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Additional Tax Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-orange-500">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">TDS Payable</h4>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(taxSummary.tds_payable)}</p>
          <p className="text-sm text-gray-600 mt-1">Tax deducted at source</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Income Tax</h4>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(taxSummary.income_tax)}</p>
          <p className="text-sm text-gray-600 mt-1">Corporate income tax</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-teal-500">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Upcoming Deadlines</h4>
          <p className="text-3xl font-bold text-gray-900">{upcomingDeadlines.length}</p>
          <p className="text-sm text-gray-600 mt-1">Filing deadlines pending</p>
        </div>
      </div>
    </div>
  );
};

export default TaxDashboard;
