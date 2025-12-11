import apiClient from './client'

/**
 * Dashboards API - Connects to /api/dashboards endpoints
 * These are specialized analytics dashboards for different business roles
 * Supports: live, backup, and bridge data sources
 */

const DASHBOARD_TIMEOUT = 120000 // 120 seconds for bridge mode

/**
 * Check if Bridge mode is active
 */
const isBridgeMode = () => {
  // Check both the connection type and data source settings
  const connectionType = localStorage.getItem('tally_connection_type')
  const dataSource = localStorage.getItem('tally_data_source')
  return connectionType === 'BRIDGE' || dataSource === 'bridge'
}

/**
 * Get bridge token
 */
const getBridgeToken = () => {
  return localStorage.getItem('tally_bridge_token') || 'user_tally_bridge'
}

/**
 * Determine the best data source based on connection settings
 */
const getDataSource = () => {
  // First check the data source selector setting
  const dataSource = localStorage.getItem('tally_data_source')
  if (dataSource === 'bridge') {
    return 'bridge'
  }
  if (dataSource === 'backup') {
    return 'backup'
  }
  if (dataSource === 'live') {
    return 'live'
  }
  
  // Fallback: check connection type
  if (isBridgeMode()) {
    return 'bridge'
  }
  return 'live'
}

/**
 * Generic dashboard fetcher with retry and fallback
 * Supports bridge mode for cloud-to-local Tally connection
 */
const fetchDashboard = async (endpoint, companyName, source = 'auto', refresh = false) => {
  try {
    // Auto-detect best source
    const actualSource = source === 'auto' ? getDataSource() : source
    const params = { source: actualSource, refresh }
    
    // Add bridge token if using bridge mode
    if (actualSource === 'bridge') {
      params.bridge_token = getBridgeToken()
      console.log(`📊 Fetching ${endpoint} dashboard via BRIDGE for ${companyName}...`)
    } else {
      console.log(`📊 Fetching ${endpoint} dashboard for ${companyName} (source: ${actualSource})...`)
    }
    
    const response = await apiClient.get(`/dashboards/${endpoint}/${encodeURIComponent(companyName)}`, {
      params,
      timeout: DASHBOARD_TIMEOUT
    })
    
    if (response.data && actualSource === 'bridge') {
      response.data._fromBridge = true
    }
    
    return response.data
  } catch (error) {
    // If bridge/live source failed, try backup as fallback
    if (source !== 'backup') {
      console.log(`⚠️ ${endpoint} failed with ${source}, trying backup...`)
      try {
        const backupResponse = await apiClient.get(`/dashboards/${endpoint}/${encodeURIComponent(companyName)}`, {
          params: { source: 'backup', refresh },
          timeout: DASHBOARD_TIMEOUT
        })
        if (backupResponse.data) {
          backupResponse.data._fromBackup = true
        }
        return backupResponse.data
      } catch (backupError) {
        console.error(`❌ All sources failed for ${endpoint}:`, backupError.message)
      }
    }
    console.error(`Error fetching ${endpoint} dashboard:`, error)
    throw error
  }
}

export const dashboardsApi = {
  // ============ Executive Dashboards ============
  
  /**
   * CEO Dashboard - High-level business overview
   * GET /api/dashboards/ceo/{company_name}
   */
  getCEO: (companyName, source = 'auto', refresh = false) => 
    fetchDashboard('ceo', companyName, source, refresh),

  /**
   * CFO Dashboard - Financial management view
   * GET /api/dashboards/cfo/{company_name}
   */
  getCFO: (companyName, source = 'auto', refresh = false) => 
    fetchDashboard('cfo', companyName, source, refresh),

  /**
   * Executive Summary Dashboard
   * GET /api/dashboards/executive-summary/{company_name}
   */
  getExecutiveSummary: (companyName, source = 'auto', refresh = false) => 
    fetchDashboard('executive-summary', companyName, source, refresh),

  // ============ Financial Dashboards ============

  /**
   * Cash Flow Dashboard
   * GET /api/dashboards/cashflow/{company_name}
   */
  getCashFlow: (companyName, source = 'auto', refresh = false) => 
    fetchDashboard('cashflow', companyName, source, refresh),

  /**
   * Profit & Loss Dashboard
   * GET /api/dashboards/profit-loss/{company_name}
   */
  getProfitLoss: (companyName, source = 'auto', refresh = false) => 
    fetchDashboard('profit-loss', companyName, source, refresh),

  /**
   * Balance Sheet Dashboard
   * GET /api/dashboards/balance-sheet/{company_name}
   */
  getBalanceSheet: (companyName, source = 'auto', refresh = false) => 
    fetchDashboard('balance-sheet', companyName, source, refresh),

  /**
   * Budget vs Actual Dashboard
   * GET /api/dashboards/budget-actual/{company_name}
   */
  getBudgetActual: (companyName, source = 'auto', refresh = false) => 
    fetchDashboard('budget-actual', companyName, source, refresh),

  /**
   * Forecasting Dashboard
   * GET /api/dashboards/forecasting/{company_name}
   */
  getForecasting: (companyName, source = 'auto', refresh = false) => 
    fetchDashboard('forecasting', companyName, source, refresh),

  // ============ Sales & Revenue Dashboards ============

  /**
   * Sales Dashboard
   * GET /api/dashboards/sales/{company_name}
   */
  getSales: (companyName, source = 'auto', refresh = false) => 
    fetchDashboard('sales', companyName, source, refresh),

  /**
   * Revenue Analysis Dashboard
   * GET /api/dashboards/revenue-analysis/{company_name}
   */
  getRevenueAnalysis: (companyName, source = 'auto', refresh = false) => 
    fetchDashboard('revenue-analysis', companyName, source, refresh),

  /**
   * Product Performance Dashboard
   * GET /api/dashboards/product-performance/{company_name}
   */
  getProductPerformance: (companyName, source = 'auto', refresh = false) => 
    fetchDashboard('product-performance', companyName, source, refresh),

  // ============ Operations Dashboards ============

  /**
   * Inventory Dashboard
   * GET /api/dashboards/inventory/{company_name}
   */
  getInventory: (companyName, source = 'auto', refresh = false) => 
    fetchDashboard('inventory', companyName, source, refresh),

  /**
   * Realtime Operations Dashboard
   * GET /api/dashboards/realtime-operations/{company_name}
   */
  getRealtimeOperations: (companyName, source = 'auto', refresh = false) => 
    fetchDashboard('realtime-operations', companyName, source, refresh),

  // ============ Accounts Dashboards ============

  /**
   * Accounts Receivable Dashboard
   * GET /api/dashboards/accounts-receivable/{company_name}
   */
  getAccountsReceivable: (companyName, source = 'auto', refresh = false) => 
    fetchDashboard('accounts-receivable', companyName, source, refresh),

  /**
   * Accounts Payable Dashboard
   * GET /api/dashboards/accounts-payable/{company_name}
   */
  getAccountsPayable: (companyName, source = 'auto', refresh = false) => 
    fetchDashboard('accounts-payable', companyName, source, refresh),

  /**
   * Expense Analysis Dashboard
   * GET /api/dashboards/expense-analysis/{company_name}
   */
  getExpenseAnalysis: (companyName, source = 'auto', refresh = false) => 
    fetchDashboard('expense-analysis', companyName, source, refresh),

  // ============ Partner Dashboards ============

  /**
   * Customer Analytics Dashboard
   * GET /api/dashboards/customer-analytics/{company_name}
   */
  getCustomerAnalytics: (companyName, source = 'auto', refresh = false) => 
    fetchDashboard('customer-analytics', companyName, source, refresh),

  /**
   * Vendor Analytics Dashboard
   * GET /api/dashboards/vendor-analytics/{company_name}
   */
  getVendorAnalytics: (companyName, source = 'auto', refresh = false) => 
    fetchDashboard('vendor-analytics', companyName, source, refresh),

  // ============ Compliance Dashboards ============

  /**
   * Tax Dashboard
   * GET /api/dashboards/tax/{company_name}
   */
  getTax: (companyName, source = 'auto', refresh = false) => 
    fetchDashboard('tax', companyName, source, refresh),

  /**
   * Compliance Dashboard
   * GET /api/dashboards/compliance/{company_name}
   */
  getCompliance: (companyName, source = 'auto', refresh = false) => 
    fetchDashboard('compliance', companyName, source, refresh),

  // ============ Utility Functions ============

  /**
   * Get all available dashboard types
   */
  getDashboardTypes: () => [
    { id: 'ceo', name: 'CEO Dashboard', category: 'Executive' },
    { id: 'cfo', name: 'CFO Dashboard', category: 'Executive' },
    { id: 'executive-summary', name: 'Executive Summary', category: 'Executive' },
    { id: 'sales', name: 'Sales Dashboard', category: 'Sales' },
    { id: 'revenue-analysis', name: 'Revenue Analysis', category: 'Sales' },
    { id: 'product-performance', name: 'Product Performance', category: 'Sales' },
    { id: 'cashflow', name: 'Cash Flow', category: 'Financial' },
    { id: 'profit-loss', name: 'Profit & Loss', category: 'Financial' },
    { id: 'balance-sheet', name: 'Balance Sheet', category: 'Financial' },
    { id: 'budget-actual', name: 'Budget vs Actual', category: 'Financial' },
    { id: 'forecasting', name: 'Forecasting', category: 'Financial' },
    { id: 'inventory', name: 'Inventory', category: 'Operations' },
    { id: 'realtime-operations', name: 'Realtime Operations', category: 'Operations' },
    { id: 'accounts-receivable', name: 'Accounts Receivable', category: 'Accounts' },
    { id: 'accounts-payable', name: 'Accounts Payable', category: 'Accounts' },
    { id: 'expense-analysis', name: 'Expense Analysis', category: 'Accounts' },
    { id: 'customer-analytics', name: 'Customer Analytics', category: 'Partners' },
    { id: 'vendor-analytics', name: 'Vendor Analytics', category: 'Partners' },
    { id: 'tax', name: 'Tax Dashboard', category: 'Compliance' },
    { id: 'compliance', name: 'Compliance', category: 'Compliance' }
  ],

  /**
   * Generic dashboard fetch - use when dashboard type is dynamic
   */
  getDashboard: fetchDashboard
}

export default dashboardsApi

