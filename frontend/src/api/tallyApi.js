import apiClient from './client'

// Local Tally Proxy URL (runs on user's machine)
const LOCAL_TALLY_PROXY = 'http://localhost:8765';

// Get auth token from localStorage (user sets this from proxy console)
const getTallyAuthToken = () => localStorage.getItem('tallyAuthToken') || '';

// Set auth token (called from settings)
export const setTallyAuthToken = (token) => localStorage.setItem('tallyAuthToken', token);

// Direct Tally connection functions (via local proxy)
const directTally = {
  /**
   * Test direct connection to local Tally via proxy
   */
  async testConnection() {
    try {
      const response = await fetch(`${LOCAL_TALLY_PROXY}/status`, {
        method: 'GET',
        timeout: 5000
      });
      if (response.ok) {
        const statusData = await response.json();
        const isSecure = statusData.secure || false;
        const authRequired = statusData.auth_required || false;
        
        // Proxy is running, now test Tally
        const xmlRequest = `<ENVELOPE>
          <HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>Test</ID></HEADER>
          <BODY><DESC><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES>
          <TDL><TDLMESSAGE><COLLECTION NAME="Test"><TYPE>Company</TYPE><FETCH>Name</FETCH></COLLECTION></TDLMESSAGE></TDL>
          </DESC></BODY></ENVELOPE>`;
        
        const headers = { 'Content-Type': 'application/xml' };
        
        // Add auth token if secure proxy
        if (authRequired) {
          const token = getTallyAuthToken();
          if (!token) {
            return { 
              connected: false, 
              message: 'Secure proxy requires authentication token. Go to Settings → Set Tally Auth Token',
              needsToken: true
            };
          }
          headers['X-Tally-Auth'] = token;
        }
        
        const tallyResponse = await fetch(LOCAL_TALLY_PROXY, {
          method: 'POST',
          headers,
          body: xmlRequest
        });
        
        if (tallyResponse.status === 401) {
          return { 
            connected: false, 
            message: 'Invalid authentication token. Check the token shown in proxy console.',
            needsToken: true
          };
        }
        
        if (tallyResponse.ok) {
          const text = await tallyResponse.text();
          if (text.length > 50 && text.includes('COMPANY')) {
            const secureMsg = isSecure ? ' (Secure mode)' : '';
            return { connected: true, message: `✓ Connected to Tally via local proxy!${secureMsg}` };
          }
        }
        return { connected: false, message: `Proxy running but cannot reach Tally at ${statusData.tally_url}. Ensure Tally is open with Gateway enabled.` };
      }
    } catch (error) {
      return { 
        connected: false, 
        message: 'Local proxy not running. Run "python tally_proxy.py" or "python secure_tally_proxy.py"',
        needsProxy: true
      };
    }
    return { connected: false, message: 'Connection test failed' };
  },

  /**
   * Get headers with optional auth token
   */
  getHeaders() {
    const headers = { 'Content-Type': 'application/xml' };
    const token = getTallyAuthToken();
    if (token) {
      headers['X-Tally-Auth'] = token;
    }
    return headers;
  },

  /**
   * Get companies directly from Tally
   */
  async getCompanies() {
    const xmlRequest = `<ENVELOPE>
      <HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>CompanyList</ID></HEADER>
      <BODY><DESC><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES>
      <TDL><TDLMESSAGE><COLLECTION NAME="CompanyList"><TYPE>Company</TYPE><FETCH>NAME, STARTINGFROM, ENDINGAT</FETCH></COLLECTION></TDLMESSAGE></TDL>
      </DESC></BODY></ENVELOPE>`;
    
    const response = await fetch(LOCAL_TALLY_PROXY, {
      method: 'POST',
      headers: this.getHeaders(),
      body: xmlRequest
    });
    
    if (response.status === 401) {
      throw new Error('Authentication failed. Check your Tally Auth Token in Settings.');
    }
    
    const text = await response.text();
    return parseCompaniesXml(text);
  },

  /**
   * Get ledgers for a company directly from Tally
   */
  async getLedgers(companyName) {
    const xmlRequest = `<ENVELOPE>
      <HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>LedgerList</ID></HEADER>
      <BODY><DESC><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT><SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY></STATICVARIABLES>
      <TDL><TDLMESSAGE><COLLECTION NAME="LedgerList"><TYPE>Ledger</TYPE><FETCH>NAME, PARENT, CLOSINGBALANCE</FETCH></COLLECTION></TDLMESSAGE></TDL>
      </DESC></BODY></ENVELOPE>`;
    
    const response = await fetch(LOCAL_TALLY_PROXY, {
      method: 'POST',
      headers: this.getHeaders(),
      body: xmlRequest
    });
    
    if (response.status === 401) {
      throw new Error('Authentication failed. Check your Tally Auth Token in Settings.');
    }
    
    const text = await response.text();
    return parseLedgersXml(text);
  },

  /**
   * Get vouchers for a company directly from Tally
   */
  async getVouchers(companyName, fromDate, toDate) {
    const xmlRequest = `<ENVELOPE>
      <HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>VoucherList</ID></HEADER>
      <BODY><DESC><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT><SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>
      <SVFROMDATE>${fromDate}</SVFROMDATE><SVTODATE>${toDate}</SVTODATE></STATICVARIABLES>
      <TDL><TDLMESSAGE><COLLECTION NAME="VoucherList"><TYPE>Voucher</TYPE><FETCH>DATE, VOUCHERNUMBER, VOUCHERTYPENAME, AMOUNT</FETCH></COLLECTION></TDLMESSAGE></TDL>
      </DESC></BODY></ENVELOPE>`;
    
    const response = await fetch(LOCAL_TALLY_PROXY, {
      method: 'POST',
      headers: this.getHeaders(),
      body: xmlRequest
    });
    
    if (response.status === 401) {
      throw new Error('Authentication failed. Check your Tally Auth Token in Settings.');
    }
    
    const text = await response.text();
    return parseVouchersXml(text);
  }
};

// XML Parsing helpers
function escapeXml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function parseCompaniesXml(xml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const companies = [];
  doc.querySelectorAll('COMPANY').forEach(node => {
    companies.push({
      name: node.querySelector('NAME')?.textContent || '',
      financial_year_start: node.querySelector('STARTINGFROM')?.textContent || '',
      financial_year_end: node.querySelector('ENDINGAT')?.textContent || ''
    });
  });
  return companies;
}

function parseLedgersXml(xml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const ledgers = [];
  doc.querySelectorAll('LEDGER').forEach(node => {
    ledgers.push({
      name: node.querySelector('NAME')?.textContent || '',
      parent: node.querySelector('PARENT')?.textContent || '',
      closing_balance: parseFloat(node.querySelector('CLOSINGBALANCE')?.textContent) || 0
    });
  });
  return ledgers;
}

function parseVouchersXml(xml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const vouchers = [];
  doc.querySelectorAll('VOUCHER').forEach(node => {
    vouchers.push({
      date: node.querySelector('DATE')?.textContent || '',
      voucher_number: node.querySelector('VOUCHERNUMBER')?.textContent || '',
      voucher_type: node.querySelector('VOUCHERTYPENAME')?.textContent || '',
      amount: parseFloat(node.querySelector('AMOUNT')?.textContent) || 0
    });
  });
  return vouchers;
}

// Helper function for retry with fallback
const withRetryAndFallback = async (primaryFn, fallbackFn, maxRetries = 2) => {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await primaryFn();
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${i + 1}/${maxRetries} failed:`, error.message);
      if (i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 1000)); // Wait 1s before retry
      }
    }
  }
  // All retries failed, try fallback if available
  if (fallbackFn) {
    console.log('🔄 Primary failed, trying fallback...');
    return await fallbackFn();
  }
  throw lastError;
};

export const tallyApi = {
  // Direct Tally connection (via local proxy)
  direct: directTally,
  
  // Retry helper exposed for external use
  withRetry: withRetryAndFallback,
  
  // Configure Tally connection
  configureConnection: async (connectionType, serverUrl = null, port = 9000) => {
    try {
      console.log('🌐 API: Sending POST to /tally/connect')
      console.log('   Payload:', { connection_type: connectionType, server_url: serverUrl, port: port })
      
      const response = await apiClient.post('/tally/connect', {
        connection_type: connectionType,
        server_url: serverUrl,
        port: port
      })
      
      console.log('📥 API: Response received:', response.data)
      return { success: true, data: response.data }
    } catch (error) {
      console.error('❌ API: Request failed:', error)
      console.error('   Response:', error.response?.data)
      console.error('   Status:', error.response?.status)
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Connection failed'
      }
    }
  },

  // Connect to Tally (Legacy)
  connect: async (url) => {
    try {
      const response = await apiClient.post('/tally/connect', { url })
      return response.data
    } catch (error) {
      throw error
    }
  },

  // ==================== BRIDGE API (Cloud to Local) ====================
  
  // Get bridge status - route: /api/bridge/{token}/status
  getBridgeStatus: async (userToken = 'user_tally_bridge') => {
    try {
      console.log('🌉 Checking bridge status for:', userToken)
      const response = await apiClient.get(`/bridge/${userToken}/status`)
      console.log('🌉 Bridge status:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ Bridge status error:', error)
      return { connected: false, error: error.message }
    }
  },

  // List all connected bridges - route: /api/bridge/bridges
  listBridges: async () => {
    try {
      const response = await apiClient.get('/bridge/bridges')
      return response.data
    } catch (error) {
      console.error('❌ List bridges error:', error)
      return { bridges: [] }
    }
  },

  // Get companies via bridge - route: /api/bridge/{token}/companies
  getCompaniesViaBridge: async (userToken = 'user_tally_bridge') => {
    try {
      console.log('🌉 Getting companies via bridge:', userToken)
      const response = await apiClient.get(`/bridge/${userToken}/companies`)
      console.log('🌉 Companies via bridge:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ Bridge companies error:', error)
      throw error
    }
  },

  // Send Tally request via bridge - route: /api/bridge/{token}/tally
  sendViaBridge: async (userToken = 'user_tally_bridge', xmlRequest) => {
    try {
      console.log('🌉 Sending request via bridge:', userToken)
      const response = await apiClient.post(`/bridge/${userToken}/tally`, {
        payload: xmlRequest,
        headers: { 'Content-Type': 'text/xml' },
        timeout: 60
      })
      return response.data
    } catch (error) {
      console.error('❌ Bridge request error:', error)
      throw error
    }
  },

  // Helper to check if Bridge mode is active
  isBridgeMode: () => {
    return localStorage.getItem('tally_connection_type') === 'BRIDGE';
  },

  // Get bridge token
  getBridgeToken: () => {
    return localStorage.getItem('tally_bridge_token') || 'user_tally_bridge';
  },

  // Get all companies - supports both Bridge and Direct modes
  getCompanies: async (tallyUrl = null, useCache = true) => {
    try {
      // Check if Bridge mode is active
      const connectionType = localStorage.getItem('tally_connection_type');
      const bridgeToken = localStorage.getItem('tally_bridge_token') || 'user_tally_bridge';
      
      if (connectionType === 'BRIDGE') {
        console.log('🌉 Fetching companies via Bridge...');
        try {
          const bridgeResponse = await apiClient.get(`/bridge/${bridgeToken}/companies`);
          if (bridgeResponse.data && bridgeResponse.data.companies) {
            console.log('✅ Bridge companies:', bridgeResponse.data.companies.length);
            return bridgeResponse.data;
          }
        } catch (bridgeError) {
          console.warn('Bridge companies failed, trying direct...', bridgeError.message);
        }
      }
      
      // Direct mode or Bridge fallback
      const params = { source: 'live' };
      if (tallyUrl) params.tally_url = tallyUrl;
      params.use_cache = useCache;

      console.log('🔄 Fetching companies from live Tally...');
      const response = await apiClient.get('/tally/companies', { 
        params,
        timeout: 30000
      });
      console.log('✅ Live Tally companies:', response.data);
      return response.data;
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout - Tally may be slow or not responding.');
      }
      throw error;
    }
  },

  // Get ledgers - works with backup data
  getLedgers: async (companyName, tallyUrl = null, useCache = true) => {
    try {
      const params = { source: 'auto' };
      if (tallyUrl) params.tally_url = tallyUrl;
      params.use_cache = useCache;

      const response = await apiClient.get(`/tally/ledgers/${encodeURIComponent(companyName)}`, { 
        params,
        timeout: 60000  // 60 seconds for large datasets
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching ledgers:', error);
      throw error;
    }
  },

  // Get vouchers - works with backup data
  getVouchers: async (companyName, fromDate, toDate, voucherType, tallyUrl = null, useCache = true) => {
    try {
      const params = {
        from_date: fromDate,
        to_date: toDate,
        voucher_type: voucherType,
        use_cache: useCache,
        source: 'auto'
      };
      if (tallyUrl) params.tally_url = tallyUrl;

      const response = await apiClient.get(`/tally/vouchers/${encodeURIComponent(companyName)}`, { 
        params,
        timeout: 120000  // 2 minutes for large voucher datasets
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching vouchers:', error);
      throw error;
    }
  },

  // Get connection status - supports Bridge and Direct modes
  getStatus: async (tallyUrl = null) => {
    try {
      // Check if Bridge mode is active
      const connectionType = localStorage.getItem('tally_connection_type');
      const bridgeToken = localStorage.getItem('tally_bridge_token') || 'user_tally_bridge';
      
      if (connectionType === 'BRIDGE') {
        console.log('🌉 Checking status via Bridge...');
        try {
          const bridgeStatus = await apiClient.get(`/bridge/${bridgeToken}/status`, { timeout: 10000 });
          if (bridgeStatus.data && bridgeStatus.data.connected) {
            return {
              connected: bridgeStatus.data.tally_connected || false,
              is_connected: bridgeStatus.data.tally_connected || false,
              via_bridge: true,
              bridge_connected: true,
              message: bridgeStatus.data.tally_connected ? 'Connected via Bridge' : 'Bridge connected, Tally not available'
            };
          }
        } catch (bridgeError) {
          console.warn('Bridge status failed:', bridgeError.message);
        }
      }
      
      // Direct mode or Bridge fallback
      const params = {}
      if (tallyUrl) params.tally_url = tallyUrl

      const response = await apiClient.get('/tally/status', { 
        params,
        timeout: 5000  // 5 second timeout - should be fast
      })
      return response.data
    } catch (error) {
      // Return default status instead of throwing - allows app to work without Tally
      if (error.response?.status === 404) {
        // Endpoint not found - return disconnected status
        return {
          success: false,
          connected: false,
          is_connected: false,
          message: "Tally status endpoint not available - using backup mode",
          connection_type: "unknown"
        }
      }
      // For other errors, return disconnected status
      return {
        success: false,
        connected: false,
        is_connected: false,
        message: error.message || "Unable to check Tally status",
        connection_type: "unknown"
      }
    }
  },

  // Get financial summary
  getSummary: async (companyName, tallyUrl = null, useCache = true) => {
    try {
      const params = {}
      if (tallyUrl) params.tally_url = tallyUrl
      params.use_cache = useCache

      const response = await apiClient.get(`/tally/summary/${encodeURIComponent(companyName)}`, { params })
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Get ALL data for a company (ledgers, vouchers, stock items, summary) - COMPREHENSIVE
  getAllCompanyData: async (companyName, useCache = true) => {
    try {
      const params = { use_cache: useCache }
      const response = await apiClient.get(`/tally/all-data/${encodeURIComponent(companyName)}`, { params })
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Get stock items
  getStockItems: async (companyName, tallyUrl = null, useCache = true) => {
    try {
      const params = {}
      if (tallyUrl) params.tally_url = tallyUrl
      params.use_cache = useCache

      const response = await apiClient.get(`/tally/stock-items/${encodeURIComponent(companyName)}`, { params })
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Get connection info
  getConnectionInfo: async () => {
    try {
      const response = await apiClient.get('/tally/connection/info')
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Get cache info
  getCacheInfo: async () => {
    try {
      const response = await apiClient.get('/tally/cache/info')
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Clear cache
  clearCache: async (cacheKey = null) => {
    try {
      const params = {}
      if (cacheKey) params.cache_key = cacheKey

      const response = await apiClient.delete('/tally/cache', { params })
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Refresh companies from Tally (use when you change company in Tally)
  refreshCompanies: async () => {
    try {
      const response = await apiClient.post('/tally/refresh-companies', {}, {
        timeout: 30000  // 30 seconds
      })
      return response.data
    } catch (error) {
      console.error("Error refreshing companies:", error)
      throw error
    }
  },

  // Full refresh (clear cache and fetch fresh data)
  fullRefresh: async () => {
    try {
      const response = await apiClient.post('/tally/refresh', {}, {
        timeout: 120000  // 2 minutes for full refresh
      })
      return response.data
    } catch (error) {
      console.error("Error during full refresh:", error)
      throw error
    }
  },

  // Generic dashboard fetch with auto-retry and fallback
  fetchDashboard: async (endpoint, companyName, source = 'live', refresh = false, maxRetries = 2) => {
    const url = `/dashboards/${endpoint}/${encodeURIComponent(companyName)}?source=${source}&refresh=${refresh}`;
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`📊 Fetching ${endpoint} dashboard (attempt ${attempt + 1}/${maxRetries}, source=${source})...`);
        const response = await apiClient.get(url, { timeout: 60000 });
        return response.data;
      } catch (error) {
        lastError = error;
        console.warn(`⚠️ ${endpoint} dashboard attempt ${attempt + 1} failed:`, error.message);
        
        // If live mode failed and we have retries left, wait before retry
        if (attempt < maxRetries - 1) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }
    
    // All retries failed - try backup mode as fallback if we were in live mode
    if (source === 'live') {
      console.log(`🔄 Live mode failed, trying backup mode for ${endpoint}...`);
      try {
        const backupUrl = `/dashboards/${endpoint}/${encodeURIComponent(companyName)}?source=backup&refresh=${refresh}`;
        const response = await apiClient.get(backupUrl, { timeout: 60000 });
        console.log(`✅ ${endpoint} loaded from backup (auto-fallback)`);
        // Mark the response as coming from fallback
        if (response.data) {
          response.data._autoFallback = true;
        }
        return response.data;
      } catch (backupError) {
        console.error(`❌ Both live and backup failed for ${endpoint}`);
      }
    }
    
    throw lastError;
  },

  // Specialized Dashboards - Now using generic fetch with retry
  getCEODashboardData: async (companyName, source = 'live', refresh = false) => {
    return tallyApi.fetchDashboard('ceo', companyName, source, refresh);
  },

  getSalesDashboardData: async (companyName, source = 'live', refresh = false) => {
    return tallyApi.fetchDashboard('sales', companyName, source, refresh);
  },

  getCFODashboardData: async (companyName, source = 'live', refresh = false) => {
    return tallyApi.fetchDashboard('cfo', companyName, source, refresh);
  },

  getCashFlowDashboardData: async (companyName, source = 'live', refresh = false) => {
    return tallyApi.fetchDashboard('cashflow', companyName, source, refresh);
  },

  getInventoryDashboardData: async (companyName, source = 'live', refresh = false) => {
    return tallyApi.fetchDashboard('inventory', companyName, source, refresh);
  },

  // Backup file management - supports files up to 2GB
  uploadBackupFile: async (file, onProgress = null) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // File size in MB for logging
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      console.log(`Uploading file: ${file.name} (${fileSizeMB} MB)`);
      
      // Calculate timeout based on file size
      // Base: 5 minutes + 2 minutes per 100MB
      const baseTimeout = 5 * 60 * 1000; // 5 minutes
      const sizeBasedTimeout = Math.ceil(file.size / (100 * 1024 * 1024)) * 2 * 60 * 1000; // 2 min per 100MB
      const timeout = Math.min(baseTimeout + sizeBasedTimeout, 60 * 60 * 1000); // Max 1 hour
      
      console.log(`Upload timeout set to ${timeout / 60000} minutes`);
      
      const response = await apiClient.post('/backup/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: timeout,
        maxContentLength: 2 * 1024 * 1024 * 1024,  // 2GB
        maxBodyLength: 2 * 1024 * 1024 * 1024,     // 2GB
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percentCompleted, progressEvent.loaded, progressEvent.total);
          }
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error uploading backup file:", error);
      if (error.code === 'ECONNABORTED') {
        throw new Error('Upload timeout - for very large files (>1GB), the server may need more time to process. Please wait and try again.');
      }
      if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        throw new Error('Network error during upload. This can happen with very large files. Check your connection and try again.');
      }
      throw error;
    }
  },

  getBackupCompanies: async () => {
    try {
      console.log('🔄 Fetching backup companies from API...');
      const response = await apiClient.get('/backup/companies', {
        timeout: 60000  // 60 seconds - cache file can be large
      });
      console.log('✅ Backup companies response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching backup companies:', error);
      // Silently handle errors to prevent console spam
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        // Return empty result instead of throwing error
        return {
          success: false,
          companies: [],
          source: "backup",
          message: "Request timeout - please try again"
        };
      }
      // Return empty result for any error to prevent UI blocking
      return {
        success: false,
        companies: [],
        source: "backup",
        error: error.message || "Unknown error",
        message: "Error fetching backup companies. Please try again."
      };
    }
  },

  getBackupData: async (companyName) => {
    try {
      console.log(`📦 Fetching backup data for: ${companyName}`);
      const response = await apiClient.get(`/backup/data/${encodeURIComponent(companyName)}`);
      console.log('📦 Backup data response:', {
        success: response.data?.success,
        hasLedgers: !!response.data?.ledgers,
        ledgerCount: response.data?.ledgers?.length || 0,
        voucherCount: response.data?.vouchers?.length || 0
      });
      // Return the response data directly - it contains ledgers, vouchers at root level
      return response.data;
    } catch (error) {
      console.error("Error fetching backup data:", error);
      // Return error response instead of throwing to allow graceful handling
      if (error.response?.status === 404) {
        return {
          success: false,
          error: 'No backup data found for this company',
          ledgers: [],
          vouchers: [],
          stock_items: []
        };
      }
      throw error;
    }
  },

  clearBackupData: async () => {
    try {
      const response = await apiClient.delete('/backup/clear');
      return response.data;
    } catch (error) {
      console.error("Error clearing backup data:", error);
      throw error;
    }
  }
}

export default tallyApi;