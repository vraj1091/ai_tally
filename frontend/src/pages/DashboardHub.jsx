import React, { useState, useEffect } from 'react';
import { 
  FiGrid, FiTrendingUp, FiDollarSign, FiShoppingCart, FiPackage, FiActivity,
  FiSearch, FiStar, FiClock, FiChevronRight, FiMaximize2
} from 'react-icons/fi';
import RupeeIcon from '../components/common/RupeeIcon';
import DataSourceSelector from '../components/common/DataSourceSelector';
import { tallyApi } from '../api/tallyApi';

// Import all 20 dashboards
import CEODashboard from '../components/dashboards/CEODashboardEnhanced';
import CFODashboard from '../components/dashboards/CFODashboard';
import ExecutiveSummaryDashboard from '../components/dashboards/ExecutiveSummaryDashboard';
import SalesDashboard from '../components/dashboards/SalesDashboard';
import InventoryDashboard from '../components/dashboards/InventoryDashboard';
import RealtimeOperationsDashboard from '../components/dashboards/RealtimeOperationsDashboard';
import AccountsReceivableDashboard from '../components/dashboards/AccountsReceivableDashboard';
import AccountsPayableDashboard from '../components/dashboards/AccountsPayableDashboard';
import CashFlowDashboard from '../components/dashboards/CashFlowDashboard';
import ProfitLossDashboard from '../components/dashboards/ProfitLossDashboard';
import BalanceSheetDashboard from '../components/dashboards/BalanceSheetDashboard';
import TaxDashboard from '../components/dashboards/TaxDashboard';
import ComplianceDashboard from '../components/dashboards/ComplianceDashboard';
import BudgetActualDashboard from '../components/dashboards/BudgetActualDashboard';
import ForecastingDashboard from '../components/dashboards/ForecastingDashboard';
import CustomerAnalyticsDashboard from '../components/dashboards/CustomerAnalyticsDashboard';
import VendorAnalyticsDashboard from '../components/dashboards/VendorAnalyticsDashboard';
import ProductPerformanceDashboard from '../components/dashboards/ProductPerformanceDashboard';
import ExpenseAnalysisDashboard from '../components/dashboards/ExpenseAnalysisDashboard';
import RevenueAnalysisDashboard from '../components/dashboards/RevenueAnalysisDashboard';

const DATA_SOURCE_KEY = 'tally_data_source';

const dashboardConfig = [
  // Executive Dashboards
  { id: 'ceo', name: 'CEO Dashboard', component: CEODashboard, category: 'Executive', icon: FiTrendingUp, gradient: 'from-blue-500 to-indigo-600', description: 'Complete business overview and KPIs' },
  { id: 'cfo', name: 'CFO Dashboard', component: CFODashboard, category: 'Executive', icon: RupeeIcon, gradient: 'from-emerald-500 to-teal-600', description: 'Financial health and metrics' },
  { id: 'executive', name: 'Executive Summary', component: ExecutiveSummaryDashboard, category: 'Executive', icon: FiActivity, gradient: 'from-purple-500 to-pink-600', description: 'High-level business insights' },
  
  // Operational Dashboards
  { id: 'sales', name: 'Sales Performance', component: SalesDashboard, category: 'Operations', icon: FiShoppingCart, gradient: 'from-amber-500 to-orange-500', description: 'Track sales and revenue trends' },
  { id: 'inventory', name: 'Inventory Management', component: InventoryDashboard, category: 'Operations', icon: FiPackage, gradient: 'from-rose-500 to-red-600', description: 'Stock levels and movement' },
  { id: 'realtime', name: 'Real-time Operations', component: RealtimeOperationsDashboard, category: 'Operations', icon: FiActivity, gradient: 'from-cyan-500 to-blue-500', description: 'Live business activity' },
  
  // Financial Dashboards
  { id: 'ar', name: 'Accounts Receivable', component: AccountsReceivableDashboard, category: 'Financial', icon: RupeeIcon, gradient: 'from-lime-500 to-green-600', description: 'Monitor outstanding payments' },
  { id: 'ap', name: 'Accounts Payable', component: AccountsPayableDashboard, category: 'Financial', icon: RupeeIcon, gradient: 'from-pink-500 to-rose-600', description: 'Manage vendor payments' },
  { id: 'cashflow', name: 'Cash Flow Analysis', component: CashFlowDashboard, category: 'Financial', icon: RupeeIcon, gradient: 'from-violet-500 to-purple-600', description: 'Inflows and outflows' },
  { id: 'pl', name: 'Profit & Loss', component: ProfitLossDashboard, category: 'Financial', icon: RupeeIcon, gradient: 'from-yellow-500 to-amber-600', description: 'Income and expenses' },
  { id: 'balance', name: 'Balance Sheet', component: BalanceSheetDashboard, category: 'Financial', icon: RupeeIcon, gradient: 'from-fuchsia-500 to-pink-600', description: 'Assets, liabilities, equity' },
  
  // Compliance & Planning
  { id: 'tax', name: 'Tax & Compliance', component: TaxDashboard, category: 'Compliance', icon: FiActivity, gradient: 'from-teal-500 to-cyan-600', description: 'Tax liabilities and filings' },
  { id: 'compliance', name: 'Regulatory Compliance', component: ComplianceDashboard, category: 'Compliance', icon: FiActivity, gradient: 'from-indigo-500 to-blue-600', description: 'Adherence to regulations' },
  { id: 'budget', name: 'Budget vs Actual', component: BudgetActualDashboard, category: 'Planning', icon: RupeeIcon, gradient: 'from-orange-500 to-red-500', description: 'Compare to budget' },
  { id: 'forecast', name: 'Financial Forecasting', component: ForecastingDashboard, category: 'Planning', icon: FiTrendingUp, gradient: 'from-rose-600 to-pink-600', description: 'Predict future trends' },
  
  // Analytics Dashboards
  { id: 'customer', name: 'Customer Analytics', component: CustomerAnalyticsDashboard, category: 'Analytics', icon: FiActivity, gradient: 'from-green-500 to-emerald-600', description: 'Customer behavior and value' },
  { id: 'vendor', name: 'Vendor Analytics', component: VendorAnalyticsDashboard, category: 'Analytics', icon: FiActivity, gradient: 'from-amber-400 to-yellow-500', description: 'Vendor performance' },
  { id: 'product', name: 'Product Performance', component: ProductPerformanceDashboard, category: 'Analytics', icon: FiPackage, gradient: 'from-purple-600 to-violet-600', description: 'Sales by product' },
  { id: 'expense', name: 'Expense Analysis', component: ExpenseAnalysisDashboard, category: 'Analytics', icon: RupeeIcon, gradient: 'from-red-500 to-rose-600', description: 'Breakdown of expenses' },
  { id: 'revenue', name: 'Revenue Analysis', component: RevenueAnalysisDashboard, category: 'Analytics', icon: RupeeIcon, gradient: 'from-sky-500 to-blue-600', description: 'Revenue sources' },
];

const DashboardHub = () => {
  const [selectedDashboard, setSelectedDashboard] = useState('ceo');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [tallyConnected, setTallyConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDashboardGrid, setShowDashboardGrid] = useState(false);
  const [recentDashboards, setRecentDashboards] = useState([]);
  
  const [dataSource, setDataSource] = useState(() => {
    const stored = localStorage.getItem(DATA_SOURCE_KEY);
    return stored || 'backup';
  });

  useEffect(() => {
    const checkTallyConnection = async () => {
      try {
        const status = await tallyApi.getStatus();
        const isConnected = status?.connected || status?.is_connected;
        setTallyConnected(isConnected);
        
        const stored = localStorage.getItem(DATA_SOURCE_KEY);
        if (!stored && isConnected) {
          setDataSource('live');
          localStorage.setItem(DATA_SOURCE_KEY, 'live');
        }
      } catch (error) {
        console.error('Failed to check Tally connection');
      }
    };
    
    // Load recent dashboards
    const recent = JSON.parse(localStorage.getItem('recent_dashboards') || '[]');
    setRecentDashboards(recent);
    
    checkTallyConnection();
  }, []);

  const handleDashboardSelect = (dashboardId) => {
    setSelectedDashboard(dashboardId);
    setShowDashboardGrid(false);
    
    // Update recent dashboards
    const recent = JSON.parse(localStorage.getItem('recent_dashboards') || '[]');
    const updated = [dashboardId, ...recent.filter(id => id !== dashboardId)].slice(0, 5);
    localStorage.setItem('recent_dashboards', JSON.stringify(updated));
    setRecentDashboards(updated);
  };

  const handleDataSourceChange = (newSource) => {
    setDataSource(newSource);
    localStorage.setItem(DATA_SOURCE_KEY, newSource);
  };

  const categories = ['All', 'Executive', 'Operations', 'Financial', 'Compliance', 'Planning', 'Analytics'];

  const filteredDashboards = dashboardConfig.filter(d => {
    const matchesCategory = selectedCategory === 'All' || d.category === selectedCategory;
    const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         d.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const activeDashboard = dashboardConfig.find(d => d.id === selectedDashboard);
  const DashboardComponent = activeDashboard?.component;

  const categoryColors = {
    'Executive': 'bg-blue-100 text-blue-700',
    'Operations': 'bg-orange-100 text-orange-700',
    'Financial': 'bg-emerald-100 text-emerald-700',
    'Compliance': 'bg-purple-100 text-purple-700',
    'Planning': 'bg-amber-100 text-amber-700',
    'Analytics': 'bg-cyan-100 text-cyan-700'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Modern Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Title & Current Dashboard */}
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${activeDashboard?.gradient || 'from-blue-500 to-indigo-600'} flex items-center justify-center shadow-lg`}>
                {activeDashboard?.icon && <activeDashboard.icon className="w-6 h-6 text-white" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-slate-800">{activeDashboard?.name || 'Dashboard'}</h1>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${categoryColors[activeDashboard?.category] || 'bg-slate-100 text-slate-700'}`}>
                    {activeDashboard?.category}
                  </span>
                </div>
                <p className="text-slate-500 text-sm">{activeDashboard?.description}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative hidden md:block">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search dashboards..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (e.target.value) setShowDashboardGrid(true);
                  }}
                  onFocus={() => setShowDashboardGrid(true)}
                  className="pl-10 pr-4 py-2 bg-slate-100 rounded-xl text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>

              {/* Dashboard Picker Button */}
              <button
                onClick={() => setShowDashboardGrid(!showDashboardGrid)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25 font-medium"
              >
                <FiGrid className="w-4 h-4" />
                <span className="hidden sm:inline">All Dashboards</span>
                <span className="bg-white/20 px-2 py-0.5 rounded-lg text-xs">{dashboardConfig.length}</span>
              </button>
            </div>
          </div>

          {/* Quick Access Tabs */}
          {!showDashboardGrid && (
            <div className="flex gap-2 mt-4 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-300">
              {recentDashboards.length > 0 && (
                <div className="flex items-center gap-2 mr-2 pr-2 border-r border-slate-200">
                  <FiClock className="w-4 h-4 text-slate-400" />
                  <span className="text-xs text-slate-500 font-medium">Recent:</span>
                </div>
              )}
              {recentDashboards.map(id => {
                const dashboard = dashboardConfig.find(d => d.id === id);
                if (!dashboard) return null;
                const IconComponent = dashboard.icon;
                return (
                  <button
                    key={dashboard.id}
                    onClick={() => handleDashboardSelect(dashboard.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                      selectedDashboard === dashboard.id
                        ? 'bg-gradient-to-r text-white shadow-md ' + dashboard.gradient
                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                    {dashboard.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Dashboard Grid Picker */}
      {showDashboardGrid && (
        <div className="bg-white border-b border-slate-200 shadow-lg">
          <div className="max-w-[1920px] mx-auto px-6 py-6">
            {/* Category Filter */}
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                    selectedCategory === category
                      ? 'bg-slate-800 text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {category}
                  {category !== 'All' && (
                    <span className="ml-1.5 text-xs opacity-70">
                      ({dashboardConfig.filter(d => d.category === category).length})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Dashboard Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredDashboards.map((dashboard) => {
                const IconComponent = dashboard.icon;
                return (
                  <button
                    key={dashboard.id}
                    onClick={() => handleDashboardSelect(dashboard.id)}
                    className={`group relative p-4 rounded-2xl text-left transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                      selectedDashboard === dashboard.id
                        ? 'ring-2 ring-blue-500 shadow-lg'
                        : 'bg-white border border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${dashboard.gradient} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-semibold text-slate-800 text-sm mb-1">{dashboard.name}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2">{dashboard.description}</p>
                    <span className={`absolute top-3 right-3 text-xs px-2 py-0.5 rounded-full font-medium ${categoryColors[dashboard.category]}`}>
                      {dashboard.category}
                    </span>
                    {selectedDashboard === dashboard.id && (
                      <div className="absolute bottom-3 right-3">
                        <FiChevronRight className="w-4 h-4 text-blue-500" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {filteredDashboards.length === 0 && (
              <div className="text-center py-12">
                <FiSearch className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No dashboards found matching "{searchQuery}"</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dashboard Content */}
      <div className="max-w-[1920px] mx-auto px-6 py-6">
        {/* Data Source Selector */}
        <div className="mb-6">
          <DataSourceSelector 
            dataSource={dataSource}
            onDataSourceChange={handleDataSourceChange}
            tallyConnected={tallyConnected}
          />
        </div>
        
        {/* Active Dashboard */}
        <div className="bg-white/50 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {DashboardComponent ? (
            <DashboardComponent dataSource={dataSource} />
          ) : (
            <div className="p-12 text-center">
              <FiGrid className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-800 mb-2">Select a Dashboard</h3>
              <p className="text-slate-500">Choose from {dashboardConfig.length} available dashboards above</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardHub;
