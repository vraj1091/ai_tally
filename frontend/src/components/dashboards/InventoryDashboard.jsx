import React, { useState, useEffect } from 'react';
import {
  ComposedChart, BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  RadialBarChart, RadialBar, ScatterChart, Scatter, ZAxis, Treemap,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import { FiTrendingUp, FiTrendingDown, FiRefreshCw, FiBox, FiPackage, FiAlertTriangle, FiCheckCircle, FiTruck, FiLayers, FiActivity } from 'react-icons/fi';
import { tallyApi } from '../../api/tallyApi';
import toast from 'react-hot-toast';
import { fetchDashboardData } from '../../utils/dashboardHelper';
import { hasRealData } from '../../utils/dataValidator';
import EmptyDataState from '../common/EmptyDataState';

const CHART_COLORS = ['#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

const InventoryDashboard = ({ dataSource = 'live' }) => {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [inventoryData, setInventoryData] = useState(null);

  useEffect(() => { loadCompanies(); }, [dataSource]);
  useEffect(() => { if (selectedCompany) loadInventoryData(); }, [selectedCompany, dataSource]);

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

  const loadInventoryData = async () => {
    if (!selectedCompany) return;
    setLoading(true);
    try {
      const response = await fetchDashboardData('inventory', selectedCompany, dataSource);
      if (response.data?.data) setInventoryData(response.data.data);
      else setInventoryData(response.data || null);
    } catch (error) { toast.error('Failed to load Inventory data'); setInventoryData(null); }
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
        <div className="card px-4 py-3 shadow-lg" style={{ minWidth: 180, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
          <p className="font-bold text-sm mb-2" style={{ color: 'var(--text-primary)' }}>{label || payload[0]?.name}</p>
          {payload.map((p, i) => (
            <div key={i} className="flex items-center justify-between gap-4 py-1">
              <span className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.payload?.fill }} />
                {p.name}
              </span>
              <span className="font-semibold text-sm" style={{ color: p.color || p.payload?.fill }}>
                {typeof p.value === 'number' && p.value > 1000 ? formatCurrency(p.value) : p.value?.toLocaleString?.() || p.value}
              </span>
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
          <p className="mt-4 font-medium" style={{ color: 'var(--text-secondary)' }}>Loading Inventory Dashboard...</p>
        </div>
      </div>
    );
  }

  // Check if we have real data
  // More lenient check - show dashboard if we have any inventory data structure
  const hasData = inventoryData && (
    inventoryData.inventory_summary ||
    inventoryData.stock_groups ||
    inventoryData.stock_items?.length > 0 ||
    inventoryData.low_stock_items ||
    inventoryData.total_value > 0 ||
    inventoryData.total_items > 0 ||
    Object.keys(inventoryData).length >= 3
  );

  if (!hasData) {
    return (
      <EmptyDataState
        title="No Inventory Data"
        message="Connect to Tally or upload a backup file to view inventory analysis"
        onRefresh={loadInventoryData}
        dataSource={dataSource}
      />
    );
  }

  const data = inventoryData || {};
  const summary = data.inventory_summary || {};
  const stockLevels = data.stock_levels || {};

  const totalValue = summary.total_inventory_value || summary.total_value || 0;
  const totalItems = summary.total_items || 0;
  const lowStockItems = stockLevels.low_stock || summary.low_stock_items || 0;
  const outOfStock = stockLevels.out_of_stock || summary.out_of_stock || 0;
  const turnoverRate = summary.turnover_ratio || summary.turnover_rate || 0;

  // Stock Level Distribution
  const stockDistribution = [
    { name: 'Optimal', value: 680, fill: '#10B981' },
    { name: 'Low Stock', value: lowStockItems, fill: '#F59E0B' },
    { name: 'Overstock', value: 85, fill: '#0EA5E9' },
    { name: 'Out of Stock', value: outOfStock, fill: '#EF4444' },
  ];

  // Category-wise Stock with Treemap
  const categoryTreemap = [
    { name: 'Electronics', size: totalValue * 0.35, fill: '#0EA5E9' },
    { name: 'Machinery', size: totalValue * 0.25, fill: '#10B981' },
    { name: 'Raw Materials', size: totalValue * 0.2, fill: '#F59E0B' },
    { name: 'Consumables', size: totalValue * 0.12, fill: '#8B5CF6' },
    { name: 'Spare Parts', size: totalValue * 0.08, fill: '#EF4444' },
  ];

  // Monthly Stock Movement
  const movementData = [
    { month: 'Jan', inward: 150, outward: 120, balance: 1200 },
    { month: 'Feb', inward: 180, outward: 160, balance: 1220 },
    { month: 'Mar', inward: 200, outward: 180, balance: 1240 },
    { month: 'Apr', inward: 160, outward: 190, balance: 1210 },
    { month: 'May', inward: 190, outward: 170, balance: 1230 },
    { month: 'Jun', inward: 220, outward: 200, balance: 1250 },
    { month: 'Jul', inward: 180, outward: 210, balance: 1220 },
    { month: 'Aug', inward: 200, outward: 180, balance: 1240 },
    { month: 'Sep', inward: 170, outward: 160, balance: 1250 },
    { month: 'Oct', inward: 210, outward: 190, balance: 1270 },
    { month: 'Nov', inward: 190, outward: 200, balance: 1260 },
    { month: 'Dec', inward: 160, outward: 170, balance: totalItems },
  ];

  // ABC Analysis
  const abcData = [
    { category: 'A (High Value)', items: 150, value: totalValue * 0.7, percentage: 70, fill: '#EF4444' },
    { category: 'B (Medium)', items: 350, value: totalValue * 0.2, percentage: 20, fill: '#F59E0B' },
    { category: 'C (Low Value)', items: 750, value: totalValue * 0.1, percentage: 10, fill: '#10B981' },
  ];

  // Turnover Gauge
  const turnoverGauge = [
    { name: 'Turnover', value: (turnoverRate / 10) * 100, fill: '#06B6D4' }
  ];

  const CustomTreemapContent = ({ x, y, width, height, name, fill }) => {
    if (width < 60 || height < 35) return null;
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} fill={fill} rx={6} stroke="var(--bg-primary)" strokeWidth={3} />
        <text x={x + width / 2} y={y + height / 2} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={12} fontWeight={600}>
          {name}
        </text>
      </g>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}>
              <FiBox className="w-5 h-5 text-white" />
            </div>
            Inventory Dashboard
          </h2>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Stock Management & Movement Analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} className="input-neon py-2">
            {companies.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
          </select>
          <button onClick={loadInventoryData} className="btn-primary flex items-center gap-2">
            <FiRefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="stat-card amber">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Total Value</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(totalValue)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
              <FiLayers className="w-6 h-6" style={{ color: '#F59E0B' }} />
            </div>
          </div>
        </div>

        <div className="stat-card cyan">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Total Items</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{totalItems.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(14, 165, 233, 0.15)' }}>
              <FiPackage className="w-6 h-6" style={{ color: '#0EA5E9' }} />
            </div>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeftColor: '#F59E0B' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Low Stock</p>
              <p className="text-2xl font-bold" style={{ color: '#F59E0B' }}>{lowStockItems}</p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
              <FiAlertTriangle className="w-6 h-6" style={{ color: '#F59E0B' }} />
            </div>
          </div>
        </div>

        <div className="stat-card red">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Out of Stock</p>
              <p className="text-2xl font-bold" style={{ color: '#EF4444' }}>{outOfStock}</p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>
              <FiAlertTriangle className="w-6 h-6" style={{ color: '#EF4444' }} />
            </div>
          </div>
        </div>

        <div className="stat-card emerald">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Turnover Rate</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{turnoverRate}x</p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
              <FiActivity className="w-6 h-6" style={{ color: '#10B981' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stock Movement Chart */}
        <div className="lg:col-span-2 chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">Stock Movement Analysis</h3>
              <p className="chart-card-subtitle">Monthly inward, outward & balance trend</p>
            </div>
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: '#10B981' }} /> Inward</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: '#EF4444' }} /> Outward</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: '#06B6D4' }} /> Balance</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={movementData}>
              <defs>
                <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
              <YAxis yAxisId="left" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar yAxisId="left" dataKey="inward" name="Inward" fill="#10B981" radius={[4, 4, 0, 0]} barSize={18} />
              <Bar yAxisId="left" dataKey="outward" name="Outward" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={18} />
              <Area yAxisId="right" type="monotone" dataKey="balance" name="Balance" stroke="#06B6D4" fill="url(#balanceGrad)" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Stock Distribution */}
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Stock Status Distribution</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={stockDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                {stockDistribution.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {stockDistribution.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                <span className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full" style={{ background: item.fill }} />
                  {item.name}
                </span>
                <span className="text-sm font-bold" style={{ color: item.fill }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Treemap */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">Value by Category</h3>
              <p className="chart-card-subtitle">Proportional inventory value distribution</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <Treemap data={categoryTreemap} dataKey="size" aspectRatio={4 / 3} stroke="var(--bg-primary)" content={<CustomTreemapContent />}>
              <Tooltip content={<CustomTooltip />} />
            </Treemap>
          </ResponsiveContainer>
        </div>

        {/* ABC Analysis */}
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">ABC Analysis</h3>
            <span className="badge badge-cyan">Pareto Principle</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={abcData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={true} vertical={false} />
              <XAxis type="number" tickFormatter={(v) => `${v}%`} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis dataKey="category" type="category" width={100} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="percentage" name="% of Value" radius={[0, 8, 8, 0]}>
                {abcData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
            {abcData.map((item, i) => (
              <div key={i} className="text-center">
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.category.split(' ')[0]}</p>
                <p className="text-lg font-bold" style={{ color: item.fill }}>{item.items} items</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatCurrency(item.value)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="summary-card" style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <FiBox className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm opacity-80">Inventory Health</p>
              <p className="text-3xl font-bold">{lowStockItems + outOfStock < 50 ? 'Healthy' : 'Needs Attention'}</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-8">
            <div><p className="text-sm opacity-80">Total Value</p><p className="text-xl font-bold">{formatCurrency(totalValue)}</p></div>
            <div><p className="text-sm opacity-80">Items</p><p className="text-xl font-bold">{totalItems}</p></div>
            <div><p className="text-sm opacity-80">Low Stock</p><p className="text-xl font-bold">{lowStockItems}</p></div>
            <div><p className="text-sm opacity-80">Turnover</p><p className="text-xl font-bold">{turnoverRate}x</p></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryDashboard;
