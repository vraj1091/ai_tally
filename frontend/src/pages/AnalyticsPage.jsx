import { useState, useEffect } from 'react';
import Card from '../components/common/Card';
import apiClient from '../api/client';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { FiRefreshCw as RefreshCcw, FiTrendingUp as TrendingUp, FiTrendingDown as TrendingDown, FiDollarSign as DollarSign, FiAlertCircle as AlertCircle, FiDownload as Download } from 'react-icons/fi';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

const AnalyticsPage = () => {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [multiCompanyData, setMultiCompanyData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState('single'); // 'single' or 'multi'
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      fetchAnalytics(selectedCompany);
    }
  }, [selectedCompany]);

  const fetchCompanies = async () => {
    try {
      let allCompanies = [];
      
      // Try LIVE Tally first
      try {
        const liveResponse = await apiClient.get('/tally/companies', { timeout: 10000 });
        if (liveResponse.data.companies && liveResponse.data.companies.length > 0) {
          const liveCompanies = liveResponse.data.companies.map(c => ({
            ...c,
            name: c.name || c,
            source: 'live'
          }));
          allCompanies = [...allCompanies, ...liveCompanies];
          console.log('✅ Loaded LIVE companies:', liveCompanies.length);
        }
      } catch (liveError) {
        console.warn('Live Tally not available:', liveError.message);
      }
      
      // Also get backup companies
      try {
        const backupResponse = await apiClient.get('/backup/companies');
        if (backupResponse.data.companies && backupResponse.data.companies.length > 0) {
          const backupCompanies = backupResponse.data.companies
            .filter(c => !allCompanies.some(live => live.name === (c.name || c)))
            .map(c => ({
              ...c,
              name: c.name || c,
              source: 'backup'
            }));
          allCompanies = [...allCompanies, ...backupCompanies];
          console.log('✅ Loaded backup companies:', backupCompanies.length);
        }
      } catch (backupError) {
        console.warn('Backup companies not available:', backupError.message);
      }
      
      if (allCompanies.length > 0) {
        setCompanies(allCompanies);
        // Prefer live company as default
        const liveCompany = allCompanies.find(c => c.source === 'live');
        setSelectedCompany(liveCompany ? liveCompany.name : allCompanies[0].name);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const fetchAnalytics = async (companyName, forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      // Find company to determine source
      const company = companies.find(c => c.name === companyName);
      const source = company?.source || 'live';
      
      console.log(`📊 Fetching analytics for ${companyName} (source: ${source})`);
      
      const response = await apiClient.get(`/analytics/company/${encodeURIComponent(companyName)}`, {
        params: { refresh: forceRefresh, source: source },
        timeout: 60000
      });
      
      console.log('📊 Analytics response:', response.data);
      
      if (response.data.success) {
        setAnalytics(response.data.data);
      } else {
        // If live source failed, try backup source automatically
        if (source === 'live') {
          console.log('📊 Live source failed, trying backup...');
          try {
            const backupResponse = await apiClient.get(`/analytics/company/${encodeURIComponent(companyName)}`, {
              params: { refresh: false, source: 'backup' },
              timeout: 60000
            });
            if (backupResponse.data.success) {
              setAnalytics(backupResponse.data.data);
              return;
            }
          } catch (backupError) {
            console.warn('Backup fallback also failed:', backupError);
          }
        }
        setError(response.data.message || 'No data available');
        setAnalytics(null);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      
      // Try backup source as fallback
      const company = companies.find(c => c.name === companyName);
      if (company?.source !== 'backup') {
        console.log('📊 Primary fetch failed, trying backup source...');
        try {
          const backupResponse = await apiClient.get(`/analytics/company/${encodeURIComponent(companyName)}`, {
            params: { refresh: false, source: 'backup' },
            timeout: 60000
          });
          if (backupResponse.data.success) {
            setAnalytics(backupResponse.data.data);
            return;
          }
        } catch (backupError) {
          console.warn('Backup fallback also failed:', backupError);
        }
      }
      
      setError(error.response?.data?.detail || error.response?.data?.message || 'Failed to fetch analytics. Please ensure Tally is connected or upload a backup file.');
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchMultiCompanyAnalytics = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/analytics/multi-company', {
        params: { refresh: forceRefresh }
      });
      
      if (response.data.success) {
        setMultiCompanyData(response.data.data);
      } else {
        setError('Failed to load multi-company data');
      }
    } catch (error) {
      console.error('Error fetching multi-company analytics:', error);
      setError('Failed to fetch multi-company analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    toast.info('Refreshing data from Tally...', { autoClose: 2000 });
    
    try {
      if (view === 'single' && selectedCompany) {
        await fetchAnalytics(selectedCompany, true);
      } else {
        await fetchMultiCompanyAnalytics(true);
      }
      toast.success('✓ Data refreshed successfully!');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const formatCurrency = (value) => {
    return `₹${Math.abs(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const formatNumber = (value) => {
    return (value || 0).toFixed(2);
  };

  const handleExportData = () => {
    if (!analytics) {
      toast.error('No data to export');
      return;
    }

    // Prepare export data
    const exportData = {
      company: analytics.company_name,
      generated_at: new Date().toLocaleString('en-IN'),
      summary: {
        revenue: formatCurrency(analytics.total_revenue),
        expense: formatCurrency(analytics.total_expense),
        profit: formatCurrency(analytics.net_profit),
        assets: formatCurrency(analytics.total_assets),
        liabilities: formatCurrency(analytics.total_liabilities),
        equity: formatCurrency(analytics.total_equity)
      },
      ratios: {
        profit_margin: `${formatNumber(analytics.profit_margin)}%`,
        expense_ratio: `${formatNumber(analytics.expense_ratio)}%`,
        debt_to_equity: formatNumber(analytics.debt_to_equity_ratio),
        equity_ratio: `${formatNumber(analytics.equity_ratio)}%`,
        roa: `${formatNumber(analytics.return_on_assets)}%`,
        roe: `${formatNumber(analytics.return_on_equity)}%`
      },
      health: {
        score: analytics.health_score,
        status: analytics.health_status,
        alerts: analytics.alerts || []
      },
      top_revenue: analytics.top_revenue_ledgers || [],
      top_expense: analytics.top_expense_ledgers || []
    };

    // Create CSV content
    let csvContent = `Financial Analytics Report\n`;
    csvContent += `Company: ${exportData.company}\n`;
    csvContent += `Generated: ${exportData.generated_at}\n\n`;
    csvContent += `SUMMARY\n`;
    csvContent += `Revenue,${exportData.summary.revenue}\n`;
    csvContent += `Expense,${exportData.summary.expense}\n`;
    csvContent += `Profit,${exportData.summary.profit}\n`;
    csvContent += `Assets,${exportData.summary.assets}\n`;
    csvContent += `Liabilities,${exportData.summary.liabilities}\n`;
    csvContent += `Equity,${exportData.summary.equity}\n\n`;
    csvContent += `RATIOS\n`;
    csvContent += `Profit Margin,${exportData.ratios.profit_margin}\n`;
    csvContent += `Expense Ratio,${exportData.ratios.expense_ratio}\n`;
    csvContent += `Return on Assets,${exportData.ratios.roa}\n`;
    csvContent += `Return on Equity,${exportData.ratios.roe}\n\n`;
    csvContent += `HEALTH\n`;
    csvContent += `Score,${exportData.health.score}/100\n`;
    csvContent += `Status,${exportData.health.status}\n`;

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${analytics.company_name}_Analytics_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('✓ Analytics exported successfully!');
  };

  // Prepare chart data
  const getRevenueExpenseData = () => {
    if (!analytics) return [];
    return [
      { name: 'Revenue', value: analytics.total_revenue || 0, color: '#10b981' },
      { name: 'Expense', value: analytics.total_expense || 0, color: '#ef4444' }
    ];
  };

  const getFinancialMetricsData = () => {
    if (!analytics) return [];
    return [
      { metric: 'Profit Margin', value: analytics.profit_margin || 0 },
      { metric: 'ROA', value: analytics.return_on_assets || 0 },
      { metric: 'ROE', value: analytics.return_on_equity || 0 },
      { metric: 'Expense Ratio', value: analytics.expense_ratio || 0 }
    ];
  };

  const getBreakdownData = (breakdown) => {
    if (!breakdown) return [];
    return Object.entries(breakdown).map(([name, value]) => ({
      name,
      value
    }));
  };

  const getAssetLiabilityData = () => {
    if (!analytics) return [];
    return [
      { name: 'Assets', value: analytics.total_assets || 0 },
      { name: 'Liabilities', value: analytics.total_liabilities || 0 },
      { name: 'Equity', value: analytics.total_equity || 0 }
    ];
  };

  const getHealthColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-blue-600 bg-blue-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const renderSingleCompanyView = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading analytics...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <Card className="border-red-200 bg-red-50">
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-700 font-medium">{error}</p>
            <p className="text-red-600 text-sm mt-2">
              Please ensure Tally is running and connected
            </p>
            <button
              onClick={handleRefresh}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </Card>
      );
    }

    if (!analytics) {
      return (
        <Card>
          <div className="text-center py-8 text-gray-500">
            Select a company to view analytics
          </div>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700">Total Revenue</p>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(analytics.total_revenue)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700">Total Expense</p>
                <p className="text-2xl font-bold text-red-900">{formatCurrency(analytics.total_expense)}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-600" />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700">Net Profit</p>
                <p className="text-2xl font-bold text-blue-900">{formatCurrency(analytics.net_profit)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600" />
            </div>
          </Card>

          <Card className={`bg-gradient-to-br ${getHealthColor(analytics.health_score)}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Health Score</p>
                <p className="text-2xl font-bold">{formatNumber(analytics.health_score)}/100</p>
                <p className="text-xs mt-1">{analytics.health_status}</p>
              </div>
              <div className="text-3xl">
                {analytics.health_score >= 80 ? '🎉' : analytics.health_score >= 60 ? '😊' : analytics.health_score >= 40 ? '😐' : '😟'}
              </div>
            </div>
          </Card>
        </div>

        {/* Alerts */}
        {analytics.alerts && analytics.alerts.length > 0 && (
          <Card className="border-yellow-200 bg-yellow-50">
            <h3 className="text-lg font-semibold mb-3 text-yellow-900">⚠️ Alerts</h3>
            <ul className="space-y-2">
              {analytics.alerts.map((alert, idx) => (
                <li key={idx} className="text-yellow-800">{alert}</li>
              ))}
            </ul>
          </Card>
        )}

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue vs Expense */}
          <Card>
            <h3 className="text-lg font-semibold mb-4">Revenue vs Expense</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={getRevenueExpenseData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="value" fill="#3b82f6">
                  {getRevenueExpenseData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Financial Ratios */}
          <Card>
            <h3 className="text-lg font-semibold mb-4">Financial Ratios (%)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={getFinancialMetricsData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="metric" />
                <YAxis />
                <Tooltip formatter={(value) => `${formatNumber(value)}%`} />
                <Bar dataKey="value" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Breakdown */}
          {analytics.revenue_breakdown && Object.keys(analytics.revenue_breakdown).length > 0 && (
            <Card>
              <h3 className="text-lg font-semibold mb-4">Revenue Breakdown</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={getBreakdownData(analytics.revenue_breakdown)}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
                  >
                    {getBreakdownData(analytics.revenue_breakdown).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Assets vs Liabilities */}
          <Card>
            <h3 className="text-lg font-semibold mb-4">Balance Sheet Overview</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={getAssetLiabilityData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="value" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Top Ledgers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Revenue Ledgers */}
          {analytics.top_revenue_ledgers && analytics.top_revenue_ledgers.length > 0 && (
            <Card>
              <h3 className="text-lg font-semibold mb-4">Top Revenue Sources</h3>
              <div className="space-y-2">
                {analytics.top_revenue_ledgers.map((ledger, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-green-50 rounded">
                    <span className="text-sm font-medium">{ledger.name}</span>
                    <span className="text-sm text-green-700 font-bold">{formatCurrency(ledger.amount)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Top Expense Ledgers */}
          {analytics.top_expense_ledgers && analytics.top_expense_ledgers.length > 0 && (
            <Card>
              <h3 className="text-lg font-semibold mb-4">Top Expense Categories</h3>
              <div className="space-y-2">
                {analytics.top_expense_ledgers.map((ledger, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-red-50 rounded">
                    <span className="text-sm font-medium">{ledger.name}</span>
                    <span className="text-sm text-red-700 font-bold">{formatCurrency(ledger.amount)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    );
  };

  const renderMultiCompanyView = () => {
    if (multiCompanyData.length === 0) {
      fetchMultiCompanyAnalytics();
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading multi-company analytics...</p>
          </div>
        </div>
      );
    }

    const comparisonData = multiCompanyData.map(company => ({
      name: company.company_name,
      revenue: company.total_revenue || 0,
      expense: company.total_expense || 0,
      profit: company.net_profit || 0,
      healthScore: company.health_score || 0
    }));

    return (
      <div className="space-y-6">
        {/* Multi-Company Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {multiCompanyData.slice(0, 4).map((company, idx) => (
            <Card key={idx} className={`cursor-pointer hover:shadow-lg transition-shadow ${getHealthColor(company.health_score)}`}>
              <h4 className="font-bold text-lg mb-2 truncate">{company.company_name}</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Revenue:</span>
                  <span className="font-semibold">{formatCurrency(company.total_revenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Profit:</span>
                  <span className="font-semibold">{formatCurrency(company.net_profit)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Health:</span>
                  <span className="font-semibold">{formatNumber(company.health_score)}/100</span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Company Comparison Charts */}
        <Card>
          <h3 className="text-lg font-semibold mb-4">Revenue Comparison</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
              <Bar dataKey="expense" fill="#ef4444" name="Expense" />
              <Bar dataKey="profit" fill="#3b82f6" name="Profit" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold mb-4">Health Score Comparison</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="healthScore" stroke="#8b5cf6" strokeWidth={3} name="Health Score" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Financial Analytics</h1>
            <p className="text-gray-600 mt-1">Real-time insights and comprehensive analysis</p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleExportData}
              disabled={!analytics}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              <RefreshCcw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
        </div>
      </div>

      {/* View Selector and Company Selector */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setView('single')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              view === 'single'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Single Company
          </button>
          <button
            onClick={() => {
              setView('multi');
              if (multiCompanyData.length === 0) {
                fetchMultiCompanyAnalytics();
              }
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              view === 'multi'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Multi-Company
          </button>
        </div>

        {view === 'single' && (
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Company</option>
            {companies.map((company, idx) => (
              <option key={idx} value={company.name}>
                {company.name} {company.source === 'live' ? '🟢 Live' : '📁 Backup'}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Main Content */}
      {view === 'single' ? renderSingleCompanyView() : renderMultiCompanyView()}
    </div>
  );
};

export default AnalyticsPage;
