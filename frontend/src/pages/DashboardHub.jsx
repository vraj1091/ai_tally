import React, { useState, useEffect } from 'react';
import { FiGrid, FiTrendingUp, FiDollarSign, FiShoppingCart, FiPackage, FiActivity } from 'react-icons/fi';
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

// Persist dataSource in localStorage
const DATA_SOURCE_KEY = 'tally_data_source';

const dashboardConfig = [
  // Executive Dashboards
  { id: 'ceo', name: 'CEO Dashboard', component: CEODashboard, category: 'Executive', icon: FiTrendingUp, color: '#3b82f6', description: 'Complete business overview and KPIs' },
  { id: 'cfo', name: 'CFO Dashboard', component: CFODashboard, category: 'Executive', icon: RupeeIcon, color: '#10b981', description: 'Financial health metrics' },
  { id: 'executive', name: 'Executive Summary', component: ExecutiveSummaryDashboard, category: 'Executive', icon: FiActivity, color: '#8b5cf6', description: 'High-level insights' },
  
  // Operational Dashboards
  { id: 'sales', name: 'Sales Performance', component: SalesDashboard, category: 'Operations', icon: FiShoppingCart, color: '#f59e0b', description: 'Track sales and revenue' },
  { id: 'inventory', name: 'Inventory Management', component: InventoryDashboard, category: 'Operations', icon: FiPackage, color: '#ef4444', description: 'Stock levels and movement' },
  { id: 'realtime', name: 'Real-time Operations', component: RealtimeOperationsDashboard, category: 'Operations', icon: FiActivity, color: '#06b6d4', description: 'Live business activity' },
  
  // Financial Dashboards
  { id: 'ar', name: 'Accounts Receivable', component: AccountsReceivableDashboard, category: 'Financial', icon: RupeeIcon, color: '#84cc16', description: 'Monitor outstanding payments' },
  { id: 'ap', name: 'Accounts Payable', component: AccountsPayableDashboard, category: 'Financial', icon: RupeeIcon, color: '#ec4899', description: 'Manage vendor payments' },
  { id: 'cashflow', name: 'Cash Flow Analysis', component: CashFlowDashboard, category: 'Financial', icon: RupeeIcon, color: '#a855f7', description: 'Inflows and outflows' },
  { id: 'pl', name: 'Profit & Loss', component: ProfitLossDashboard, category: 'Financial', icon: RupeeIcon, color: '#eab308', description: 'Income and expenses' },
  { id: 'balance', name: 'Balance Sheet', component: BalanceSheetDashboard, category: 'Financial', icon: RupeeIcon, color: '#db2777', description: 'Assets, liabilities, equity' },
  
  // Compliance & Planning
  { id: 'tax', name: 'Tax & Compliance', component: TaxDashboard, category: 'Compliance', icon: FiActivity, color: '#14b8a6', description: 'Tax liabilities and filings' },
  { id: 'compliance', name: 'Regulatory Compliance', component: ComplianceDashboard, category: 'Compliance', icon: FiActivity, color: '#6366f1', description: 'Adherence to regulations' },
  { id: 'budget', name: 'Budget vs Actual', component: BudgetActualDashboard, category: 'Planning', icon: RupeeIcon, color: '#f97316', description: 'Compare performance to budget' },
  { id: 'forecast', name: 'Financial Forecasting', component: ForecastingDashboard, category: 'Planning', icon: FiTrendingUp, color: '#be185d', description: 'Predict future trends' },
  
  // Analytics Dashboards
  { id: 'customer', name: 'Customer Analytics', component: CustomerAnalyticsDashboard, category: 'Analytics', icon: FiActivity, color: '#4ade80', description: 'Customer behavior and value' },
  { id: 'vendor', name: 'Vendor Analytics', component: VendorAnalyticsDashboard, category: 'Analytics', icon: FiActivity, color: '#fbbf24', description: 'Vendor performance and spend' },
  { id: 'product', name: 'Product Performance', component: ProductPerformanceDashboard, category: 'Analytics', icon: FiPackage, color: '#c026d3', description: 'Sales and profitability by product' },
  { id: 'expense', name: 'Expense Analysis', component: ExpenseAnalysisDashboard, category: 'Analytics', icon: RupeeIcon, color: '#f43f5e', description: 'Detailed breakdown of expenditures' },
  { id: 'revenue', name: 'Revenue Analysis', component: RevenueAnalysisDashboard, category: 'Analytics', icon: RupeeIcon, color: '#22d3ee', description: 'Sources and trends of revenue' },
];

const DashboardHub = () => {
  const [selectedDashboard, setSelectedDashboard] = useState('ceo');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [tallyConnected, setTallyConnected] = useState(false);
  
  // Respect user's choice - default to stored preference or 'backup' if available
  const [dataSource, setDataSource] = useState(() => {
    const stored = localStorage.getItem(DATA_SOURCE_KEY);
    return stored || 'backup'; // Default to backup mode for easier testing
  });

  // Check Tally connection on mount
  useEffect(() => {
    const checkTallyConnection = async () => {
      try {
        const status = await tallyApi.getStatus();
        const isConnected = status?.connected || status?.is_connected;
        setTallyConnected(isConnected);
        console.log('DashboardHub: Tally status =', isConnected ? 'CONNECTED' : 'DISCONNECTED');
        
        // If no stored preference and Tally is connected, use live mode
        const stored = localStorage.getItem(DATA_SOURCE_KEY);
        if (!stored && isConnected) {
          setDataSource('live');
          localStorage.setItem(DATA_SOURCE_KEY, 'live');
        }
      } catch (error) {
        console.error('Failed to check Tally connection:', error);
      }
    };
    
    checkTallyConnection();
  }, []);

  const handleDataSourceChange = (newSource) => {
    setDataSource(newSource);
    localStorage.setItem(DATA_SOURCE_KEY, newSource);
  };

  const categories = ['All', 'Executive', 'Operations', 'Financial', 'Compliance', 'Planning', 'Analytics'];

  const filteredDashboards = selectedCategory === 'All' 
    ? dashboardConfig 
    : dashboardConfig.filter(d => d.category === selectedCategory);

  const activeDashboard = dashboardConfig.find(d => d.id === selectedDashboard);
  const DashboardComponent = activeDashboard?.component;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dashboard Selector Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <FiGrid className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboards Hub</h1>
                <p className="text-sm text-gray-600">20 Advanced Analytical Dashboards</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Access Dashboard Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300">
            {filteredDashboards.map((dashboard) => {
              const IconComponent = dashboard.icon;
              return (
                <button
                  key={dashboard.id}
                  onClick={() => setSelectedDashboard(dashboard.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                    selectedDashboard === dashboard.id
                      ? 'text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                  style={selectedDashboard === dashboard.id ? { backgroundColor: dashboard.color } : {}}
                >
                  <IconComponent className="w-4 h-4" />
                  <span className="text-sm font-medium">{dashboard.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Data Source Selector */}
        <DataSourceSelector 
          dataSource={dataSource}
          onDataSourceChange={handleDataSourceChange}
          tallyConnected={tallyConnected}
        />
        
        {DashboardComponent ? <DashboardComponent dataSource={dataSource} /> : (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <FiGrid className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Dashboard Not Found</h3>
            <p className="text-gray-600">Please select a dashboard from the tabs above</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardHub;
