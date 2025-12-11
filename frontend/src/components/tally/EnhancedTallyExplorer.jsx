import React, { useState, useEffect, useMemo } from 'react';
import { tallyApi } from '../../api/tallyApi';
import toast from 'react-hot-toast';
import {
  FiSearch, FiFilter, FiDownload, FiRefreshCw, FiEye,
  FiTrendingUp, FiTrendingDown, FiCalendar,
  FiFileText, FiCheckCircle, FiAlertCircle, FiClock
} from 'react-icons/fi';
import RupeeIcon from '../common/RupeeIcon';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const EnhancedTallyExplorer = () => {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [allLedgers, setAllLedgers] = useState([]); // All ledgers data
  const [allVouchers, setAllVouchers] = useState([]); // All vouchers data
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('overview'); // overview, ledgers, vouchers, analytics
  const [dataSource, setDataSource] = useState('live'); // 'live' or 'backup'
  const [totalCounts, setTotalCounts] = useState({ ledgers: 0, vouchers: 0 });
  
  // Pagination
  const [ledgerPage, setLedgerPage] = useState(1);
  const [voucherPage, setVoucherPage] = useState(1);
  const ITEMS_PER_PAGE = 50;
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [voucherType, setVoucherType] = useState('all');
  const [amountRange, setAmountRange] = useState({ min: '', max: '' });
  const [selectedLedger, setSelectedLedger] = useState(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  // Auto-fetch on company change - wait for companies to be loaded first
  useEffect(() => {
    if (selectedCompany && companies.length > 0 && allLedgers.length === 0 && !loading) {
      // Only fetch if companies are loaded and no data loaded yet
      fetchCompanyData();
    }
  }, [selectedCompany, companies.length]);

  const fetchCompanies = async () => {
    try {
      let allCompanies = [];
      
      // Try live Tally first
      try {
        const liveResponse = await tallyApi.getCompanies();
        if (liveResponse.companies?.length > 0) {
          const liveCompanies = liveResponse.companies.map(c => ({
            ...c,
            name: c.name || c,
            source: 'live'
          }));
          allCompanies = [...liveCompanies];
        }
      } catch (e) {
        console.warn('Live Tally not available');
      }
      
      // Also get backup companies
      try {
        const backupResponse = await tallyApi.getBackupCompanies();
        if (backupResponse.companies?.length > 0) {
          const backupCompanies = backupResponse.companies
            .filter(c => !allCompanies.some(live => live.name === (c.name || c)))
            .map(c => ({
              ...c,
              name: c.name || c,
              source: 'backup'
            }));
          allCompanies = [...allCompanies, ...backupCompanies];
        }
      } catch (e) {
        console.warn('Backup data not available');
      }
      
      setCompanies(allCompanies);
      if (allCompanies.length > 0) {
        const liveCompany = allCompanies.find(c => c.source === 'live');
        const selected = liveCompany || allCompanies[0];
        setSelectedCompany(selected.name);
        setDataSource(selected.source);
      }
    } catch (error) {
      toast.error('Failed to fetch companies');
    }
  };

  const fetchCompanyData = async () => {
    if (loading) return; // Prevent multiple requests
    
    setLoading(true);
    setLedgerPage(1);
    setVoucherPage(1);
    
    try {
      const company = companies.find(c => c.name === selectedCompany);
      const source = company?.source || 'live';
      
      console.log(`🔍 fetchCompanyData: company=${selectedCompany}, source=${source}, companiesLoaded=${companies.length}`);
      console.log('🔍 Available companies:', companies.map(c => `${c.name} (${c.source})`).join(', '));
      
      setDataSource(source);
      
      if (source === 'backup') {
        // Fetch from backup - get all data
        try {
          const backupResponse = await tallyApi.getBackupData(selectedCompany);
          // Backend returns data at root level, not wrapped in .data
          if (backupResponse.success || backupResponse.ledgers) {
            // Sort by balance
            const sortedLedgers = (backupResponse.ledgers || [])
              .sort((a, b) => Math.abs(b.closing_balance || b.opening_balance || 0) - Math.abs(a.closing_balance || a.opening_balance || 0));
            setAllLedgers(sortedLedgers);
            setAllVouchers(backupResponse.vouchers || []);
            setTotalCounts({ 
              ledgers: sortedLedgers.length, 
              vouchers: (backupResponse.vouchers || []).length 
            });
            toast.success(`Loaded ${sortedLedgers.length} ledgers for ${selectedCompany}`);
          } else {
            console.warn('Backup response had no data:', backupResponse);
            toast.error('No backup data found for this company');
            setAllLedgers([]);
            setAllVouchers([]);
          }
        } catch (e) {
          console.error('Backup fetch error:', e);
          toast.error('Failed to load backup data');
          setAllLedgers([]);
          setAllVouchers([]);
        }
      } else {
        // Fetch from live Tally
        try {
          const ledgerResponse = await tallyApi.getLedgers(selectedCompany, null, false);
          const sortedLedgers = (ledgerResponse.ledgers || [])
            .sort((a, b) => Math.abs(b.closing_balance || b.opening_balance || 0) - Math.abs(a.closing_balance || a.opening_balance || 0));
          setAllLedgers(sortedLedgers);
          setTotalCounts(prev => ({ ...prev, ledgers: sortedLedgers.length }));
        } catch (e) {
          console.error('Ledger fetch error:', e);
          setAllLedgers([]);
        }

        try {
          const voucherResponse = await tallyApi.getVouchers(selectedCompany, null, null, null, null, false);
          setAllVouchers(voucherResponse.vouchers || []);
          setTotalCounts(prev => ({ ...prev, vouchers: (voucherResponse.vouchers || []).length }));
        } catch (e) {
          console.error('Voucher fetch error:', e);
          setAllVouchers([]);
        }
        
        toast.success(`Loaded data for ${selectedCompany}`);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to fetch company data');
      setAllLedgers([]);
      setAllVouchers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await fetchCompanyData();
  };

  // Calculate analytics - memoized for performance
  const analytics = useMemo(() => {
    const totalDebit = allLedgers.reduce((sum, l) => {
      const bal = parseFloat(l.closing_balance || l.opening_balance || 0);
      return sum + (bal > 0 ? bal : 0);
    }, 0);
    const totalCredit = allLedgers.reduce((sum, l) => {
      const bal = parseFloat(l.closing_balance || l.opening_balance || 0);
      return sum + (bal < 0 ? Math.abs(bal) : 0);
    }, 0);
    const totalVouchers = allVouchers.length;
    
    // Voucher type distribution
    const voucherTypes = allVouchers.reduce((acc, v) => {
      acc[v.voucher_type || 'Unknown'] = (acc[v.voucher_type || 'Unknown'] || 0) + 1;
      return acc;
    }, {});

    // Top ledgers by balance (already sorted from fetch)
    const topLedgers = allLedgers.slice(0, 10);

    return {
      totalDebit,
      totalCredit,
      totalVouchers,
      voucherTypes,
      topLedgers
    };
  }, [allLedgers, allVouchers]);

  // Reset pagination when filters change
  useEffect(() => {
    setLedgerPage(1);
  }, [searchTerm, amountRange]);

  useEffect(() => {
    setVoucherPage(1);
  }, [searchTerm, voucherType, dateRange]);

  // Filter functions - memoized for performance
  const filteredLedgers = useMemo(() => {
    return allLedgers.filter(ledger => {
      if (searchTerm && !ledger.name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      const bal = Math.abs(parseFloat(ledger.closing_balance || ledger.opening_balance || 0));
      if (amountRange.min && bal < parseFloat(amountRange.min)) return false;
      if (amountRange.max && bal > parseFloat(amountRange.max)) return false;
      return true;
    });
  }, [allLedgers, searchTerm, amountRange]);

  const filteredVouchers = useMemo(() => {
    return allVouchers.filter(voucher => {
      if (searchTerm && !voucher.voucher_number?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (voucherType !== 'all' && voucher.voucher_type !== voucherType) return false;
      if (dateRange.from && new Date(voucher.date) < new Date(dateRange.from)) return false;
      if (dateRange.to && new Date(voucher.date) > new Date(dateRange.to)) return false;
      return true;
    });
  }, [allVouchers, searchTerm, voucherType, dateRange]);

  // Paginated data
  const paginatedLedgers = useMemo(() => {
    const start = (ledgerPage - 1) * ITEMS_PER_PAGE;
    return filteredLedgers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredLedgers, ledgerPage]);

  const paginatedVouchers = useMemo(() => {
    const start = (voucherPage - 1) * ITEMS_PER_PAGE;
    return filteredVouchers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredVouchers, voucherPage]);

  const totalLedgerPages = Math.ceil(filteredLedgers.length / ITEMS_PER_PAGE);
  const totalVoucherPages = Math.ceil(filteredVouchers.length / ITEMS_PER_PAGE);

  // Pagination Component
  const Pagination = ({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage }) => {
    if (totalPages <= 1) return null;
    
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);
    
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t">
        <div className="text-sm text-gray-600">
          Showing {startItem} - {endItem} of {totalItems.toLocaleString()} entries
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="px-3 py-1 rounded border bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            First
          </button>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 rounded border bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Prev
          </button>
          <span className="px-3 py-1 bg-blue-600 text-white rounded font-medium">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 rounded border bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 rounded border bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Last
          </button>
        </div>
      </div>
    );
  };

  // Export to CSV
  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(',')).join('\n');
    const csv = `${headers}\n${rows}`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Exported successfully!');
  };

  // Overview Dashboard
  const OverviewView = () => (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <RupeeIcon className="w-8 h-8" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Total Debit</span>
          </div>
          <p className="text-3xl font-bold">₹{(analytics.totalDebit / 10000000).toFixed(2)}Cr</p>
          <p className="text-sm mt-2 opacity-90">{allLedgers.filter(l => parseFloat(l.closing_balance || l.opening_balance || 0) > 0).length} ledgers</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <FiTrendingUp className="w-8 h-8" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Total Credit</span>
          </div>
          <p className="text-3xl font-bold">₹{(analytics.totalCredit / 10000000).toFixed(2)}Cr</p>
          <p className="text-sm mt-2 opacity-90">{allLedgers.filter(l => parseFloat(l.closing_balance || l.opening_balance || 0) < 0).length} ledgers</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <FiFileText className="w-8 h-8" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Vouchers</span>
          </div>
          <p className="text-3xl font-bold">{analytics.totalVouchers}</p>
          <p className="text-sm mt-2 opacity-90">{Object.keys(analytics.voucherTypes).length} types</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <FiCheckCircle className="w-8 h-8" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Total Ledgers</span>
          </div>
          <p className="text-3xl font-bold">{allLedgers.length}</p>
          <p className="text-sm mt-2 opacity-90">Active accounts</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Voucher Type Distribution */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Voucher Type Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={Object.entries(analytics.voucherTypes).map(([type, count]) => ({ name: type, value: count }))}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {Object.entries(analytics.voucherTypes).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top 10 Ledgers */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Top 10 Ledgers by Balance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.topLedgers} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="opening_balance" fill="#3b82f6">
                {analytics.topLedgers.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={parseFloat(entry.opening_balance) >= 0 ? '#10b981' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  // Ledgers View
  const LedgersView = () => (
    <div className="bg-white rounded-xl shadow-lg">
      {/* Filters */}
      <div className="p-4 border-b flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search ledgers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <input
          type="number"
          placeholder="Min amount"
          value={amountRange.min}
          onChange={(e) => setAmountRange({ ...amountRange, min: e.target.value })}
          className="px-4 py-2 border rounded-lg w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="number"
          placeholder="Max amount"
          value={amountRange.max}
          onChange={(e) => setAmountRange({ ...amountRange, max: e.target.value })}
          className="px-4 py-2 border rounded-lg w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => exportToCSV(filteredLedgers, 'ledgers')}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
        >
          <FiDownload className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Ledgers Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ledger Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Group</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedLedgers.map((ledger, idx) => {
              const balance = parseFloat(ledger.closing_balance || ledger.opening_balance || 0);
              return (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{ledger.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{ledger.parent || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className={`font-semibold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₹{Math.abs(balance).toLocaleString('en-IN')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      balance >= 0 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {balance >= 0 ? 'Debit' : 'Credit'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button
                      onClick={() => setSelectedLedger(ledger)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <FiEye className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination
        currentPage={ledgerPage}
        totalPages={totalLedgerPages}
        onPageChange={setLedgerPage}
        totalItems={filteredLedgers.length}
        itemsPerPage={ITEMS_PER_PAGE}
      />
    </div>
  );

  // Vouchers View
  const VouchersView = () => (
    <div className="bg-white rounded-xl shadow-lg">
      {/* Filters */}
      <div className="p-4 border-b flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search vouchers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={voucherType}
          onChange={(e) => setVoucherType(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Types</option>
          {Object.keys(analytics.voucherTypes).map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateRange.from}
          onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="date"
          value={dateRange.to}
          onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => exportToCSV(filteredVouchers, 'vouchers')}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
        >
          <FiDownload className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Vouchers Grid */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginatedVouchers.map((voucher, idx) => (
          <div key={idx} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-semibold text-gray-900">{voucher.voucher_number || 'N/A'}</h4>
                <p className="text-sm text-gray-600">{voucher.voucher_type}</p>
              </div>
              <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                {voucher.date ? new Date(voucher.date).toLocaleDateString('en-IN') : 'N/A'}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-semibold text-gray-900">₹{parseFloat(voucher.amount || 0).toLocaleString('en-IN')}</span>
              </div>
              {voucher.party_name && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Party:</span>
                  <span className="font-medium text-gray-900 truncate max-w-[150px]">{voucher.party_name}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <Pagination
        currentPage={voucherPage}
        totalPages={totalVoucherPages}
        onPageChange={setVoucherPage}
        totalItems={filteredVouchers.length}
        itemsPerPage={ITEMS_PER_PAGE}
      />
    </div>
  );

  if (loading && !allLedgers.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Tally data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Enhanced Tally Explorer</h1>
            <p className="text-gray-600 mt-1">Advanced analytics and real-time insights</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedCompany}
              onChange={(e) => {
                setSelectedCompany(e.target.value);
                const company = companies.find(c => c.name === e.target.value);
                setDataSource(company?.source || 'live');
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {companies.map((company, idx) => (
                <option key={idx} value={company.name}>
                  {company.name} {company.source === 'live' ? '🟢' : '📁'}
                </option>
              ))}
            </select>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              dataSource === 'live' 
                ? 'bg-green-100 text-green-700' 
                : 'bg-amber-100 text-amber-700'
            }`}>
              {dataSource === 'live' ? '🟢 Live' : '📁 Backup'}
            </span>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
            >
              <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 bg-white rounded-xl shadow-lg p-2">
        {['overview', 'ledgers', 'vouchers'].map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex-1 px-4 py-2 rounded-lg font-medium capitalize transition-colors ${
              view === v
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Content */}
      {view === 'overview' && <OverviewView />}
      {view === 'ledgers' && <LedgersView />}
      {view === 'vouchers' && <VouchersView />}

      {/* Ledger Detail Modal */}
      {selectedLedger && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedLedger(null)}>
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-bold mb-4">{selectedLedger.name}</h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Group:</span>
                <span className="font-semibold">{selectedLedger.parent || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Opening Balance:</span>
                <span className="font-semibold">₹{parseFloat(selectedLedger.opening_balance || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Type:</span>
                <span className={`font-semibold ${parseFloat(selectedLedger.opening_balance) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {parseFloat(selectedLedger.opening_balance) >= 0 ? 'Debit' : 'Credit'}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedLedger(null)}
              className="mt-6 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedTallyExplorer;

