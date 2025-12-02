import React, { useState, useEffect } from 'react';
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
  const [ledgers, setLedgers] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('overview'); // overview, ledgers, vouchers, analytics
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [voucherType, setVoucherType] = useState('all');
  const [amountRange, setAmountRange] = useState({ min: '', max: '' });
  const [selectedLedger, setSelectedLedger] = useState(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      fetchCompanyData();
    }
  }, [selectedCompany]);

  const fetchCompanies = async () => {
    try {
      const response = await tallyApi.getCompanies();
      setCompanies(response.companies || []);
      if (response.companies?.length > 0) {
        setSelectedCompany(response.companies[0].name);
      }
    } catch (error) {
      toast.error('Failed to fetch companies');
    }
  };

  const fetchCompanyData = async () => {
    setLoading(true);
    try {
      // Fetch ledgers
      const ledgerResponse = await tallyApi.getLedgers(selectedCompany, false);
      setLedgers(ledgerResponse.ledgers || []);

      // Fetch vouchers
      const voucherResponse = await tallyApi.getVouchers(selectedCompany, null, null, null, null, false);
      setVouchers(voucherResponse.vouchers || []);
      
      toast.success(`Loaded data for ${selectedCompany}`);
    } catch (error) {
      toast.error('Failed to fetch company data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await fetchCompanyData();
  };

  // Calculate analytics
  const getAnalytics = () => {
    const totalDebit = ledgers.reduce((sum, l) => sum + (parseFloat(l.opening_balance) > 0 ? parseFloat(l.opening_balance) : 0), 0);
    const totalCredit = ledgers.reduce((sum, l) => sum + (parseFloat(l.opening_balance) < 0 ? Math.abs(parseFloat(l.opening_balance)) : 0), 0);
    const totalVouchers = vouchers.length;
    
    // Voucher type distribution
    const voucherTypes = vouchers.reduce((acc, v) => {
      acc[v.voucher_type] = (acc[v.voucher_type] || 0) + 1;
      return acc;
    }, {});

    // Top ledgers by balance
    const topLedgers = [...ledgers]
      .sort((a, b) => Math.abs(parseFloat(b.opening_balance)) - Math.abs(parseFloat(a.opening_balance)))
      .slice(0, 10);

    return {
      totalDebit,
      totalCredit,
      totalVouchers,
      voucherTypes,
      topLedgers
    };
  };

  const analytics = getAnalytics();

  // Filter functions
  const filteredLedgers = ledgers.filter(ledger => {
    if (searchTerm && !ledger.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (amountRange.min && Math.abs(parseFloat(ledger.opening_balance)) < parseFloat(amountRange.min)) return false;
    if (amountRange.max && Math.abs(parseFloat(ledger.opening_balance)) > parseFloat(amountRange.max)) return false;
    return true;
  });

  const filteredVouchers = vouchers.filter(voucher => {
    if (searchTerm && !voucher.voucher_number?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (voucherType !== 'all' && voucher.voucher_type !== voucherType) return false;
    if (dateRange.from && new Date(voucher.date) < new Date(dateRange.from)) return false;
    if (dateRange.to && new Date(voucher.date) > new Date(dateRange.to)) return false;
    return true;
  });

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
          <p className="text-sm mt-2 opacity-90">{ledgers.filter(l => parseFloat(l.opening_balance) > 0).length} ledgers</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <FiTrendingUp className="w-8 h-8" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Total Credit</span>
          </div>
          <p className="text-3xl font-bold">₹{(analytics.totalCredit / 10000000).toFixed(2)}Cr</p>
          <p className="text-sm mt-2 opacity-90">{ledgers.filter(l => parseFloat(l.opening_balance) < 0).length} ledgers</p>
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
          <p className="text-3xl font-bold">{ledgers.length}</p>
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
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Opening Balance</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredLedgers.map((ledger, idx) => (
              <tr key={idx} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{ledger.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{ledger.parent || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span className={`font-semibold ${parseFloat(ledger.opening_balance) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{Math.abs(parseFloat(ledger.opening_balance) || 0).toLocaleString('en-IN')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    parseFloat(ledger.opening_balance) >= 0 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {parseFloat(ledger.opening_balance) >= 0 ? 'Debit' : 'Credit'}
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
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-4 bg-gray-50 text-sm text-gray-600 text-center">
        Showing {filteredLedgers.length} of {ledgers.length} ledgers
      </div>
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
        {filteredVouchers.map((voucher, idx) => (
          <div key={idx} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-semibold text-gray-900">{voucher.voucher_number || 'N/A'}</h4>
                <p className="text-sm text-gray-600">{voucher.voucher_type}</p>
              </div>
              <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                {new Date(voucher.date).toLocaleDateString('en-IN')}
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
                  <span className="font-medium text-gray-900">{voucher.party_name}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="p-4 bg-gray-50 text-sm text-gray-600 text-center border-t">
        Showing {filteredVouchers.length} of {vouchers.length} vouchers
      </div>
    </div>
  );

  if (loading && !ledgers.length) {
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
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {companies.map((company, idx) => (
                <option key={idx} value={company.name}>{company.name}</option>
              ))}
            </select>
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

