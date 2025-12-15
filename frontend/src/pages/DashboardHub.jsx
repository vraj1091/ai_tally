import React, { useState, useEffect } from 'react';
import { 
  FiGrid, FiTrendingUp, FiShoppingCart, FiPackage, FiActivity,
  FiSearch, FiChevronRight, FiX, FiLayers
} from 'react-icons/fi';
import RupeeIcon from '../components/common/RupeeIcon';
import DataSourceSelector from '../components/common/DataSourceSelector';
import { tallyApi } from '../api/tallyApi';

// Import all dashboards
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

const dashboards = [
  { id: 'ceo', name: 'CEO Dashboard', component: CEODashboard, cat: 'Executive', icon: FiTrendingUp, color: '#6366F1' },
  { id: 'cfo', name: 'CFO Dashboard', component: CFODashboard, cat: 'Executive', icon: RupeeIcon, color: '#10B981' },
  { id: 'executive', name: 'Executive Summary', component: ExecutiveSummaryDashboard, cat: 'Executive', icon: FiActivity, color: '#8B5CF6' },
  { id: 'sales', name: 'Sales', component: SalesDashboard, cat: 'Operations', icon: FiShoppingCart, color: '#F59E0B' },
  { id: 'inventory', name: 'Inventory', component: InventoryDashboard, cat: 'Operations', icon: FiPackage, color: '#EF4444' },
  { id: 'realtime', name: 'Real-time Ops', component: RealtimeOperationsDashboard, cat: 'Operations', icon: FiActivity, color: '#06B6D4' },
  { id: 'ar', name: 'Receivables', component: AccountsReceivableDashboard, cat: 'Financial', icon: RupeeIcon, color: '#84CC16' },
  { id: 'ap', name: 'Payables', component: AccountsPayableDashboard, cat: 'Financial', icon: RupeeIcon, color: '#EC4899' },
  { id: 'cashflow', name: 'Cash Flow', component: CashFlowDashboard, cat: 'Financial', icon: RupeeIcon, color: '#A855F7' },
  { id: 'pl', name: 'Profit & Loss', component: ProfitLossDashboard, cat: 'Financial', icon: RupeeIcon, color: '#EAB308' },
  { id: 'balance', name: 'Balance Sheet', component: BalanceSheetDashboard, cat: 'Financial', icon: RupeeIcon, color: '#DB2777' },
  { id: 'tax', name: 'Tax', component: TaxDashboard, cat: 'Compliance', icon: FiActivity, color: '#14B8A6' },
  { id: 'compliance', name: 'Compliance', component: ComplianceDashboard, cat: 'Compliance', icon: FiActivity, color: '#6366F1' },
  { id: 'budget', name: 'Budget vs Actual', component: BudgetActualDashboard, cat: 'Planning', icon: RupeeIcon, color: '#F97316' },
  { id: 'forecast', name: 'Forecasting', component: ForecastingDashboard, cat: 'Planning', icon: FiTrendingUp, color: '#BE185D' },
  { id: 'customer', name: 'Customers', component: CustomerAnalyticsDashboard, cat: 'Analytics', icon: FiActivity, color: '#4ADE80' },
  { id: 'vendor', name: 'Vendors', component: VendorAnalyticsDashboard, cat: 'Analytics', icon: FiActivity, color: '#FBBF24' },
  { id: 'product', name: 'Products', component: ProductPerformanceDashboard, cat: 'Analytics', icon: FiPackage, color: '#C026D3' },
  { id: 'expense', name: 'Expenses', component: ExpenseAnalysisDashboard, cat: 'Analytics', icon: RupeeIcon, color: '#F43F5E' },
  { id: 'revenue', name: 'Revenue', component: RevenueAnalysisDashboard, cat: 'Analytics', icon: RupeeIcon, color: '#22D3EE' },
];

const categories = ['All', 'Executive', 'Operations', 'Financial', 'Compliance', 'Planning', 'Analytics'];

const DashboardHub = () => {
  const [selected, setSelected] = useState('ceo');
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [tallyConnected, setTallyConnected] = useState(false);
  const [dataSource, setDataSource] = useState(() => localStorage.getItem(DATA_SOURCE_KEY) || 'backup');

  useEffect(() => {
    tallyApi.getStatus().then(s => {
      const conn = s?.connected || s?.is_connected;
      setTallyConnected(conn);
      if (!localStorage.getItem(DATA_SOURCE_KEY) && conn) {
        setDataSource('live');
        localStorage.setItem(DATA_SOURCE_KEY, 'live');
      }
    }).catch(() => {});
  }, []);

  const handleSelect = (id) => {
    setSelected(id);
    setShowPicker(false);
  };

  const handleDataSourceChange = (src) => {
    setDataSource(src);
    localStorage.setItem(DATA_SOURCE_KEY, src);
  };

  const filtered = dashboards.filter(d => {
    const matchCat = category === 'All' || d.cat === category;
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const active = dashboards.find(d => d.id === selected);
  const Component = active?.component;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Decorative */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-violet-200/50 to-purple-200/50 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-200/50 to-cyan-200/50 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: active?.color || '#6366F1' }}>
                {active?.icon && <active.icon className="w-6 h-6 text-white" />}
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900">{active?.name || 'Dashboards'}</h1>
                <p className="text-slate-500 text-sm">{active?.cat || 'Select a dashboard'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => setShowPicker(!showPicker)}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg">
                <FiGrid className="w-4 h-4" />
                All Dashboards
                <span className="bg-white/20 px-2 py-0.5 rounded-lg text-xs">{dashboards.length}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Picker Overlay */}
      {showPicker && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowPicker(false)} />
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-full max-w-4xl max-h-[70vh] bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900">Select Dashboard</h2>
                <button onClick={() => setShowPicker(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search dashboards..."
                  className="w-full pl-12 pr-4 py-3 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500" />
              </div>

              {/* Categories */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {categories.map((c) => (
                  <button key={c} onClick={() => setCategory(c)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                      category === c ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(70vh-180px)]">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filtered.map((d) => {
                  const Icon = d.icon;
                  return (
                    <button key={d.id} onClick={() => handleSelect(d.id)}
                      className={`p-4 rounded-2xl text-left transition-all hover:shadow-lg hover:-translate-y-0.5 ${
                        selected === d.id ? 'ring-2 ring-slate-900 bg-slate-50' : 'bg-slate-100 hover:bg-white'
                      }`}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: d.color }}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="font-bold text-slate-800 text-sm">{d.name}</h3>
                      <p className="text-slate-500 text-xs mt-1">{d.cat}</p>
                    </button>
                  );
                })}
              </div>

              {filtered.length === 0 && (
                <div className="text-center py-12">
                  <FiLayers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No dashboards found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="relative max-w-[1920px] mx-auto px-6 py-6">
        <DataSourceSelector dataSource={dataSource} onDataSourceChange={handleDataSourceChange} tallyConnected={tallyConnected} />

        <div className="mt-6 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden min-h-[600px]">
          {Component ? <Component dataSource={dataSource} /> : (
            <div className="flex flex-col items-center justify-center py-20">
              <FiGrid className="w-16 h-16 text-slate-300 mb-4" />
              <h3 className="text-xl font-bold text-slate-800">Select a Dashboard</h3>
              <p className="text-slate-500">Choose from {dashboards.length} available dashboards</p>
              <button onClick={() => setShowPicker(true)}
                className="mt-6 px-6 py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all">
                Browse Dashboards
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardHub;
