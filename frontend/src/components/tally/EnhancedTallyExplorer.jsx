import React, { useState, useEffect, useMemo } from 'react';
import { tallyApi } from '../../api/tallyApi';
import toast from 'react-hot-toast';
import {
  FiSearch, FiFilter, FiDownload, FiRefreshCw, FiEye,
  FiTrendingUp, FiTrendingDown, FiCalendar,
  FiFileText, FiCheckCircle, FiAlertCircle, FiClock,
  FiUploadCloud, FiX, FiDatabase
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

  // Upload functionality
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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

          const voucherResponse = await tallyApi.getVouchers(selectedCompany, null, 1000);
          setAllVouchers(voucherResponse.vouchers || []);
          setTotalCounts(prev => ({ ...prev, vouchers: (voucherResponse.vouchers || []).length }));
          toast.success(`Loaded ${sortedLedgers.length} ledgers & ${voucherResponse.vouchers?.length || 0} vouchers`);
        } catch (e) {
          console.error('Live fetch error:', e);
          toast.error('Failed to load live data');
          setAllLedgers([]);
          setAllVouchers([]);
        }
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to fetch company data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setAllLedgers([]);
    setAllVouchers([]);
    fetchCompanyData();
  };

  const handleFileUpload = async () => {
    if (!uploadFile) {
      toast.error('Please select a file first');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const response = await tallyApi.uploadBackupFile(uploadFile, (percent) => {
        setUploadProgress(percent);
      });

      if (response.success) {
        toast.success(`✓ ${response.message || 'Backup uploaded successfully'}`);
        setUploadFile(null);
        setUploadProgress(0);
        setShowUploadModal(false);
        // Refresh companies list
        fetchCompanies();
      } else {
        toast.error(response.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Error uploading backup file');
    } finally {
      setUploading(false);
    }
  };

  // Analytics calculations
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

    const voucherTypes = allVouchers.reduce((acc, v) => {
      acc[v.voucher_type] = (acc[v.voucher_type] || 0) + 1;
      return acc;
    }, {});

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
      <div className="flex items-center justify-between px-6 py-4" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)' }}>
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Showing {startItem} - {endItem} of {totalItems.toLocaleString()} entries
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="px-3 py-2 rounded-lg btn-ghost text-sm"
          >
            First
          </button>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-2 rounded-lg btn-ghost text-sm"
          >
            Prev
          </button>
          <span className="px-4 py-2 rounded-lg font-medium text-sm text-white" style={{ background: 'var(--primary)' }}>
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-2 rounded-lg btn-ghost text-sm"
          >
            Next
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="px-3 py-2 rounded-lg btn-ghost text-sm"
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

  // Overview Dashboard with Advanced Design
  const OverviewView = () => {
    // Generate sparkline data for stat cards
    const sparklineData = [
      { value: 30 }, { value: 45 }, { value: 42 }, { value: 55 }, { value: 51 }, { value: 68 }, { value: 72 }
    ];

    const formatCurrency = (v) => {
      const abs = Math.abs(v || 0);
      if (abs >= 10000000) return `₹${(abs / 10000000).toFixed(2)}Cr`;
      if (abs >= 100000) return `₹${(abs / 100000).toFixed(2)}L`;
      if (abs >= 1000) return `₹${(abs / 1000).toFixed(2)}K`;
      return `₹${abs.toFixed(0)}`;
    };

    return (
      <div className="space-y-6">
        {/* Hero Card with Summary */}
        <div className="card p-8" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)', border: 'none' }}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-white">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)' }}>
                <FiDatabase className="w-10 h-10" />
              </div>
              <div>
                <p className="text-sm opacity-80 uppercase tracking-wider">Tally Data Explorer</p>
                <p className="text-3xl font-bold">{selectedCompany}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${dataSource === 'live' ? 'bg-green-400/20 text-green-300' : 'bg-cyan-400/20 text-cyan-300'}`}>
                    {dataSource === 'live' ? '🟢 Live Connection' : '📁 Backup Data'}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div className="px-6 py-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <p className="text-3xl font-bold">{allLedgers.length.toLocaleString()}</p>
                <p className="text-sm opacity-80 mt-1">Ledgers</p>
              </div>
              <div className="px-6 py-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <p className="text-3xl font-bold">{allVouchers.length.toLocaleString()}</p>
                <p className="text-sm opacity-80 mt-1">Vouchers</p>
              </div>
              <div className="px-6 py-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <p className="text-3xl font-bold">{Object.keys(analytics.voucherTypes).length}</p>
                <p className="text-sm opacity-80 mt-1">Types</p>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Debit Card */}
          <div className="stat-card" style={{ borderLeftColor: '#3b82f6' }}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Total Debit</p>
                <p className="text-2xl font-bold" style={{ color: '#3b82f6' }}>{formatCurrency(analytics.totalDebit)}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{allLedgers.filter(l => parseFloat(l.closing_balance || l.opening_balance || 0) > 0).length} ledgers</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>
                  <RupeeIcon className="w-5 h-5" style={{ color: '#3b82f6' }} />
                </div>
                <ResponsiveContainer width={60} height={30}>
                  <LineChart data={sparklineData}>
                    <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Total Credit Card */}
          <div className="stat-card" style={{ borderLeftColor: '#10b981' }}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Total Credit</p>
                <p className="text-2xl font-bold" style={{ color: '#10b981' }}>{formatCurrency(analytics.totalCredit)}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{allLedgers.filter(l => parseFloat(l.closing_balance || l.opening_balance || 0) < 0).length} ledgers</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
                  <FiTrendingUp className="w-5 h-5" style={{ color: '#10b981' }} />
                </div>
                <ResponsiveContainer width={60} height={30}>
                  <LineChart data={sparklineData.map((d, i) => ({ value: d.value + (i * 3) }))}>
                    <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Vouchers Card */}
          <div className="stat-card" style={{ borderLeftColor: '#8b5cf6' }}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Vouchers</p>
                <p className="text-2xl font-bold" style={{ color: '#8b5cf6' }}>{analytics.totalVouchers.toLocaleString()}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{Object.keys(analytics.voucherTypes).length} types</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139, 92, 246, 0.15)' }}>
                  <FiFileText className="w-5 h-5" style={{ color: '#8b5cf6' }} />
                </div>
                <ResponsiveContainer width={60} height={30}>
                  <LineChart data={sparklineData.map((d, i) => ({ value: 40 + (i * 5) }))}>
                    <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Total Ledgers Card */}
          <div className="stat-card" style={{ borderLeftColor: '#f59e0b' }}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Total Ledgers</p>
                <p className="text-2xl font-bold" style={{ color: '#f59e0b' }}>{allLedgers.length.toLocaleString()}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Active accounts</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
                  <FiCheckCircle className="w-5 h-5" style={{ color: '#f59e0b' }} />
                </div>
                <ResponsiveContainer width={60} height={30}>
                  <LineChart data={sparklineData.map((d, i) => ({ value: 50 + (i * 2) }))}>
                    <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Voucher Type Distribution - Enhanced */}
          <div className="chart-card">
            <div className="chart-card-header">
              <div>
                <h3 className="chart-card-title">Voucher Type Distribution</h3>
                <p className="chart-card-subtitle">Breakdown by transaction type</p>
              </div>
              <span className="badge badge-purple">{Object.keys(analytics.voucherTypes).length} Types</span>
            </div>
            {Object.keys(analytics.voucherTypes).length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <defs>
                    {COLORS.map((color, i) => (
                      <linearGradient key={i} id={`pieGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={1} />
                        <stop offset="100%" stopColor={color} stopOpacity={0.7} />
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie
                    data={Object.entries(analytics.voucherTypes).map(([name, value]) => ({ name, value }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                    paddingAngle={3}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    labelLine={{ stroke: 'var(--text-muted)', strokeWidth: 1 }}
                  >
                    {Object.keys(analytics.voucherTypes).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`url(#pieGrad${index % COLORS.length})`} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <div className="text-center">
                  <FiFileText className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                  <p style={{ color: 'var(--text-muted)' }}>No voucher data available</p>
                </div>
              </div>
            )}
          </div>

          {/* Top 10 Ledgers - Enhanced */}
          <div className="chart-card">
            <div className="chart-card-header">
              <div>
                <h3 className="chart-card-title">Top 10 Ledgers by Balance</h3>
                <p className="chart-card-subtitle">Highest value accounts</p>
              </div>
              <span className="badge badge-blue">Top 10</span>
            </div>
            {analytics.topLedgers.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={analytics.topLedgers.map(l => ({
                    name: l.name.length > 12 ? l.name.substring(0, 12) + '...' : l.name,
                    balance: Math.abs(parseFloat(l.closing_balance || l.opening_balance || 0))
                  }))}
                  layout="vertical"
                  margin={{ left: 20, right: 40 }}
                >
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={true} vertical={false} />
                  <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickFormatter={(v) => formatCurrency(v)} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} width={100} />
                  <Tooltip
                    formatter={(value) => [`${formatCurrency(value)}`, 'Balance']}
                    contentStyle={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <Bar dataKey="balance" fill="url(#barGrad)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <div className="text-center">
                  <RupeeIcon className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                  <p style={{ color: 'var(--text-muted)' }}>No ledger data available</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(analytics.voucherTypes).slice(0, 4).map(([type, count], i) => (
            <div key={type} className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${COLORS[i % COLORS.length]}20` }}>
                <FiFileText className="w-5 h-5" style={{ color: COLORS[i % COLORS.length] }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{type}</p>
                <p className="text-lg font-bold" style={{ color: COLORS[i % COLORS.length] }}>{count}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Ledgers View
  const LedgersView = () => (
    <div className="card">
      {/* Filters */}
      <div className="p-6" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search ledgers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-neon pl-10 w-full"
              />
            </div>
          </div>
          <input
            type="number"
            placeholder="Min Amount"
            value={amountRange.min}
            onChange={(e) => setAmountRange({ ...amountRange, min: e.target.value })}
            className="input-neon w-32"
          />
          <input
            type="number"
            placeholder="Max Amount"
            value={amountRange.max}
            onChange={(e) => setAmountRange({ ...amountRange, max: e.target.value })}
            className="input-neon w-32"
          />
          <button
            onClick={() => exportToCSV(filteredLedgers, 'ledgers')}
            className="btn-ghost flex items-center gap-2"
          >
            <FiDownload className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-color)' }}>
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Ledger Name</th>
              <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Group</th>
              <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Balance</th>
              <th className="px-6 py-4 text-center text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Type</th>
              <th className="px-6 py-4 text-center text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedLedgers.map((ledger, idx) => {
              const balance = parseFloat(ledger.closing_balance || ledger.opening_balance || 0);
              const isDebit = balance >= 0;
              return (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }} className="hover:bg-secondary/50 transition-colors">
                  <td className="px-6 py-4" style={{ color: 'var(--text-primary)' }}>{ledger.name}</td>
                  <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-muted)' }}>{ledger.parent || 'N/A'}</td>
                  <td className="px-6 py-4 text-right font-semibold" style={{ color: isDebit ? '#10b981' : '#ef4444' }}>
                    ₹{Math.abs(balance).toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`badge text-xs ${isDebit ? 'badge-green' : 'badge-red'}`}>
                      {isDebit ? 'Debit' : 'Credit'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => setSelectedLedger(ledger)}
                      className="btn-ghost-sm flex items-center gap-1 mx-auto"
                    >
                      <FiEye className="w-4 h-4" />
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {paginatedLedgers.length === 0 && (
        <div className="p-12 text-center">
          <FiAlertCircle className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
          <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No ledgers found</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Try adjusting your filters</p>
        </div>
      )}

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
    <div className="card">
      {/* Filters */}
      <div className="p-6" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search vouchers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-neon pl-10 w-full"
              />
            </div>
          </div>
          <select
            value={voucherType}
            onChange={(e) => setVoucherType(e.target.value)}
            className="input-neon"
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
            className="input-neon"
          />
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
            className="input-neon"
          />
          <button
            onClick={() => exportToCSV(filteredVouchers, 'vouchers')}
            className="btn-ghost flex items-center gap-2"
          >
            <FiDownload className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-color)' }}>
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Voucher #</th>
              <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Type</th>
              <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Date</th>
              <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Amount</th>
              <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Ledger</th>
            </tr>
          </thead>
          <tbody>
            {paginatedVouchers.map((voucher, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }} className="hover:bg-secondary/50 transition-colors">
                <td className="px-6 py-4 font-medium" style={{ color: 'var(--text-primary)' }}>{voucher.voucher_number}</td>
                <td className="px-6 py-4">
                  <span className="badge badge-blue text-xs">{voucher.voucher_type}</span>
                </td>
                <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                  {new Date(voucher.date).toLocaleDateString('en-IN')}
                </td>
                <td className="px-6 py-4 text-right font-semibold" style={{ color: 'var(--text-primary)' }}>
                  ₹{Math.abs(parseFloat(voucher.amount || 0)).toLocaleString('en-IN')}
                </td>
                <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-muted)' }}>{voucher.ledger_name || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {paginatedVouchers.length === 0 && (
        <div className="p-12 text-center">
          <FiAlertCircle className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
          <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No vouchers found</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Try adjusting your filters</p>
        </div>
      )}

      <Pagination
        currentPage={voucherPage}
        totalPages={totalVoucherPages}
        onPageChange={setVoucherPage}
        totalItems={filteredVouchers.length}
        itemsPerPage={ITEMS_PER_PAGE}
      />
    </div>
  );

  if (companies.length === 0 && !loading) {
    return (
      <div className="space-y-6 animate-fade-up">
        <div className="card p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
            <FiDatabase className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>No Companies Found</h3>
          <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
            Connect to Tally or upload a backup file to get started
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="btn-primary px-6 py-3 flex items-center gap-2 mx-auto"
          >
            <FiUploadCloud className="w-5 h-5" />
            Upload Backup File
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="card p-6" style={{ border: '1px solid var(--border-color)' }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Enhanced Tally Explorer</h1>
            <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Advanced analytics and real-time insights</p>
            {selectedCompany && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Loaded data for {selectedCompany}</span>
                <span className={`badge text-xs ${dataSource === 'live' ? 'badge-green' : 'badge-cyan'}`}>
                  {dataSource === 'live' ? '🟢 Live' : '📁 Backup'}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={selectedCompany}
              onChange={(e) => {
                setSelectedCompany(e.target.value);
                const company = companies.find(c => c.name === e.target.value);
                setDataSource(company?.source || 'live');
                setAllLedgers([]);
                setAllVouchers([]);
              }}
              className="input-neon"
              style={{ minWidth: '200px' }}
            >
              {companies.map((company, idx) => (
                <option key={idx} value={company.name}>
                  {company.name} {company.source === 'live' ? '🟢' : '📁'}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn-ghost flex items-center gap-2"
            >
              <FiUploadCloud className="w-4 h-4" />
              Upload
            </button>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 card p-2">
        {['overview', 'ledgers', 'vouchers'].map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex-1 px-4 py-3 rounded-lg font-medium capitalize transition-all ${view === v ? 'text-white' : ''
              }`}
            style={{
              background: view === v ? 'var(--gradient-primary)' : 'transparent',
              color: view === v ? 'white' : 'var(--text-secondary)'
            }}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Content */}
      {view === 'overview' && <OverviewView />}
      {view === 'ledgers' && <LedgersView />}
      {view === 'vouchers' && <VouchersView />}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !uploading && setShowUploadModal(false)}>
          <div className="card max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
                  <FiUploadCloud className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Upload Backup File</h3>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Supports .xml, .tbk, .zip files</p>
                </div>
              </div>
              {!uploading && (
                <button onClick={() => setShowUploadModal(false)} className="p-2 hover:bg-secondary rounded-lg transition-colors">
                  <FiX className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Select File
                </label>
                <input
                  type="file"
                  accept=".xml,.tbk,.zip"
                  onChange={(e) => setUploadFile(e.target.files?.[0])}
                  disabled={uploading}
                  className="input-neon w-full"
                />
              </div>

              {uploadFile && (
                <div className="p-4 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{uploadFile.name}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {(uploadFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              )}

              {uploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: 'var(--text-secondary)' }}>Uploading...</span>
                    <span className="font-semibold" style={{ color: 'var(--primary)' }}>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${uploadProgress}%`,
                        background: 'var(--gradient-primary)'
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleFileUpload}
                  disabled={!uploadFile || uploading}
                  className="btn-primary flex-1 py-3 flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <FiUploadCloud className="w-5 h-5" />
                      Upload & Process
                    </>
                  )}
                </button>
                {!uploading && (
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="btn-ghost px-6 py-3"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ledger Detail Modal */}
      {selectedLedger && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedLedger(null)}>
          <div className="card max-w-2xl w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{selectedLedger.name}</h3>
            <div className="space-y-3">
              <div className="flex justify-between py-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Group:</span>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedLedger.parent || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Opening Balance:</span>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>₹{parseFloat(selectedLedger.opening_balance || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between py-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Type:</span>
                <span className={`font-semibold ${parseFloat(selectedLedger.opening_balance) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {parseFloat(selectedLedger.opening_balance) >= 0 ? 'Debit' : 'Credit'}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedLedger(null)}
              className="mt-6 w-full btn-primary py-3"
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
