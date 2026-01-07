import React, { useState, useEffect } from 'react';
import { FiX, FiChevronRight, FiTrendingUp, FiTrendingDown, FiFilter, FiDownload } from 'react-icons/fi';
import apiClient from '../../api/client';

/**
 * Drill-Down Panel Component
 * Shows detailed data when user clicks on chart elements or KPI cards
 */
const DrillDownPanel = ({ 
  isOpen, 
  onClose, 
  title, 
  dataType, 
  filterValue, 
  companyName, 
  dataSource = 'live',
  parentData = null  // Accept data from parent to avoid API mismatch
}) => {
  const [loading, setLoading] = useState(false);
  const [drillData, setDrillData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && filterValue) {
      // Use parent data if available, otherwise fetch
      if (parentData) {
        setDrillData(parentData);
        setLoading(false);
      } else {
        fetchDrillDownData();
      }
    }
  }, [isOpen, filterValue, dataType, parentData]);

  const fetchDrillDownData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(`/analytics/drill-down`, {
        params: {
          company: companyName,
          type: dataType,
          filter: filterValue,
          source: dataSource
        },
        timeout: 60000
      });
      setDrillData(response.data);
    } catch (err) {
      console.error('Drill-down fetch error:', err);
      // Show empty state instead of error for better UX
      setDrillData({
        summary: { total_amount: 0, ledger_count: 0, transaction_count: 0 },
        transactions: []
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    const absValue = Math.abs(value || 0);
    if (absValue >= 10000000) return `₹${(absValue / 10000000).toFixed(2)}Cr`;
    if (absValue >= 100000) return `₹${(absValue / 100000).toFixed(2)}L`;
    if (absValue >= 1000) return `₹${(absValue / 1000).toFixed(2)}K`;
    return `₹${absValue.toFixed(2)}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="relative bg-white w-full max-w-4xl max-h-[80vh] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-sm opacity-80 flex items-center gap-2">
              <FiFilter className="w-4 h-4" />
              Filtered by: {filterValue}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-600">
              <p>{error}</p>
              <button 
                onClick={fetchDrillDownData}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : drillData ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              {drillData.summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(drillData.summary).map(([key, value]) => {
                    // Don't format counts as currency
                    const isCount = key.toLowerCase().includes('count');
                    const displayValue = typeof value === 'number' 
                      ? (isCount ? value.toLocaleString() : formatCurrency(value))
                      : value;
                    
                    return (
                      <div key={key} className="bg-gray-50 rounded-xl p-4">
                        <p className="text-sm text-gray-600 capitalize">{key.replace(/_/g, ' ')}</p>
                        <p className="text-xl font-bold text-gray-900">{displayValue}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Transactions Table */}
              {drillData.transactions && drillData.transactions.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-900">
                      Related Transactions ({drillData.transactions.length})
                    </h4>
                    <button className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
                      <FiDownload className="w-4 h-4" />
                      Export
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Particulars</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Type</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {drillData.transactions.slice(0, 50).map((txn, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-600">{txn.date}</td>
                            <td className="px-4 py-3 text-gray-900">{txn.particulars || txn.narration}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                txn.type === 'Sales' || txn.type === 'Receipt' 
                                  ? 'bg-green-100 text-green-700'
                                  : txn.type === 'Purchase' || txn.type === 'Payment'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {txn.type}
                              </span>
                            </td>
                            <td className={`px-4 py-3 text-right font-medium ${
                              txn.amount >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatCurrency(txn.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {drillData.transactions.length > 50 && (
                      <p className="text-center text-sm text-gray-500 mt-4">
                        Showing 50 of {drillData.transactions.length} transactions
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Ledger Breakdown */}
              {drillData.ledgers && drillData.ledgers.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    Ledger Breakdown ({drillData.ledgers.length})
                  </h4>
                  <div className="space-y-2">
                    {drillData.ledgers.map((ledger, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <FiChevronRight className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">{ledger.name}</p>
                            <p className="text-sm text-gray-500">{ledger.parent}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${
                            ledger.balance >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(ledger.balance)}
                          </p>
                          {ledger.trend && (
                            <p className={`text-xs flex items-center justify-end gap-1 ${
                              ledger.trend > 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {ledger.trend > 0 ? <FiTrendingUp /> : <FiTrendingDown />}
                              {Math.abs(ledger.trend).toFixed(1)}%
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Monthly Trend */}
              {drillData.monthly_trend && drillData.monthly_trend.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Monthly Trend</h4>
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                    {drillData.monthly_trend.map((month, idx) => (
                      <div key={idx} className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs text-gray-500">{month.month}</p>
                        <p className="text-sm font-bold text-blue-700">{formatCurrency(month.amount)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>Click on any chart element or KPI to see detailed data</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DrillDownPanel;

