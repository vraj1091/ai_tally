import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { FiPackage, FiTrendingUp, FiAlertCircle, FiRefreshCw, FiDollarSign, FiActivity } from 'react-icons/fi';
import RupeeIcon from '../common/RupeeIcon';
import { tallyApi } from '../../api/tallyApi';
import apiClient from '../../api/client';
import toast from 'react-hot-toast';
import { validateChartData, validateNumeric, validateArrayData } from '../../utils/chartDataValidator';

const COLORS = ['#c026d3', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const ProductPerformanceDashboard = ({ dataSource = 'live' }) => {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [productData, setProductData] = useState(null);

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
        setProductData(null);
      }
      setLoading(false);
    } catch (error) {
      console.error(`Failed to load companies from ${dataSource}:`, error);
      setCompanies([]);
      setSelectedCompany('');
      setProductData(null);
      if (dataSource === 'live') {
        toast.error(`Failed to load companies from ${dataSource}`);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCompany && companies.length > 0) {
      loadProductData();
    } else if (!selectedCompany) {
      setProductData(null);
    }
  }, [selectedCompany, dataSource, companies.length]);

  const loadProductData = async () => {
    if (!selectedCompany) {
      setProductData(null);
      return;
    }
    
    setLoading(true);
    try {
      const currentSource = dataSource || 'live';
      const response = await apiClient.get(`/dashboards/product-performance/${encodeURIComponent(selectedCompany)}?source=${currentSource}`);
      setProductData(response.data.data);
    } catch (error) {
      console.error('Error loading Product Performance data:', error);
      if (error.response?.status === 401 && dataSource === 'live') {
        toast.error('Authentication required for live data. Please login or use backup data.');
      } else {
        toast.error('Failed to load Product Performance data');
      }
      setProductData(null);
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
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading Product Performance...</p>
        </div>
      </div>
    );
  }

  if (!productData) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <FiAlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Data Available</h3>
        <p className="text-gray-600">Please connect to Tally or select a company with data</p>
      </div>
    );
  }

  const productSummary = productData.product_summary || {
    total_products: productData.total_products || 0,
    active_products: productData.active_products || 0,
    total_inventory_value: productData.total_inventory_value || productData.inventory_value || 0,
    avg_product_value: productData.avg_product_value || 0
  };
  const topProducts = productData.top_products || [];
  const productPerformanceRaw = productData.product_performance || [];
  const inventoryMetrics = productData.inventory_metrics || {};
  
  // Create product performance object from array if needed
  const productPerformance = Array.isArray(productPerformanceRaw) 
    ? { items: productPerformanceRaw }
    : productPerformanceRaw;

  // Top products chart data
  const topProductsChart = topProducts.slice(0, 15).map(p => ({
    name: p.name || 'Unknown',
    value: parseFloat(p.value || 0)
  }));

  // Product performance data
  const performanceData = [
    { category: 'Fast Moving', value: productPerformance.fast_moving || 0 },
    { category: 'Slow Moving', value: productPerformance.slow_moving || 0 },
    { category: 'Non Moving', value: productPerformance.non_moving || 0 }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Product Performance</h2>
          <p className="text-gray-600 mt-1">Product-wise Sales & Profitability</p>
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
            onClick={loadProductData}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center gap-2"
          >
            <FiRefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Product Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Total Products</p>
            <FiPackage className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{productSummary.total_products || 0}</p>
          <p className="text-sm opacity-75">All products</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Active Products</p>
            <FiActivity className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{productSummary.active_products || 0}</p>
          <p className="text-sm opacity-75">Currently active</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Inventory Value</p>
            <RupeeIcon className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(productSummary.total_inventory_value)}</p>
          <p className="text-sm opacity-75">Total stock value</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Avg Product Value</p>
            <FiDollarSign className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(productSummary.avg_product_value)}</p>
          <p className="text-sm opacity-75">Per product average</p>
        </div>
      </div>

      {/* Top Products Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 15 Products by Value</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={topProductsChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={120} tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={(val) => formatCurrency(val)} />
              <Tooltip formatter={(val) => formatCurrency(val)} />
              <Bar dataKey="value" fill="#c026d3" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

      {/* Product Performance & Inventory Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Performance</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={performanceData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ category, value }) => `${category}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {performanceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory Metrics</h3>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">Turnover Ratio</p>
                <p className="text-2xl font-bold text-blue-700">{inventoryMetrics.turnover_ratio?.toFixed(1) || '0.0'}x</p>
              </div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">Days of Inventory</p>
                <p className="text-2xl font-bold text-green-700">{inventoryMetrics.days_inventory?.toFixed(0) || 0} days</p>
              </div>
          </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">Stockout Rate</p>
                <p className="text-2xl font-bold text-red-700">{inventoryMetrics.stockout_rate?.toFixed(1) || '0.0'}%</p>
          </div>
          </div>
          </div>
        </div>
      </div>

      {/* Top Products List */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Products List</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 text-sm font-semibold text-gray-700">Rank</th>
                <th className="text-left p-3 text-sm font-semibold text-gray-700">Product Name</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-700">Value</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.slice(0, 15).map((product, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="p-3 text-sm text-gray-600">#{idx + 1}</td>
                  <td className="p-3 text-sm font-medium text-gray-900">{product.name || 'Unknown'}</td>
                  <td className="p-3 text-sm font-bold text-purple-600 text-right">
                    {formatCurrency(parseFloat(product.value || 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProductPerformanceDashboard;
