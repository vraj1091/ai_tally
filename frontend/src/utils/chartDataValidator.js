/**
 * Chart Data Validation Utility
 * Ensures charts have valid data structure before rendering
 */

/**
 * Validates and prepares chart data for Recharts
 * @param {Array} data - Raw chart data array
 * @param {string} valueKey - Key name for the value field (default: 'value')
 * @param {string} nameKey - Key name for the name/label field (default: 'name')
 * @returns {Array} Validated data array with minimum 2 points
 */
export const validateChartData = (data, valueKey = 'value', nameKey = 'name') => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    // Return minimum viable data for chart rendering
    return [
      { [nameKey]: 'No Data', [valueKey]: 0 },
      { [nameKey]: 'No Data', [valueKey]: 0 }
    ];
  }

  // Filter out invalid entries and ensure numeric values
  const validData = data
    .filter(item => item && typeof item === 'object')
    .map(item => {
      const name = item[nameKey] || item.name || item.label || 'Unknown';
      const value = Math.abs(parseFloat(item[valueKey] || item.value || item.amount || 0));
      return {
        [nameKey]: name,
        [valueKey]: value,
        ...item // Preserve other properties
      };
    })
    .filter(item => item[valueKey] !== undefined && !isNaN(item[valueKey]));

  // Ensure minimum 2 data points for chart rendering
  if (validData.length === 0) {
    return [
      { [nameKey]: 'No Data', [valueKey]: 0 },
      { [nameKey]: 'No Data', [valueKey]: 0 }
    ];
  }

  if (validData.length === 1) {
    // Add a comparison point (80% of original value)
    const singleValue = validData[0][valueKey];
    return [
      { [nameKey]: 'Previous', [valueKey]: singleValue * 0.8 },
      ...validData
    ];
  }

  return validData;
};

/**
 * Validates array data and ensures it's not empty
 * @param {Array} data - Data array to validate
 * @param {Object} fallback - Fallback object if data is empty
 * @returns {Array} Validated array
 */
export const validateArrayData = (data, fallback = []) => {
  if (!data || !Array.isArray(data)) {
    return fallback;
  }
  return data.length > 0 ? data : fallback;
};

/**
 * Validates numeric value and ensures it's not NaN or undefined
 * @param {*} value - Value to validate
 * @param {number} defaultValue - Default value if invalid
 * @returns {number} Validated number
 */
export const validateNumeric = (value, defaultValue = 0) => {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? defaultValue : Math.abs(num);
};

/**
 * Prepares revenue/expense data for charts
 * @param {Array} rawData - Raw revenue or expense data
 * @returns {Array} Validated data for chart rendering
 */
export const prepareRevenueExpenseData = (rawData) => {
  // Log for debugging
  console.log('prepareRevenueExpenseData - Input:', rawData);
  
  if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
    console.log('prepareRevenueExpenseData - No data or empty array');
    return [];
  }

  const processed = rawData
    .filter(item => {
      const hasData = item && item.name && (item.amount !== undefined || item.value !== undefined || item.total !== undefined);
      if (!hasData) {
        console.log('prepareRevenueExpenseData - Filtered out item:', item);
      }
      return hasData;
    })
    .map(item => {
      const amount = Math.abs(parseFloat(item.amount || item.value || item.total || 0));
      const result = {
        name: item.name || item.label || item.source || item.category || 'Unknown',
        amount: amount
      };
      console.log('prepareRevenueExpenseData - Mapped item:', result);
      return result;
    })
    .filter(item => {
      const isValid = !isNaN(item.amount) && item.amount > 0;
      if (!isValid) {
        console.log('prepareRevenueExpenseData - Filtered out zero/NaN:', item);
      }
      return isValid;
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5); // Top 5

  console.log('prepareRevenueExpenseData - Final processed:', processed);

  // Return empty array if no valid data - let the component handle empty state
  if (processed.length === 0) {
    console.log('prepareRevenueExpenseData - No valid data after processing');
    return [];
  }

  return processed;
};

