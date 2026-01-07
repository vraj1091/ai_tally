/**
 * Dashboard Helper - Provides bridge-aware API calls for all dashboards
 */

import apiClient from '../api/client';

// Get bridge token from localStorage
export const getBridgeToken = () => {
  return localStorage.getItem('tally_bridge_token') || 'user_tally_bridge';
};

// Check if bridge mode is active
export const isBridgeMode = (dataSource) => {
  return dataSource === 'bridge';
};

/**
 * Make a dashboard API call with bridge support
 * @param {string} endpoint - Dashboard endpoint (e.g., 'ceo', 'executive-summary')
 * @param {string} companyName - Company name
 * @param {string} dataSource - Data source ('live', 'backup', 'bridge')
 * @param {object} options - Additional options (timeout, etc.)
 * @returns {Promise} API response
 */
export const fetchDashboardData = async (endpoint, companyName, dataSource = 'live', options = {}) => {
  const timeout = options.timeout || 120000;
  
  // Build URL with query params
  let url = `/dashboards/${endpoint}/${encodeURIComponent(companyName)}?source=${dataSource}`;
  
  // Add bridge token if using bridge mode
  if (dataSource === 'bridge') {
    url += `&bridge_token=${getBridgeToken()}`;
    console.log(`📡 Fetching ${endpoint} dashboard via BRIDGE...`);
  }
  
  const response = await apiClient.get(url, { timeout });
  
  if (dataSource === 'bridge') {
    console.log(`✅ Bridge data received for ${endpoint}:`, response.data?.source);
  }
  
  return response;
};

export default {
  getBridgeToken,
  isBridgeMode,
  fetchDashboardData
};

