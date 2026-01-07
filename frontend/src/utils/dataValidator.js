/**
 * Data Validator - Checks if dashboard has real data or just empty/zero values
 */

/**
 * Check if the dashboard data contains actual values (not just zeros or empty)
 * @param {Object} data - Dashboard data object
 * @param {Array<string>} keyFields - Key fields to check (e.g., ['total_revenue', 'total_sales'])
 * @returns {boolean} - True if has real data, false if empty/zero
 */
export const hasRealData = (data, keyFields = []) => {
  if (!data || typeof data !== 'object') return false;
  
  // Quick check: if object has more than 3 meaningful keys, likely has data
  const meaningfulKeys = Object.keys(data).filter(k => 
    !k.startsWith('_') && 
    k !== 'source' && 
    k !== 'status' && 
    k !== 'message' &&
    k !== 'success' &&
    data[k] !== null && 
    data[k] !== undefined
  );
  
  // Check for any array with data at root level (indicates real data)
  for (const key of meaningfulKeys) {
    const val = data[key];
    if (Array.isArray(val) && val.length > 0) {
      console.log(`[hasRealData] ✅ Found array data in '${key}' with ${val.length} items`);
      return true;
    }
    // Check for any positive numeric value at root
    if (typeof val === 'number' && val > 0) {
      console.log(`[hasRealData] ✅ Found positive value in '${key}': ${val}`);
      return true;
    }
  }
  
  // If no key fields specified, check if object has sufficient structure
  if (keyFields.length === 0) {
    // Check for common dashboard structure objects
    const commonStructures = [
      'executive_summary', 'financial_summary', 'sales_summary', 'sales_overview',
      'key_metrics', 'key_highlights', 'financial_position', 'balance_sheet_summary',
      'income_statement_summary', 'cash_flow_analysis', 'working_capital',
      'live_metrics', 'operational_kpis', 'today_summary', 'performance_indicators'
    ];
    
    for (const structure of commonStructures) {
      if (data[structure] && typeof data[structure] === 'object' && Object.keys(data[structure]).length > 0) {
        console.log(`[hasRealData] ✅ Found structure '${structure}'`);
        return true;
      }
    }
    
    // Fallback: has at least 3 meaningful keys with non-null values
    if (meaningfulKeys.length >= 3) {
      console.log(`[hasRealData] ✅ Has ${meaningfulKeys.length} meaningful keys`);
      return true;
    }
    
    return false;
  }
  
  // Check specified key fields at root level
  for (const field of keyFields) {
    const value = data[field];
    if (typeof value === 'number' && value !== 0) return true;
    if (Array.isArray(value) && value.length > 0) return true;
    if (typeof value === 'object' && value !== null && hasRealData(value)) return true;
  }
  
  // Also check common nested structures (backend returns data in nested objects)
  const nestedKeys = [
    'sales_overview', 'sales_summary', 'financial_summary', 'executive_summary',
    'inventory_summary', 'cash_flow_summary', 'balance_sheet', 'balance_summary',
    'tax_summary', 'compliance_summary', 'budget_summary', 'forecast_summary',
    'customer_summary', 'vendor_summary', 'product_summary', 'expense_summary',
    'revenue_summary', 'receivables_summary', 'payables_summary', 'ar_summary', 'ap_summary',
    'financial_position', 'key_highlights', 'key_metrics', 'performance_indicators'
  ];
  
  for (const nestedKey of nestedKeys) {
    const nestedData = data[nestedKey];
    if (nestedData && typeof nestedData === 'object') {
      // Check if nested object itself has data
      if (Object.keys(nestedData).length > 0) {
        for (const field of keyFields) {
          const value = nestedData[field];
          if (typeof value === 'number' && value !== 0) return true;
          if (Array.isArray(value) && value.length > 0) return true;
        }
        // Even if key fields not found, if nested has content, return true
        const nestedValues = Object.values(nestedData);
        if (nestedValues.some(v => (typeof v === 'number' && v !== 0) || (Array.isArray(v) && v.length > 0))) {
          console.log(`[hasRealData] ✅ Found data in nested '${nestedKey}'`);
          return true;
        }
      }
    }
  }
  
  return false;
};

/**
 * Get safe value without demo fallback
 * Returns 0 or empty array instead of demo data
 */
export const getSafeValue = (value, type = 'number') => {
  if (value === undefined || value === null) {
    return type === 'array' ? [] : 0;
  }
  return value;
};

/**
 * Check if should show empty state for a dashboard
 */
export const shouldShowEmptyState = (dashboardData, keyMetrics = []) => {
  return !hasRealData(dashboardData, keyMetrics);
};

export default {
  hasRealData,
  getSafeValue,
  shouldShowEmptyState
};

