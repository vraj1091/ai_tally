import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { FiPackage, FiAlertCircle, FiRefreshCw, FiTrendingUp, FiClock } from 'react-icons/fi';
import RupeeIcon from '../common/RupeeIcon';
import { tallyApi } from '../../api/tallyApi';
import toast from 'react-hot-toast';
import { validateChartData, validateNumeric, validateArrayData } from '../../utils/chartDataValidator';
import { fetchDashboardData } from '../../utils/dashboardHelper';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const InventoryDashboard = ({ dataSource = 'live' }) => {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [inventoryData, setInventoryData] = useState(null);

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
        setInventoryData(null);
      }
      setLoading(false);
    } catch (error) {
      console.error(`Failed to load companies from ${dataSource}:`, error);
      setCompanies([]);
      setSelectedCompany('');
      setInventoryData(null);
      if (dataSource === 'live') {
        toast.error(`Failed to load companies from ${dataSource}`);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCompany && companies.length > 0) {
      loadInventoryData();
    } else if (!selectedCompany) {
      setInventoryData(null);
    }
  }, [selectedCompany, dataSource, companies.length]);

  const loadInventoryData = async () => {
    if (!selectedCompany) {
      setInventoryData(null);
      return;
    }
    
    setLoading(true);
    try {
      const currentSource = dataSource || 'live';
      const response = await fetchDashboardData('inventory', selectedCompany, currentSource);
      setInventoryData(response.data.data);
    } catch (error) {
      console.error('Error loading Inventory data:', error);
      if (error.response?.status === 401 && dataSource === 'live') {
        toast.error('Authentication required for live data. Please login or use backup data.');
      } else {
        toast.error('Failed to load Inventory dashboard data');
      }
      setInventoryData(null);
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
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading Inventory Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!inventoryData) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <FiAlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Inventory Data Available</h3>
        <p className="text-gray-600">Please connect to Tally or select a company with data</p>
      </div>
    );
  }

  const summary = inventoryData.inventory_summary || {};
  const stockLevels = inventoryData.stock_levels || {};
  const topItems = inventoryData.top_items_by_value || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inventory Dashboard</h2>
          <p className="text-gray-600 mt-1">Stock Management & Inventory Analysis</p>
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
            onClick={loadInventoryData}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <FiRefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Inventory Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Total Inventory Value</p>
            <RupeeIcon className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(summary.total_inventory_value)}</p>
          <p className="text-sm opacity-75">Stock on hand</p>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Total Items</p>
            <FiPackage className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{summary.total_items || 0}</p>
          <p className="text-sm opacity-75">SKUs in system</p>
        </div>

        <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Turnover Ratio</p>
            <FiTrendingUp className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{(summary.turnover_ratio || 0).toFixed(1)}x</p>
          <p className="text-sm opacity-75">Annual turnover</p>
        </div>

        <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">Days of Inventory</p>
            <FiClock className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-4xl font-bold mb-2">{summary.days_of_inventory || 0}</p>
          <p className="text-sm opacity-75">Days on hand</p>
        </div>
      </div>

      {/* Stock Levels */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock Level Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-green-50 rounded-lg border-2 border-green-200">
            <FiPackage className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-2">In Stock</p>
            <p className="text-5xl font-bold text-green-700">{stockLevels.in_stock || 0}</p>
          </div>
          <div className="text-center p-6 bg-yellow-50 rounded-lg border-2 border-yellow-200">
            <FiAlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-2">Low Stock</p>
            <p className="text-5xl font-bold text-yellow-700">{stockLevels.low_stock || 0}</p>
          </div>
          <div className="text-center p-6 bg-red-50 rounded-lg border-2 border-red-200">
            <FiAlertCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-2">Out of Stock</p>
            <p className="text-5xl font-bold text-red-700">{stockLevels.out_of_stock || 0}</p>
          </div>
        </div>
      </div>

      {/* Top 15 Items by Value */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 15 Items by Value</h3>
        {topItems && topItems.length > 0 ? (
        <ResponsiveContainer width="100%" height={400}>
            <BarChart data={topItems.slice(0, 15).map((item, idx) => {
              const itemName = typeof item === 'object' ? (item.name || item.get?.('name') || 'Unknown') : String(item || 'Unknown');
              const itemValue = typeof item === 'object' ? (item.value || item.amount || item.closing_balance || item.balance || 0) : 0;
              return {
                name: itemName.substring(0, 25),
                value: Math.abs(parseFloat(itemValue) || 0),
            index: idx
              };
            })}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={120} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => formatCurrency(val)} />
            <Tooltip formatter={(val) => formatCurrency(val)} />
            <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 0, 0]}>
              {topItems.slice(0, 15).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <FiPackage className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p>No inventory items found</p>
          </div>
        )}
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory Details</h3>
        {topItems && topItems.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">#</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Item Name</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Stock Value</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {topItems.slice(0, 15).map((item, idx) => {
                  const itemName = typeof item === 'object' ? (item.name || item.get?.('name') || 'Unknown') : String(item || 'Unknown');
                  const itemValue = typeof item === 'object' ? (item.value || item.amount || item.closing_balance || item.balance || 0) : 0;
                  const value = Math.abs(parseFloat(itemValue) || 0);
                return (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-medium text-gray-600">{idx + 1}</td>
                      <td className="py-3 px-4 text-sm text-gray-900 font-medium">{itemName}</td>
                    <td className="py-3 px-4 text-sm text-gray-900 font-semibold text-right">
                      {formatCurrency(value)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          value > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {value > 0 ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No inventory items to display</p>
          </div>
        )}
      </div>

      {/* Inventory Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-indigo-500">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Inventory Health</h4>
          <p className="text-2xl font-bold text-gray-900">
            {summary.turnover_ratio >= 4 ? 'Excellent' : summary.turnover_ratio >= 2 ? 'Good' : 'Needs Attention'}
          </p>
          <p className="text-sm text-gray-600 mt-1">Based on turnover ratio</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Stock Coverage</h4>
          <p className="text-2xl font-bold text-gray-900">{summary.days_of_inventory} days</p>
          <p className="text-sm text-gray-600 mt-1">Current stock will last</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Reorder Status</h4>
          <p className="text-2xl font-bold text-gray-900">
            {stockLevels.low_stock > 0 ? `${stockLevels.low_stock} items` : 'All Good'}
          </p>
          <p className="text-sm text-gray-600 mt-1">{stockLevels.low_stock > 0 ? 'Need reorder' : 'No action needed'}</p>
        </div>
      </div>
    </div>
  );
};

export default InventoryDashboard;
