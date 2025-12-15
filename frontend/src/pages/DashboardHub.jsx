import React, { useState, useEffect } from 'react';
import { 
  FiGrid, FiTrendingUp, FiShoppingCart, FiPackage, FiActivity,
  FiSearch, FiX, FiLayers, FiChevronRight, FiZap
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
  { id: 'ceo', name: 'CEO Dashboard', component: CEODashboard, cat: 'Executive', icon: FiTrendingUp, color: '#00F5FF' },
  { id: 'cfo', name: 'CFO Dashboard', component: CFODashboard, cat: 'Executive', icon: RupeeIcon, color: '#00FF88' },
  { id: 'executive', name: 'Executive Summary', component: ExecutiveSummaryDashboard, cat: 'Executive', icon: FiActivity, color: '#BF00FF' },
  { id: 'sales', name: 'Sales', component: SalesDashboard, cat: 'Operations', icon: FiShoppingCart, color: '#FF6B00' },
  { id: 'inventory', name: 'Inventory', component: InventoryDashboard, cat: 'Operations', icon: FiPackage, color: '#FF00E5' },
  { id: 'realtime', name: 'Real-time Ops', component: RealtimeOperationsDashboard, cat: 'Operations', icon: FiActivity, color: '#0066FF' },
  { id: 'ar', name: 'Receivables', component: AccountsReceivableDashboard, cat: 'Financial', icon: RupeeIcon, color: '#00FF88' },
  { id: 'ap', name: 'Payables', component: AccountsPayableDashboard, cat: 'Financial', icon: RupeeIcon, color: '#FF00E5' },
  { id: 'cashflow', name: 'Cash Flow', component: CashFlowDashboard, cat: 'Financial', icon: RupeeIcon, color: '#BF00FF' },
  { id: 'pl', name: 'Profit & Loss', component: ProfitLossDashboard, cat: 'Financial', icon: RupeeIcon, color: '#00F5FF' },
  { id: 'balance', name: 'Balance Sheet', component: BalanceSheetDashboard, cat: 'Financial', icon: RupeeIcon, color: '#FF6B00' },
  { id: 'tax', name: 'Tax', component: TaxDashboard, cat: 'Compliance', icon: FiActivity, color: '#00FF88' },
  { id: 'compliance', name: 'Compliance', component: ComplianceDashboard, cat: 'Compliance', icon: FiActivity, color: '#00F5FF' },
  { id: 'budget', name: 'Budget vs Actual', component: BudgetActualDashboard, cat: 'Planning', icon: RupeeIcon, color: '#FF6B00' },
  { id: 'forecast', name: 'Forecasting', component: ForecastingDashboard, cat: 'Planning', icon: FiTrendingUp, color: '#BF00FF' },
  { id: 'customer', name: 'Customers', component: CustomerAnalyticsDashboard, cat: 'Analytics', icon: FiActivity, color: '#00FF88' },
  { id: 'vendor', name: 'Vendors', component: VendorAnalyticsDashboard, cat: 'Analytics', icon: FiActivity, color: '#FF6B00' },
  { id: 'product', name: 'Products', component: ProductPerformanceDashboard, cat: 'Analytics', icon: FiPackage, color: '#FF00E5' },
  { id: 'expense', name: 'Expenses', component: ExpenseAnalysisDashboard, cat: 'Analytics', icon: RupeeIcon, color: '#FF6B00' },
  { id: 'revenue', name: 'Revenue', component: RevenueAnalysisDashboard, cat: 'Analytics', icon: RupeeIcon, color: '#00F5FF' },
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
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 px-6 py-4 bg-[#0a0a0a]/80 backdrop-blur-2xl border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg" 
                 style={{ backgroundColor: active?.color || '#00F5FF', boxShadow: `0 0 30px ${active?.color}40` }}>
              {active?.icon && <active.icon className="w-6 h-6 text-white" />}
            </div>
            <div>
              <h1 className="text-2xl font-black">{active?.name || 'Dashboards'}</h1>
              <p className="text-white/40 text-sm">{active?.cat || 'Select a dashboard'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setShowPicker(!showPicker)}
              className="btn-neon flex items-center gap-2">
              <FiGrid className="w-4 h-4" />
              All Dashboards
              <span className="bg-white/20 px-2 py-0.5 rounded-lg text-xs">{dashboards.length}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Dashboard Picker Modal */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowPicker(false)} />
          <div className="relative w-full max-w-4xl max-h-[75vh] bg-[#0a0a0a] rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="p-6 border-b border-white/5">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00F5FF] to-[#BF00FF] flex items-center justify-center">
                    <FiZap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Select Dashboard</h2>
                    <p className="text-white/40 text-sm">{dashboards.length} specialized dashboards</p>
                  </div>
                </div>
                <button onClick={() => setShowPicker(false)} 
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/50 hover:text-white">
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 w-5 h-5" />
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search dashboards..."
                  className="input-neon pl-12" />
              </div>

              {/* Categories */}
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {categories.map((c) => (
                  <button key={c} onClick={() => setCategory(c)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                      category === c 
                        ? 'bg-gradient-to-r from-[#00F5FF] to-[#BF00FF] text-white shadow-lg' 
                        : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10 border border-white/10'
                    }`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Dashboard Grid */}
            <div className="p-6 overflow-y-auto max-h-[calc(75vh-220px)]">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filtered.map((d, i) => {
                  const Icon = d.icon;
                  return (
                    <button key={d.id} onClick={() => handleSelect(d.id)}
                      className={`glass-card p-4 text-left group ${selected === d.id ? 'border-[#00F5FF]/50' : ''}`}
                      style={{ animationDelay: `${i * 0.02}s` }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" 
                           style={{ backgroundColor: d.color + '30' }}>
                        <Icon className="w-5 h-5" style={{ color: d.color }} />
                      </div>
                      <h3 className="font-bold text-sm group-hover:text-gradient transition-all">{d.name}</h3>
                      <p className="text-white/40 text-xs mt-1">{d.cat}</p>
                      {selected === d.id && (
                        <div className="absolute top-3 right-3">
                          <span className="w-2 h-2 rounded-full bg-[#00FF88] block animate-pulse" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {filtered.length === 0 && (
                <div className="text-center py-12">
                  <FiLayers className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/40">No dashboards found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="p-6">
        <div className="mb-6">
          <DataSourceSelector dataSource={dataSource} onDataSourceChange={handleDataSourceChange} tallyConnected={tallyConnected} />
        </div>

        <div className="glass-card overflow-hidden min-h-[600px]">
          {Component ? <Component dataSource={dataSource} /> : (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#00F5FF]/20 to-[#BF00FF]/20 flex items-center justify-center mb-6">
                <FiGrid className="w-10 h-10 text-[#00F5FF]" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Select a Dashboard</h3>
              <p className="text-white/50 mb-6">Choose from {dashboards.length} specialized dashboards</p>
              <button onClick={() => setShowPicker(true)} className="btn-neon flex items-center gap-2">
                <FiGrid className="w-4 h-4" /> Browse Dashboards
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardHub;
