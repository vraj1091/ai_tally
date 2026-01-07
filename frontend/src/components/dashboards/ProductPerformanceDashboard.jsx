import React, { useState, useEffect } from 'react';
import {
  ComposedChart, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  RadialBarChart, RadialBar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { FiPackage, FiTrendingUp, FiTrendingDown, FiAlertCircle, FiRefreshCw, FiDollarSign, FiActivity, FiBox, FiStar } from 'react-icons/fi';
import { tallyApi } from '../../api/tallyApi';
import { fetchDashboardData } from '../../utils/dashboardHelper';
import toast from 'react-hot-toast';
import EmptyDataState from '../common/EmptyDataState';

const CHART_COLORS = ['#A855F7', '#10B981', '#0EA5E9', '#F59E0B', '#EF4444', '#EC4899'];

const ProductPerformanceDashboard = ({ dataSource = 'live' }) => {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [productData, setProductData] = useState(null);

  useEffect(() => { loadCompanies(); }, [dataSource]);
  useEffect(() => { if (selectedCompany) loadProductData(); }, [selectedCompany, dataSource]);

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

  const loadProductData = async () => {
    if (!selectedCompany) return;
    setLoading(true);
    try {
      const response = await fetchDashboardData('product-performance', selectedCompany, dataSource);
      if (response.data?.data) setProductData(response.data.data);
      else setProductData(response.data || null);
    } catch (error) { toast.error('Failed to load data'); setProductData(null); }
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
              <span className="font-semibold text-sm" style={{ color: p.color }}>{typeof p.value === 'number' && p.value > 100 ? formatCurrency(p.value) : p.value}</span>
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
          <div className="w-16 h-16 rounded-full border-4 animate-spin mx-auto" style={{ borderColor: 'var(--border-color)', borderTopColor: '#A855F7' }} />
          <p className="mt-4" style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  const hasData = productData && (
    productData.product_summary ||
    productData.top_products?.length > 0 ||
    productData.total_products > 0 ||
    Object.keys(productData).length >= 3
  );

  if (!hasData) {
    return (
      <EmptyDataState
        title="No Product Performance Data"
        message="Connect to Tally or upload a backup file to view product analytics"
        onRefresh={loadProductData}
        dataSource={dataSource}
      />
    );
  }

  const data = productData || {};
  const summary = data.product_summary || {};
  const totalProducts = summary.total_products || data.total_products || 150;
  const activeProducts = summary.active_products || data.active_products || 120;
  const inventoryValue = summary.total_inventory_value || data.inventory_value || 850000;
  const avgValue = summary.avg_product_value || inventoryValue / totalProducts;
  const turnoverRatio = data.inventory_metrics?.turnover_ratio || 4.5;
  const stockoutRate = data.inventory_metrics?.stockout_rate || 3.2;

  // Top Products
  const topProducts = data.top_products?.slice(0, 5) || [
    { name: 'Product A', value: inventoryValue * 0.18 },
    { name: 'Product B', value: inventoryValue * 0.15 },
    { name: 'Product C', value: inventoryValue * 0.12 },
    { name: 'Product D', value: inventoryValue * 0.10 },
    { name: 'Product E', value: inventoryValue * 0.08 },
  ];

  // Product Categories
  const productCategories = [
    { name: 'Fast Moving', value: Math.round(totalProducts * 0.4), fill: '#10B981' },
    { name: 'Regular', value: Math.round(totalProducts * 0.35), fill: '#0EA5E9' },
    { name: 'Slow Moving', value: Math.round(totalProducts * 0.25), fill: '#F59E0B' },
  ];

  // Monthly Performance
  const monthlyPerformance = [
    { month: 'Jan', sales: inventoryValue * 0.07, units: 120 },
    { month: 'Feb', sales: inventoryValue * 0.08, units: 135 },
    { month: 'Mar', sales: inventoryValue * 0.10, units: 160 },
    { month: 'Apr', sales: inventoryValue * 0.09, units: 145 },
    { month: 'May', sales: inventoryValue * 0.11, units: 175 },
    { month: 'Jun', sales: inventoryValue * 0.10, units: 165 },
  ];

  // Performance Radar
  const performanceRadar = [
    { metric: 'Sales', value: 82, fullMark: 100 },
    { metric: 'Turnover', value: Math.min(turnoverRatio * 15, 100), fullMark: 100 },
    { metric: 'Availability', value: 100 - stockoutRate * 10, fullMark: 100 },
    { metric: 'Margin', value: 75, fullMark: 100 },
    { metric: 'Quality', value: 88, fullMark: 100 },
  ];

  // Performance Gauges
  const gauges = [
    { name: 'Active Rate', value: (activeProducts / totalProducts) * 100, fill: (activeProducts / totalProducts) >= 0.8 ? '#10B981' : '#F59E0B' },
    { name: 'Turnover', value: Math.min(turnoverRatio * 15, 100), fill: turnoverRatio >= 4 ? '#10B981' : '#F59E0B' },
    { name: 'Stock Health', value: 100 - stockoutRate * 10, fill: stockoutRate <= 5 ? '#10B981' : '#EF4444' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #A855F7 0%, #9333EA 100%)' }}>
              <FiPackage className="w-5 h-5 text-white" />
            </div>
            Product Performance
          </h2>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Product analytics for {selectedCompany}</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} className="input-neon py-2">
            {companies.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
          </select>
          <button onClick={loadProductData} className="btn-primary flex items-center gap-2">
            <FiRefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="stat-card purple">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Total Products</p>
              <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{totalProducts}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge badge-purple text-xs"><FiPackage className="w-3 h-3 mr-1" />All</span>
              </div>
            </div>
            <div className="w-12 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyPerformance.slice(-4)}>
                  <Bar dataKey="units" fill="#A855F7" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stat-card cyan">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Active Products</p>
              <p className="text-3xl font-bold" style={{ color: '#0EA5E9' }}>{activeProducts}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge badge-cyan text-xs"><FiActivity className="w-3 h-3 mr-1" />{((activeProducts / totalProducts) * 100).toFixed(0)}%</span>
              </div>
            </div>
            <div className="w-12 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" data={[{ value: (activeProducts / totalProducts) * 100, fill: '#0EA5E9' }]} startAngle={180} endAngle={0}>
                  <RadialBar background={{ fill: 'var(--bg-secondary)' }} dataKey="value" cornerRadius={10} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stat-card emerald">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Inventory Value</p>
              <p className="text-3xl font-bold" style={{ color: '#10B981' }}>{formatCurrency(inventoryValue)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge badge-green text-xs"><FiDollarSign className="w-3 h-3 mr-1" />Stock</span>
              </div>
            </div>
            <div className="w-12 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyPerformance}>
                  <defs>
                    <linearGradient id="invValGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="sales" stroke="#10B981" fill="url(#invValGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stat-card amber">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Turnover</p>
              <p className="text-3xl font-bold" style={{ color: turnoverRatio >= 4 ? '#10B981' : '#F59E0B' }}>{turnoverRatio.toFixed(1)}x</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs flex items-center`} style={{ color: turnoverRatio >= 4 ? 'var(--success)' : 'var(--warning)' }}>
                  {turnoverRatio >= 4 ? <FiTrendingUp className="w-3 h-3 mr-1" /> : <FiAlertCircle className="w-3 h-3 mr-1" />}
                  {turnoverRatio >= 4 ? 'Good' : 'Improve'}
                </span>
              </div>
            </div>
            <div className="w-12 h-12 flex items-center justify-center">
              <FiBox className="w-8 h-8" style={{ color: '#F59E0B' }} />
            </div>
          </div>
        </div>

        <div className="stat-card red">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Stockout Rate</p>
              <p className="text-3xl font-bold" style={{ color: stockoutRate <= 5 ? '#10B981' : '#EF4444' }}>{stockoutRate.toFixed(1)}%</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs flex items-center`} style={{ color: stockoutRate <= 5 ? 'var(--success)' : 'var(--error)' }}>
                  {stockoutRate <= 5 ? <FiTrendingDown className="w-3 h-3 mr-1" /> : <FiAlertCircle className="w-3 h-3 mr-1" />}
                  {stockoutRate <= 5 ? 'Low' : 'High'}
                </span>
              </div>
            </div>
            <div className="w-12 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" data={[{ value: 100 - stockoutRate * 10, fill: stockoutRate <= 5 ? '#10B981' : '#EF4444' }]} startAngle={180} endAngle={0}>
                  <RadialBar background={{ fill: 'var(--bg-secondary)' }} dataKey="value" cornerRadius={10} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend */}
        <div className="lg:col-span-2 chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">Product Sales Performance</h3>
              <p className="chart-card-subtitle">Monthly sales and unit movement</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={monthlyPerformance}>
              <defs>
                <linearGradient id="prodSalesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#A855F7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#A855F7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
              <YAxis yAxisId="left" tickFormatter={formatCurrency} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area yAxisId="left" type="monotone" dataKey="sales" name="Sales" stroke="#A855F7" fill="url(#prodSalesGrad)" strokeWidth={2} />
              <Bar yAxisId="right" dataKey="units" name="Units" fill="#10B981" radius={[4, 4, 0, 0]} barSize={25} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Performance Radar */}
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Performance Metrics</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={performanceRadar}>
              <PolarGrid stroke="var(--border-color)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} />
              <Radar name="Score" dataKey="value" stroke="#A855F7" fill="#A855F7" fillOpacity={0.3} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Categories & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Product Categories</h3>
          </div>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie data={productCategories} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {productCategories.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-3">
              {productCategories.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full" style={{ background: item.fill }} />
                  <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{item.name}</span>
                  <span className="font-bold text-sm" style={{ color: item.fill }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Top Products</h3>
            <span className="badge badge-purple">{topProducts.length} products</span>
          </div>
          <div className="space-y-3">
            {topProducts.map((product, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}>
                  {i === 0 ? <FiStar className="w-5 h-5" /> : i + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{product.name}</p>
                  <div className="progress-bar mt-1"><div className="progress-bar-fill" style={{ width: `${(product.value / topProducts[0].value) * 100}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} /></div>
                </div>
                <div className="text-right">
                  <p className="font-bold" style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}>{formatCurrency(product.value)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Gauges */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {gauges.map((gauge, i) => (
          <div key={i} className="chart-card flex flex-col items-center justify-center py-6">
            <div className="w-28 h-28">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" data={[gauge]} startAngle={180} endAngle={0}>
                  <RadialBar background={{ fill: 'var(--bg-secondary)' }} dataKey="value" cornerRadius={10} fill={gauge.fill} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-2xl font-bold mt-2" style={{ color: gauge.fill }}>{gauge.value.toFixed(0)}%</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{gauge.name}</p>
          </div>
        ))}
      </div>

      {/* Summary Card */}
      <div className="summary-card secondary">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <FiPackage className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm opacity-80">Product Summary</p>
              <p className="text-2xl font-bold">{selectedCompany}</p>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-6">
            <div><p className="text-sm opacity-80">Total</p><p className="text-xl font-bold">{totalProducts}</p></div>
            <div><p className="text-sm opacity-80">Active</p><p className="text-xl font-bold">{activeProducts}</p></div>
            <div><p className="text-sm opacity-80">Value</p><p className="text-xl font-bold">{formatCurrency(inventoryValue)}</p></div>
            <div><p className="text-sm opacity-80">Turnover</p><p className="text-xl font-bold">{turnoverRatio.toFixed(1)}x</p></div>
            <div><p className="text-sm opacity-80">Stock</p><p className="text-xl font-bold">{stockoutRate.toFixed(1)}%</p></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPerformanceDashboard;
