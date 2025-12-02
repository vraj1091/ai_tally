import { useState, useEffect, useCallback } from 'react';
import { tallyApi } from '../api/tallyApi';
import apiClient from '../api/client';
import toast from 'react-hot-toast';

/**
 * Custom hook to fetch real Tally data for dashboards
 * Supports both live Tally data and backup file data
 * @param {string} dataSource - 'live' or 'backup'
 * Returns companies, selected company, analytics, ledgers, and helper functions
 */
export const useTallyData = (dataSource = 'live') => {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [ledgers, setLedgers] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [error, setError] = useState(null);

  // Load companies on mount OR when data source changes
  useEffect(() => {
    loadCompanies();
  }, [dataSource]);

  // Load data when company changes
  useEffect(() => {
    if (selectedCompany) {
      loadCompanyData();
    }
  }, [selectedCompany, dataSource]);

  const loadCompanies = async () => {
    try {
      setError(null);
      let response;
      
      if (dataSource === 'backup') {
        // Load from backup
        response = await tallyApi.getBackupCompanies();
      } else {
        // Load from live Tally
        response = await tallyApi.getCompanies();
      }
      
      const companyList = response.companies || response.data?.companies || [];
      
      if (companyList.length > 0) {
        setCompanies(companyList);
        setSelectedCompany(companyList[0].name);
      } else {
        setCompanies([]);
        if (dataSource === 'backup') {
          setError('No backup data available. Please upload a .tbk file.');
        } else {
          setError('No companies found in Tally');
        }
        setLoading(false);
      }
    } catch (error) {
      console.error('Failed to load companies:', error);
      if (dataSource === 'backup') {
        setError('No backup data available. Please upload a .tbk file.');
      } else {
        setError('Failed to connect to Tally. Please ensure Tally is running and Gateway is enabled.');
      }
      setCompanies([]);
      setLoading(false);
      // Show error toast (react-hot-toast automatically prevents duplicates)
      const message = dataSource === 'backup' ? 'No backup data available' : 'Failed to connect to Tally';
      toast.error(message, { id: 'company-error' });
    }
  };

  const loadCompanyData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`🔄 Loading ${dataSource.toUpperCase()} data for company: ${selectedCompany}`);
      
      let allDataRes;
      
      if (dataSource === 'backup') {
        // Load from backup
        allDataRes = await tallyApi.getBackupData(selectedCompany);
      } else {
        // Use the COMPREHENSIVE endpoint to fetch ALL data at once from live Tally
        allDataRes = await tallyApi.getAllCompanyData(selectedCompany, true);
      }
      
      // Extract all data types
      const ledgersData = allDataRes.ledgers || [];
      const vouchersData = allDataRes.vouchers || [];
      const stockItemsData = allDataRes.stock_items || [];
      const summaryData = allDataRes.summary || {};
      
      setLedgers(ledgersData);
      setVouchers(vouchersData);
      setStockItems(stockItemsData);
      
      console.log(`✅ COMPREHENSIVE DATA LOADED:`);
      console.log(`   - Source: ${dataSource}`);
      console.log(`   - Ledgers: ${ledgersData.length}`);
      console.log(`   - Vouchers: ${vouchersData.length}`);
      console.log(`   - Stock Items: ${stockItemsData.length}`);
      if (dataSource === 'live') {
        console.log(`   - Connected: ${allDataRes.connected}`);
        console.log(`   - Message: ${allDataRes.message}`);
      }
      
      // Show toast with data status
      if (dataSource === 'backup') {
        toast.success(`📦 Backup data loaded: ${ledgersData.length} ledgers, ${vouchersData.length} vouchers, ${stockItemsData.length} stock items`);
      } else if (allDataRes.connected) {
        toast.success(`✓ Live data loaded: ${ledgersData.length} ledgers, ${vouchersData.length} vouchers, ${stockItemsData.length} stock items`);
      } else {
        toast.success(`📦 Cached data loaded: ${ledgersData.length} ledgers, ${vouchersData.length} vouchers`);
      }
      
      // Fetch analytics separately (may not be available for all companies)
      if (dataSource === 'live') {
        try {
          const analyticsRes = await apiClient.get(`/analytics/company/${encodeURIComponent(selectedCompany)}`);
          setAnalytics(analyticsRes?.data?.data || analyticsRes?.data || summaryData);
          console.log('   - Analytics: loaded');
        } catch (analyticsError) {
          console.warn('   - Analytics: not available, using summary');
          setAnalytics(summaryData);
        }
      } else {
        // For backup, use enhanced summary data (includes revenue, expense, profit, etc.)
        // The summary from backup endpoint already has comprehensive analytics
        setAnalytics(summaryData);
        console.log('   - Backup analytics: using summary data with', Object.keys(summaryData).length, 'fields');
      }
      
    } catch (error) {
      console.error('❌ Error loading company data:', error);
      setError(`Failed to load data for ${selectedCompany}`);
      toast.error(`Error: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const refresh = useCallback(() => {
    if (selectedCompany) {
      toast.success('Refreshing data...');
      loadCompanyData();
    } else {
      loadCompanies();
    }
  }, [selectedCompany]);

  // Format currency in Indian rupee format
  const formatCurrency = (value) => {
    const absValue = Math.abs(value || 0);
    if (absValue >= 10000000) return `₹${(absValue / 10000000).toFixed(2)}Cr`;
    if (absValue >= 100000) return `₹${(absValue / 100000).toFixed(2)}L`;
    if (absValue >= 1000) return `₹${(absValue / 1000).toFixed(2)}K`;
    return `₹${absValue.toFixed(0)}`;
  };

  // Get top ledgers by closing balance
  const getTopLedgers = (count = 10, type = 'all') => {
    let filtered = ledgers;
    
    if (type === 'revenue') {
      filtered = ledgers.filter(l => parseFloat(l.closing_balance || 0) > 0);
    } else if (type === 'expense') {
      filtered = ledgers.filter(l => parseFloat(l.closing_balance || 0) < 0);
    }

    return filtered
      .sort((a, b) => Math.abs(parseFloat(b.closing_balance || 0)) - Math.abs(parseFloat(a.closing_balance || 0)))
      .slice(0, count)
      .map(l => ({
        name: l.name,
        value: Math.abs(parseFloat(l.closing_balance || 0)),
        balance: parseFloat(l.closing_balance || 0),
        parent: l.parent
      }));
  };

  // Get vouchers by type
  const getVouchersByType = () => {
    const voucherTypes = {};
    vouchers.forEach(v => {
      const type = v.voucher_type || v.voucherType || 'Other';
      voucherTypes[type] = (voucherTypes[type] || 0) + 1;
    });

    return Object.entries(voucherTypes).map(([name, value]) => ({
      name,
      value
    }));
  };

  // Calculate metrics from analytics or ledgers
  const getMetrics = () => {
    if (analytics) {
      // Use analytics data (from summary for backup, or full analytics for live)
      return {
        revenue: analytics.total_revenue || analytics.revenue || 0,
        expense: analytics.total_expense || analytics.expense || 0,
        profit: analytics.net_profit || analytics.profit || 0,
        margin: analytics.profit_margin || analytics.margin || 0,
        assets: analytics.total_assets || analytics.assets || 0,
        liabilities: analytics.total_liabilities || analytics.liabilities || 0,
        equity: analytics.total_equity || analytics.equity || 0,
        healthScore: analytics.health_score || analytics.healthScore || 0,
        healthStatus: analytics.health_status || analytics.healthStatus || 'Good'
      };
    }
    
    // Fallback: Calculate from ledgers if analytics not available
    // Try multiple balance field names
    const getBalance = (ledger) => {
      return parseFloat(ledger.closing_balance || 
                       ledger.current_balance || 
                       ledger.balance || 
                       ledger.opening_balance || 0);
    };
    
    const revenue = ledgers
      .filter(l => getBalance(l) > 0)
      .reduce((sum, l) => sum + getBalance(l), 0);
    
    const expense = Math.abs(ledgers
      .filter(l => getBalance(l) < 0)
      .reduce((sum, l) => sum + getBalance(l), 0));
    
    const profit = revenue - expense;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    return {
      revenue,
      expense,
      profit,
      margin,
      assets: 0,
      liabilities: 0,
      equity: 0,
      healthScore: 0,
      healthStatus: 'Calculated from Ledgers'
    };
  };

  return {
    loading,
    companies,
    selectedCompany,
    setSelectedCompany,
    analytics,
    ledgers,
    vouchers,
    stockItems,
    error,
    dataSource,
    refresh,
    formatCurrency,
    getTopLedgers,
    getVouchersByType,
    getMetrics,
    hasData: companies.length > 0 && (ledgers.length > 0 || vouchers.length > 0)
  };
};
