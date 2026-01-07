import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { 
  FiGrid, FiTrendingUp, FiDollarSign, FiBox, FiUsers, FiCreditCard, FiPieChart, 
  FiBarChart2, FiActivity, FiTarget, FiShoppingCart, FiTruck, FiFileText,
  FiCheckSquare, FiCalendar, FiArrowRight, FiSearch, FiChevronDown, FiZap,
  FiBookOpen, FiLayers, FiShield, FiClock
} from 'react-icons/fi';
import DataSourceSelector from '../components/common/DataSourceSelector';

// Lazy load dashboard components
const CEODashboardEnhanced = lazy(() => import('../components/dashboards/CEODashboardEnhanced'));
const CFODashboard = lazy(() => import('../components/dashboards/CFODashboard'));
const ExecutiveSummary = lazy(() => import('../components/dashboards/ExecutiveSummaryDashboard'));
const SalesDashboard = lazy(() => import('../components/dashboards/SalesDashboard'));
const InventoryDashboard = lazy(() => import('../components/dashboards/InventoryDashboard'));
const RealtimeOps = lazy(() => import('../components/dashboards/RealtimeOperationsDashboard'));
const ReceivablesDashboard = lazy(() => import('../components/dashboards/ReceivablesDashboard'));
const PayablesDashboard = lazy(() => import('../components/dashboards/AccountsPayableDashboard'));
const CashFlowDashboard = lazy(() => import('../components/dashboards/CashFlowDashboard'));
const ProfitLossDashboard = lazy(() => import('../components/dashboards/ProfitLossDashboard'));
const BalanceSheetDashboard = lazy(() => import('../components/dashboards/BalanceSheetDashboard'));
const TaxDashboard = lazy(() => import('../components/dashboards/TaxDashboard'));
const ComplianceDashboard = lazy(() => import('../components/dashboards/ComplianceDashboard'));
const BudgetDashboard = lazy(() => import('../components/dashboards/BudgetActualDashboard'));
const ForecastDashboard = lazy(() => import('../components/dashboards/ForecastingDashboard'));
const CustomerDashboard = lazy(() => import('../components/dashboards/CustomerAnalyticsDashboard'));
const VendorDashboard = lazy(() => import('../components/dashboards/VendorAnalyticsDashboard'));
const ProductDashboard = lazy(() => import('../components/dashboards/ProductPerformanceDashboard'));
const ExpenseDashboard = lazy(() => import('../components/dashboards/ExpenseAnalysisDashboard'));
const RevenueDashboard = lazy(() => import('../components/dashboards/RevenueAnalysisDashboard'));

const dashboards = [
  { id: 'ceo', name: 'CEO Dashboard', desc: 'Executive overview & strategic insights', icon: FiZap, category: 'executive', color: '#06B6D4', Component: CEODashboardEnhanced },
  { id: 'cfo', name: 'CFO Dashboard', desc: 'Financial management & metrics', icon: FiDollarSign, category: 'executive', color: '#8B5CF6', Component: CFODashboard },
  { id: 'executive', name: 'Executive Summary', desc: 'Comprehensive business overview', icon: FiTarget, category: 'executive', color: '#0EA5E9', Component: ExecutiveSummary },
  { id: 'sales', name: 'Sales Dashboard', desc: 'Sales performance & pipeline', icon: FiTrendingUp, category: 'sales', color: '#10B981', Component: SalesDashboard },
  { id: 'inventory', name: 'Inventory Dashboard', desc: 'Stock levels & movements', icon: FiBox, category: 'operations', color: '#F59E0B', Component: InventoryDashboard },
  { id: 'realtime', name: 'Real-time Ops', desc: 'Live operational metrics', icon: FiActivity, category: 'operations', color: '#EF4444', Component: RealtimeOps },
  { id: 'receivables', name: 'Receivables', desc: 'Outstanding customer payments', icon: FiCreditCard, category: 'finance', color: '#8B5CF6', Component: ReceivablesDashboard },
  { id: 'payables', name: 'Payables', desc: 'Vendor payments tracking', icon: FiTruck, category: 'finance', color: '#F59E0B', Component: PayablesDashboard },
  { id: 'cashflow', name: 'Cash Flow', desc: 'Cash position & forecast', icon: FiPieChart, category: 'finance', color: '#06B6D4', Component: CashFlowDashboard },
  { id: 'pnl', name: 'Profit & Loss', desc: 'Revenue & expense analysis', icon: FiBarChart2, category: 'finance', color: '#10B981', Component: ProfitLossDashboard },
  { id: 'balance', name: 'Balance Sheet', desc: 'Assets & liabilities', icon: FiLayers, category: 'finance', color: '#0EA5E9', Component: BalanceSheetDashboard },
  { id: 'tax', name: 'Tax Dashboard', desc: 'GST & tax calculations', icon: FiFileText, category: 'compliance', color: '#EF4444', Component: TaxDashboard },
  { id: 'compliance', name: 'Compliance', desc: 'Regulatory requirements', icon: FiShield, category: 'compliance', color: '#718096', Component: ComplianceDashboard },
  { id: 'budget', name: 'Budget vs Actual', desc: 'Budget performance tracking', icon: FiTarget, category: 'planning', color: '#10B981', Component: BudgetDashboard },
  { id: 'forecast', name: 'Forecasting', desc: 'Predictive analytics', icon: FiClock, category: 'planning', color: '#8B5CF6', Component: ForecastDashboard },
  { id: 'customers', name: 'Customers', desc: 'Customer analytics & insights', icon: FiUsers, category: 'sales', color: '#0EA5E9', Component: CustomerDashboard },
  { id: 'vendors', name: 'Vendors', desc: 'Vendor performance & analysis', icon: FiTruck, category: 'operations', color: '#F59E0B', Component: VendorDashboard },
  { id: 'products', name: 'Products', desc: 'Product performance metrics', icon: FiShoppingCart, category: 'sales', color: '#06B6D4', Component: ProductDashboard },
  { id: 'expenses', name: 'Expenses', desc: 'Expense tracking & analysis', icon: FiCreditCard, category: 'finance', color: '#EF4444', Component: ExpenseDashboard },
  { id: 'revenue', name: 'Revenue', desc: 'Revenue streams & growth', icon: FiTrendingUp, category: 'finance', color: '#10B981', Component: RevenueDashboard }
];

const categories = [
  { id: 'all', name: 'All Dashboards', icon: FiGrid },
  { id: 'executive', name: 'Executive', icon: FiZap },
  { id: 'finance', name: 'Finance', icon: FiDollarSign },
  { id: 'sales', name: 'Sales', icon: FiTrendingUp },
  { id: 'operations', name: 'Operations', icon: FiBox },
  { id: 'compliance', name: 'Compliance', icon: FiShield },
  { id: 'planning', name: 'Planning', icon: FiTarget }
];

const DashboardHub = () => {
  const [selectedDashboard, setSelectedDashboard] = useState(null);
  const [dataSource, setDataSource] = useState(localStorage.getItem('default_data_source') || 'live');
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDashboards = dashboards.filter(d => {
    const matchesCategory = activeCategory === 'all' || d.category === activeCategory;
    const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const LoadingFallback = () => (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full border-3 animate-spin mx-auto mb-4" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--primary)' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading Dashboard...</p>
      </div>
    </div>
  );

  if (selectedDashboard) {
    const dashboard = dashboards.find(d => d.id === selectedDashboard);
    const Component = dashboard?.Component;

    return (
      <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
        {/* Header */}
        <div className="p-6" style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-color)' }}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setSelectedDashboard(null)} className="btn-ghost flex items-center gap-2">
                <FiChevronDown className="w-4 h-4 rotate-90" /> Back
              </button>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: dashboard?.color }}>
                {dashboard && <dashboard.icon className="w-5 h-5 text-white" />}
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{dashboard?.name}</h1>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{dashboard?.desc}</p>
              </div>
            </div>
            <DataSourceSelector value={dataSource} onChange={setDataSource} />
          </div>
        </div>
        
        {/* Dashboard Content */}
        <Suspense fallback={<LoadingFallback />}>
          {Component && <Component dataSource={dataSource} />}
        </Suspense>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Dashboards</h1>
            <p style={{ color: 'var(--text-secondary)' }}>20 specialized analytics dashboards for your business</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Search dashboards..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-neon pl-10 w-64"
              />
            </div>
            <DataSourceSelector value={dataSource} onChange={setDataSource} />
          </div>
        </div>
      </header>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all`}
            style={{
              background: activeCategory === cat.id ? 'var(--primary)' : 'var(--bg-surface)',
              color: activeCategory === cat.id ? 'white' : 'var(--text-secondary)',
              border: '1px solid var(--border-color)'
            }}
          >
            <cat.icon className="w-4 h-4" />
            {cat.name}
          </button>
        ))}
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {filteredDashboards.map((d, i) => (
          <button
            key={d.id}
            onClick={() => setSelectedDashboard(d.id)}
            className="card p-5 text-left group animate-fade-up"
            style={{ animationDelay: `${i * 0.03}s` }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: d.color }}>
                <d.icon className="w-6 h-6 text-white" />
              </div>
              <FiArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" style={{ color: 'var(--primary)' }} />
            </div>
            <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors" style={{ color: 'var(--text-primary)' }}>{d.name}</h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{d.desc}</p>
            <span className="inline-block mt-3 badge text-xs" style={{ background: `${d.color}15`, color: d.color }}>{d.category}</span>
          </button>
        ))}
      </div>

      {/* Empty State */}
      {filteredDashboards.length === 0 && (
        <div className="card p-12 text-center">
          <FiSearch className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
          <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>No dashboards found</h3>
          <p style={{ color: 'var(--text-muted)' }}>Try adjusting your search or filter</p>
          <button onClick={() => { setSearchQuery(''); setActiveCategory('all'); }} className="btn-primary mt-4">Clear Filters</button>
        </div>
      )}
    </div>
  );
};

export default DashboardHub;
