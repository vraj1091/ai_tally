import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { FiShoppingCart, FiTrendingUp, FiUsers, FiAlertCircle, FiRefreshCw, FiAward } from 'react-icons/fi';
import RupeeIcon from '../common/RupeeIcon';
import { tallyApi } from '../../api/tallyApi';
import toast from 'react-hot-toast';
import { validateChartData, validateArrayData, prepareRevenueExpenseData } from '../../utils/chartDataValidator';
import { fetchDashboardData } from '../../utils/dashboardHelper';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const SalesDashboard = ({ dataSource = 'live' }) => {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [salesData, setSalesData] = useState(null);

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
        setSalesData(null);
      }
      setLoading(false);
    } catch (error) {
      console.error(`Failed to load companies from ${dataSource}:`, error);
      setCompanies([]);
      setSelectedCompany('');
      setSalesData(null);
      if (dataSource === 'live') {
        toast.error(`Failed to load companies from ${dataSource}`);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCompany && companies.length > 0) {
      loadSalesData();
    } else if (!selectedCompany) {
      setSalesData(null);
    }
  }, [selectedCompany, dataSource, companies.length]);

  const loadSalesData = async () => {
    if (!selectedCompany) {
      setSalesData(null);
      return;
    }
    
    setLoading(true);
    try {
      const currentSource = dataSource || 'live';
      const response = await fetchDashboardData('sales', selectedCompany, currentSource);
      setSalesData(response.data.data);
    } catch (error) {
      console.error('Error loading Sales data:', error);
      if (error.response?.status === 401 && dataSource === 'live') {
        toast.error('Authentication required for live data. Please login or use backup data.');
      } else {
        toast.error('Failed to load Sales dashboard data');
      }
      setSalesData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    const absValue = Math.abs(value || 0);
    if (absValue >= 10000000) return `₹${(absValue / 10000000).toFixed(2)}Cr`;
    if (absValue >= 100000) return `₹${(absValue / 100000).toFixed(2)}L`;
    if (absValue >= 1000) return `₹${(absValue / 1000).toFixed(2)}K`;
    return `₹${absValue.toFixed(0)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading Sales Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!salesData) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <FiAlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Sales Data Available</h3>
        <p className="text-gray-600">Please connect to Tally or select a company with data</p>
      </div>
    );
  }

  const salesOverview = salesData.sales_overview || {};
  const salesPipeline = salesData.sales_pipeline || {};
  const performance = salesData.performance_metrics || {};
  const topCustomers = salesData.top_customers || [];
  const topProducts = salesData.top_products || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sales Dashboard</h2>
          <p className="text-gray-600 mt-1">Sales Performance & Customer Analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            {companies.map((company, idx) => (
              <option key={idx} value={company.name}>{company.name}</option>
            ))}
          </select>
          <button
            onClick={loadSalesData}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
          >
            <FiRefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Sales Overview Cards - UNIQUE TO SALES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Total Sales</p>
            <FiShoppingCart className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(salesOverview.total_sales)}</p>
          <div className="flex items-center gap-2 text-sm">
            <FiTrendingUp className="w-4 h-4" />
            <span>Growth: {salesOverview.sales_growth?.toFixed(1)}%</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Sales Orders</p>
            <FiAward className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{salesOverview.sales_count || 0}</p>
          <p className="text-sm opacity-75">Total transactions</p>
        </div>

        <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Avg Sale Value</p>
            <RupeeIcon className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(salesOverview.avg_sale_value)}</p>
          <p className="text-sm opacity-75">Per order</p>
        </div>

        <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Revenue/Customer</p>
            <FiUsers className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(performance.revenue_per_customer)}</p>
          <p className="text-sm opacity-75">Customer value</p>
        </div>
      </div>

      {/* Sales Pipeline - UNIQUE TO SALES */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Pipeline Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Total Orders</p>
            <p className="text-3xl font-bold text-purple-700">{salesPipeline.total_orders || 0}</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Avg Order Value</p>
            <p className="text-3xl font-bold text-blue-700">{formatCurrency(salesPipeline.avg_order_value)}</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Conversion Rate</p>
            <p className="text-3xl font-bold text-green-700">{(salesPipeline.conversion_rate || 0).toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 Customers - UNIQUE TO SALES */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Customers</h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {topCustomers.slice(0, 10).map((customer, idx) => {
              const customerName = customer.name || customer || 'Unknown Customer';
              const customerAmount = customer.amount || customer.value || customer.closing_balance || customer.balance || 0;
              return (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-700 font-semibold text-sm">{idx + 1}</span>
                  </div>
                  <div>
                      <p className="font-medium text-gray-900">{customerName}</p>
                    </div>
                  </div>
                  <p className="font-semibold text-purple-700">{formatCurrency(Math.abs(customerAmount))}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 10 Products - UNIQUE TO SALES */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Products</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={topProducts.slice(0, 10).map(p => ({
              name: (p.name || p || '').substring(0, 20),
              value: Math.abs(p.value || p.amount || p.closing_balance || p.balance || 0)
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={100} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => formatCurrency(val)} />
              <Tooltip formatter={(val) => formatCurrency(val)} />
              <Bar dataKey="value" fill="#8b5cf6" radius={[8, 8, 0, 0]}>
                {topProducts.slice(0, 10).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Customer Performance Table - UNIQUE TO SALES */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Performance Summary</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Rank</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Customer Name</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Total Sales</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">% of Total</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {topCustomers.slice(0, 10).map((customer, idx) => {
                const salesValue = Math.abs(customer.amount || customer.value || customer.closing_balance || customer.balance || 0);
                const percentage = salesOverview.total_sales > 0 ? ((salesValue / salesOverview.total_sales) * 100) : 0;
                return (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-medium text-gray-600">#{idx + 1}</td>
                    <td className="py-3 px-4 text-sm text-gray-900 font-medium">{customer.name || 'Unknown'}</td>
                    <td className="py-3 px-4 text-sm text-gray-900 font-semibold text-right">
                      {formatCurrency(salesValue)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 text-right">{percentage.toFixed(1)}%</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        idx < 3 ? 'bg-green-100 text-green-700' :
                        idx < 7 ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {idx < 3 ? 'Top Tier' : idx < 7 ? 'High Value' : 'Standard'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sales Insights - UNIQUE TO SALES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Top Customer</h4>
          <p className="text-xl font-bold text-gray-900">{topCustomers[0]?.name || 'N/A'}</p>
          <p className="text-sm text-gray-600 mt-1">{formatCurrency(Math.abs(topCustomers[0]?.amount || topCustomers[0]?.closing_balance || 0))}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Top Product</h4>
          <p className="text-xl font-bold text-gray-900">{topProducts[0]?.name || 'N/A'}</p>
          <p className="text-sm text-gray-600 mt-1">{formatCurrency(Math.abs(topProducts[0]?.value || topProducts[0]?.closing_balance || 0))}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Sales Growth</h4>
          <p className="text-xl font-bold text-gray-900">{salesOverview.sales_growth?.toFixed(1)}%</p>
          <p className="text-sm text-gray-600 mt-1">Year over year</p>
        </div>
      </div>
    </div>
  );
};

export default SalesDashboard;
