import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { FiUsers, FiTrendingUp, FiAlertCircle, FiRefreshCw, FiDollarSign, FiAward } from 'react-icons/fi';
import RupeeIcon from '../common/RupeeIcon';
import { tallyApi } from '../../api/tallyApi';
import { fetchDashboardData } from '../../utils/dashboardHelper';
import toast from 'react-hot-toast';
import { validateChartData, validateNumeric, validateArrayData, prepareRevenueExpenseData } from '../../utils/chartDataValidator';

const COLORS = ['#4ade80', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

const CustomerAnalyticsDashboard = ({ dataSource = 'live' }) => {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [customerData, setCustomerData] = useState(null);

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
        setCustomerData(null);
      }
      setLoading(false);
    } catch (error) {
      console.error(`Failed to load companies from ${dataSource}:`, error);
      setCompanies([]);
      setSelectedCompany('');
      setCustomerData(null);
      if (dataSource === 'live') {
        toast.error(`Failed to load companies from ${dataSource}`);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCompany && companies.length > 0) {
      loadCustomerData();
    } else if (!selectedCompany) {
      setCustomerData(null);
    }
  }, [selectedCompany, dataSource, companies.length]);

  const loadCustomerData = async () => {
    if (!selectedCompany) {
      setCustomerData(null);
      return;
    }
    
    setLoading(true);
    try {
      const currentSource = dataSource || 'live';
      const response = await fetchDashboardData('customer-analytics', selectedCompany, currentSource);
      setCustomerData(response.data.data);
    } catch (error) {
      console.error('Error loading Customer Analytics data:', error);
      if (error.response?.status === 401 && dataSource === 'live') {
        toast.error('Authentication required for live data. Please login or use backup data.');
      } else {
        toast.error('Failed to load Customer Analytics data');
      }
      setCustomerData(null);
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
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading Customer Analytics...</p>
        </div>
      </div>
    );
  }

  if (!customerData) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <FiAlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Data Available</h3>
        <p className="text-gray-600">Please connect to Tally or select a company with data</p>
      </div>
    );
  }

  const customerSummary = customerData.customer_summary || {};
  const topCustomers = customerData.top_customers || [];
  const customerSegmentationRaw = customerData.customer_segmentation || [];
  const customerBehavior = customerData.customer_behavior || {};

  // Customer segmentation data - handle both array and object formats
  const segmentationData = Array.isArray(customerSegmentationRaw) && customerSegmentationRaw.length > 0
    ? customerSegmentationRaw.map(s => ({ name: s.segment || s.name, value: s.value || s.count || 0 }))
    : [
        { name: 'Premium', value: customerSegmentationRaw.premium || 0 },
        { name: 'Regular', value: customerSegmentationRaw.regular || 0 },
        { name: 'New', value: customerSegmentationRaw.new || 0 }
      ];

  // Top customers chart data - handle both object and array formats
  const topCustomersChart = topCustomers.slice(0, 10).map(c => {
    const customerName = typeof c === 'object' ? (c.name || c.get?.('name') || 'Unknown') : String(c || 'Unknown');
    const customerValue = typeof c === 'object' ? (c.value || c.amount || c.balance || c.closing_balance || c.current_balance || 0) : 0;
    return {
      name: customerName,
      value: Math.abs(parseFloat(customerValue) || 0)
    };
  }).filter(c => c.value > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Customer Analytics</h2>
          <p className="text-gray-600 mt-1">Customer Behavior & Value Analysis</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            {companies.map((company, idx) => (
              <option key={idx} value={company.name}>{company.name}</option>
            ))}
          </select>
          <button
            onClick={loadCustomerData}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
          >
            <FiRefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Customer Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Total Customers</p>
            <FiUsers className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{customerSummary.total_customers || 0}</p>
          <p className="text-sm opacity-75">All customers</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Active Customers</p>
            <FiAward className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{customerSummary.active_customers || 0}</p>
          <p className="text-sm opacity-75">Currently active</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Total Revenue</p>
            <RupeeIcon className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(customerSummary.total_revenue)}</p>
          <p className="text-sm opacity-75">From all customers</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Avg Revenue/Customer</p>
            <FiDollarSign className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(customerSummary.avg_revenue_per_customer || customerSummary.avg_revenue || 0)}</p>
          <p className="text-sm opacity-75">Per customer average</p>
        </div>
      </div>

      {/* Top Customers & Segmentation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Customers</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topCustomersChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={(val) => formatCurrency(val)} />
              <Tooltip formatter={(val) => formatCurrency(val)} />
              <Bar dataKey="value" fill="#4ade80" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Segmentation</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={segmentationData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {segmentationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Customer List */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Customers List</h3>
        {topCustomers && topCustomers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 text-sm font-semibold text-gray-700">Rank</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-700">Customer Name</th>
                  <th className="text-right p-3 text-sm font-semibold text-gray-700">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.slice(0, 10).map((customer, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-sm text-gray-600">#{idx + 1}</td>
                    <td className="p-3 text-sm font-medium text-gray-900">{customer.name || 'Unknown'}</td>
                    <td className="p-3 text-sm font-bold text-green-600 text-right">
                      {formatCurrency(parseFloat(customer.revenue || customer.value || customer.amount || customer.sales || customer.balance || customer.closing_balance || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No customer data available from Tally</p>
            <p className="text-sm text-gray-400 mt-2">Please ensure your Tally data contains customer/debtor information</p>
          </div>
        )}
      </div>

      {/* Customer Behavior Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Customer Lifetime Value</h4>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(customerSummary.customer_lifetime_value)}</p>
          <p className="text-sm text-gray-600 mt-1">Estimated CLV</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Repeat Customers</h4>
          <p className="text-3xl font-bold text-gray-900">{customerBehavior.repeat_customers?.toFixed(0) || 0}</p>
          <p className="text-sm text-gray-600 mt-1">Returning customers</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-red-500">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Churn Rate</h4>
          <p className="text-3xl font-bold text-gray-900">{customerBehavior.churn_rate?.toFixed(1) || '0.0'}%</p>
          <p className="text-sm text-gray-600 mt-1">Customer attrition rate</p>
        </div>
      </div>
    </div>
  );
};

export default CustomerAnalyticsDashboard;
