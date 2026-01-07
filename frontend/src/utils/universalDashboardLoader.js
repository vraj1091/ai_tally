/**
 * Universal Dashboard Data Loader
 * Provides consistent data loading for all 20+ dashboards
 * Handles response normalization, fallback, and error handling
 */

import { fetchDashboardData } from './dashboardHelper';

/**
 * Extract data from various API response structures
 * @param {object} response - Raw API response
 * @param {string} dataSource - Original data source
 * @returns {{data: object|null, source: string}}
 */
export const extractDataFromResponse = (response, dataSource = 'live') => {
  let data = null;
  let source = dataSource;

  if (!response) return { data: null, source };

  // Handle axios response wrapper
  const responseData = response.data || response;

  // Structure 1: { success: true, data: {...}, source: '...' }
  if (responseData?.data && typeof responseData.data === 'object' && !Array.isArray(responseData.data)) {
    data = responseData.data;
    source = responseData.source || dataSource;
  }
  // Structure 2: Direct data at root level (check for common dashboard fields)
  else if (responseData && typeof responseData === 'object') {
    const hasDirectData = 
      responseData.executive_summary || 
      responseData.financial_summary || 
      responseData.sales_summary || 
      responseData.inventory_summary ||
      responseData.ap_summary ||
      responseData.ar_summary ||
      responseData.budget_summary ||
      responseData.expense_summary ||
      responseData.compliance_score !== undefined ||
      responseData.customer_summary ||
      responseData.total_revenue !== undefined || 
      responseData.total_assets !== undefined ||
      responseData.total_sales !== undefined || 
      responseData.total_expenses !== undefined ||
      responseData.total_payables !== undefined ||
      responseData.total_receivables !== undefined ||
      responseData.opening_balance !== undefined ||
      responseData.net_profit !== undefined ||
      responseData.dashboard_type ||
      responseData._autoFallback;
    
    if (hasDirectData) {
      data = responseData;
      source = responseData.source || (responseData._autoFallback ? 'backup' : dataSource);
    }
  }

  return { data, source };
};

/**
 * Load dashboard data with proper response handling
 * @param {string} endpoint - Dashboard API endpoint (e.g., 'ceo', 'cfo', 'sales')
 * @param {string} companyName - Company name
 * @param {string} dataSource - Data source ('live', 'backup', 'bridge')
 * @param {object} options - Additional options
 * @returns {Promise<{data: object|null, source: string, error: string|null}>}
 */
export const loadDashboardData = async (endpoint, companyName, dataSource = 'live', options = {}) => {
  const dashboardName = options.dashboardName || endpoint.toUpperCase();
  
  if (!companyName) {
    console.warn(`[${dashboardName}] No company name provided`);
    return { data: null, source: dataSource, error: 'No company selected' };
  }

  console.log(`[${dashboardName}] 🔄 Loading data for "${companyName}" (source: ${dataSource})`);

  try {
    const response = await fetchDashboardData(endpoint, companyName, dataSource, {
      timeout: options.timeout || 120000,
      ...options
    });

    // Extract data using the universal extractor
    const { data, source } = extractDataFromResponse(response, dataSource);

    if (data) {
      // Log key metrics for debugging
      const revenue = data.executive_summary?.total_revenue || data.total_revenue || data.revenue || 0;
      const assets = data.financial_summary?.total_assets || data.total_assets || 0;
      console.log(`[${dashboardName}] ✅ Data loaded successfully`);
      console.log(`[${dashboardName}] 📊 Key metrics: revenue=${revenue}, assets=${assets}, source=${source}`);
      
      return { data, source, error: null };
    }

    console.warn(`[${dashboardName}] ⚠️ No data in response`);
    return { data: null, source, error: 'No data returned from server' };

  } catch (error) {
    console.error(`[${dashboardName}] ❌ Error:`, error.message);
    return { data: null, source: dataSource, error: error.message };
  }
};

/**
 * Check if dashboard data has real values (not empty/zero)
 * @param {object} data - Dashboard data object
 * @param {string} dashboardType - Type of dashboard for specific checks
 * @returns {boolean}
 */
export const hasDashboardData = (data, dashboardType = 'generic') => {
  if (!data || typeof data !== 'object') return false;

  // Check executive_summary (CEO, CFO, Executive Summary dashboards)
  if (data.executive_summary) {
    const es = data.executive_summary;
    if (es.total_revenue > 0 || es.net_profit !== 0 || es.total_assets > 0) return true;
  }

  // Check financial_summary (CFO, Balance Sheet dashboards)
  if (data.financial_summary) {
    const fs = data.financial_summary;
    if (fs.total_assets > 0 || fs.total_liabilities > 0 || fs.net_worth !== 0) return true;
  }

  // Check sales_summary (Sales dashboard)
  if (data.sales_summary) {
    const ss = data.sales_summary;
    if (ss.total_sales > 0 || ss.total_revenue > 0) return true;
  }

  // Check inventory data
  if (data.inventory_summary) {
    const inv = data.inventory_summary;
    if (inv.total_value > 0 || inv.total_items > 0) return true;
  }
  if (data.total_stock_value > 0) return true;

  // Check AP/AR summaries
  if (data.ap_summary?.total_payables > 0) return true;
  if (data.ar_summary?.total_receivables > 0) return true;

  // Check budget summary
  if (data.budget_summary) {
    const bs = data.budget_summary;
    if (bs.budget_revenue > 0 || bs.actual_revenue > 0) return true;
  }

  // Check expense summary
  if (data.expense_summary?.total_expenses > 0) return true;

  // Check customer summary
  if (data.customer_summary?.total_customers > 0) return true;

  // Check compliance
  if (data.compliance_score > 0) return true;

  // Check cash flow
  if (data.opening_balance !== undefined || data.closing_balance !== undefined) return true;
  if (data.operating_cash_flow !== undefined) return true;

  // Check balance sheet
  if (data.balance_sheet?.total_assets > 0) return true;

  // Check for arrays with data
  if (data.top_5_revenue_sources?.length > 0) return true;
  if (data.top_5_expense_categories?.length > 0) return true;
  if (data.top_customers?.length > 0) return true;
  if (data.top_products?.length > 0) return true;
  if (data.top_debtors?.length > 0) return true;
  if (data.top_creditors?.length > 0) return true;
  if (data.ledgers?.length > 0) return true;
  if (data.expense_breakdown?.length > 0) return true;

  // Check root level values
  if (data.total_revenue > 0 || data.revenue > 0) return true;
  if (data.total_sales > 0) return true;
  if (data.total_assets > 0) return true;
  if (data.total_liabilities > 0) return true;
  if (data.total_expenses > 0 || data.total_expense > 0) return true;
  if (data.total_payables > 0) return true;
  if (data.total_receivables > 0) return true;
  if (data.net_profit !== undefined && data.net_profit !== 0) return true;
  if (data.net_worth !== undefined && data.net_worth !== 0) return true;

  return false;
};

/**
 * Extract common metrics from dashboard data
 * @param {object} data - Dashboard data
 * @returns {object} - Normalized metrics
 */
export const extractMetrics = (data) => {
  if (!data) return {};

  const es = data.executive_summary || {};
  const fs = data.financial_summary || {};
  const ss = data.sales_summary || {};

  return {
    revenue: es.total_revenue || fs.total_revenue || ss.total_revenue || ss.total_sales || data.total_revenue || data.revenue || 0,
    expenses: es.total_expenses || es.total_expense || fs.total_expenses || data.total_expenses || data.expenses || 0,
    profit: es.net_profit || fs.net_profit || data.net_profit || data.profit || 0,
    assets: fs.total_assets || data.total_assets || 0,
    liabilities: fs.total_liabilities || data.total_liabilities || 0,
    netWorth: fs.net_worth || data.net_worth || 0,
    profitMargin: es.profit_margin_percent || data.profit_margin || 0,
    growthRate: es.growth_rate || data.growth_rate || 0
  };
};

export default {
  loadDashboardData,
  hasDashboardData,
  extractMetrics,
  extractDataFromResponse
};
