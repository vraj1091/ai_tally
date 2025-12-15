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
  
  // If no key fields specified, check if object has any non-zero numeric values
  if (keyFields.length === 0) {
    const values = Object.values(data);
    return values.some(val => {
      if (typeof val === 'number') return val !== 0;
      if (Array.isArray(val)) return val.length > 0;
      if (typeof val === 'object' && val !== null) return hasRealData(val);
      return false;
    });
  }
  
  // Check specified key fields
  for (const field of keyFields) {
    const value = data[field];
    if (typeof value === 'number' && value !== 0) return true;
    if (Array.isArray(value) && value.length > 0) return true;
    if (typeof value === 'object' && value !== null && hasRealData(value)) return true;
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

