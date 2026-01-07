import React, { useState, useEffect } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import { tallyApi } from '../../api/tallyApi';
import toast from 'react-hot-toast';

/**
 * Universal Dashboard Wrapper
 * Provides company selection and data loading for all 21 dashboards
 * Works with Live, Bridge, and Backup data sources for ANY company
 */
const DashboardWrapper = ({ 
  dataSource = 'live',
  dashboardName = 'Dashboard',
  onDataLoad,
  children
}) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');

  // Load companies when dataSource changes
  useEffect(() => {
    loadCompanies();
  }, [dataSource]);

  // Load dashboard data when company or dataSource changes
  useEffect(() => {
    if (selectedCompany) {
      loadData();
    }
  }, [selectedCompany, dataSource]);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      console.log(`[DashboardWrapper] Loading companies for ${dataSource}`);
      
      let response;
      if (dataSource === 'backup') {
        response = await tallyApi.getBackupCompanies();
      } else if (dataSource === 'bridge') {
        response = await tallyApi.getCompaniesViaBridge();
      } else {
        response = await tallyApi.getCompanies();
      }
      
      // Normalize response - handle different API response formats
      let companyList = [];
      if (response && response.companies) {
        companyList = Array.isArray(response.companies) ? response.companies : [];
      } else if (Array.isArray(response)) {
        companyList = response;
      } else if (response && response.data && response.data.companies) {
        companyList = Array.isArray(response.data.companies) ? response.data.companies : [];
      }
      
      console.log(`[DashboardWrapper] Raw response:`, response);
      console.log(`[DashboardWrapper] Extracted ${companyList.length} companies`);
      
      // Normalize company format - handle both strings and objects
      const normalizedCompanies = companyList.map(company => {
        if (typeof company === 'string') {
          return { name: company };
        } else if (company && company.name) {
          return company;
        } else if (company && typeof company === 'object') {
          return { name: company.name || company.company_name || company.company || String(company) };
        }
        return { name: String(company) };
      });
      
      console.log(`[DashboardWrapper] Normalized companies:`, normalizedCompanies);
      setCompanies(normalizedCompanies);
      
      // Auto-select first company
      if (normalizedCompanies.length > 0) {
        const firstCompanyName = normalizedCompanies[0].name;
        console.log(`[DashboardWrapper] Auto-selecting first company: "${firstCompanyName}"`);
        setSelectedCompany(firstCompanyName);
      } else {
        console.log('[DashboardWrapper] No companies found');
        setSelectedCompany('');
        if (onDataLoad) onDataLoad(null);
      }
      
      setLoading(false);
    } catch (error) {
      console.error(`[DashboardWrapper] Failed to load companies:`, error);
      setCompanies([]);
      setSelectedCompany('');
      if (onDataLoad) onDataLoad(null);
      // Only show error toast for non-backup sources (backup can be empty)
      if (dataSource !== 'backup') {
        toast.error(`Failed to load companies from ${dataSource}`);
      }
      setLoading(false);
    }
  };

  const loadData = async () => {
    if (!selectedCompany) {
      console.log('[DashboardWrapper] No company selected, skipping data load');
      return;
    }
    
    try {
      setRefreshing(true);
      console.log(`[DashboardWrapper] 🔄 Loading data for company: "${selectedCompany}", source: ${dataSource}`);
      
      // Call the parent's data loading function
      if (onDataLoad) {
        console.log(`[DashboardWrapper] 📞 Calling onDataLoad with company: "${selectedCompany}"`);
        await onDataLoad(selectedCompany);
        console.log(`[DashboardWrapper] ✅ onDataLoad completed`);
      } else {
        console.warn('[DashboardWrapper] ⚠️ No onDataLoad function provided!');
      }
      
      setRefreshing(false);
    } catch (error) {
      console.error(`[DashboardWrapper] ❌ Failed to load data:`, error);
      setRefreshing(false);
    }
  };

  const handleCompanyChange = (e) => {
    const newCompany = e.target.value;
    console.log(`[DashboardWrapper] Company changed to: "${newCompany}"`);
    setSelectedCompany(newCompany);
  };

  const handleRefresh = () => {
    console.log(`[DashboardWrapper] Manual refresh triggered`);
    loadData();
  };

  return (
    <div className="space-y-6">
      {/* Company Selector Header - ALWAYS VISIBLE */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
        <div>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {dashboardName}
          </h3>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {selectedCompany ? `Showing data for ${selectedCompany}` : 'Select a company to view data'}
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Company Selector */}
          {loading ? (
            <div className="px-4 py-2 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--primary)' }} />
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading companies...</span>
              </div>
            </div>
          ) : companies.length > 0 ? (
            <>
              <select
                value={selectedCompany}
                onChange={handleCompanyChange}
                className="px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-full sm:w-auto min-w-[200px]"
                style={{ 
                  background: 'var(--bg-tertiary)', 
                  color: 'var(--text-primary)', 
                  borderColor: 'var(--border-color)' 
                }}
                disabled={refreshing}
              >
                {companies.map((company, idx) => (
                  <option key={idx} value={company.name}>
                    {company.name}
                  </option>
                ))}
              </select>
              
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all"
                style={{ 
                  background: refreshing ? 'var(--bg-tertiary)' : 'var(--primary)', 
                  color: 'white',
                  opacity: refreshing ? 0.6 : 1,
                  cursor: refreshing ? 'not-allowed' : 'pointer'
                }}
              >
                <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </>
          ) : (
            <div className="px-4 py-2 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                No companies available for {dataSource} mode
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Dashboard Content */}
      <div>
        {children}
      </div>
    </div>
  );
};

export default DashboardWrapper;

