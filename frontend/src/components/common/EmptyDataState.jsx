import React from 'react';
import { FiAlertCircle, FiRefreshCw, FiDatabase } from 'react-icons/fi';

/**
 * Reusable component for displaying empty data states
 * Shows helpful messages and actions when no data is available
 */
const EmptyDataState = ({ 
  title = "No Data Available",
  message = "Please connect to Tally or select a company with data",
  icon: Icon = FiAlertCircle,
  onRefresh = null,
  validationWarnings = null,
  dataSource = 'live'
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm p-12 text-center">
      <Icon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-4">{message}</p>
      
      {/* Show validation warnings if available */}
      {validationWarnings && validationWarnings.length > 0 && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-left max-w-md mx-auto">
          <p className="text-sm font-semibold text-yellow-800 mb-2">Data Quality Warnings:</p>
          <ul className="text-sm text-yellow-700 space-y-1">
            {validationWarnings.map((warning, idx) => (
              <li key={idx}>• {warning}</li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Show data source info */}
      <div className="mt-4 text-sm text-gray-500">
        <FiDatabase className="inline mr-2" />
        Data Source: <span className="font-medium">
          {dataSource === 'backup' ? 'Backup File' : dataSource === 'bridge' ? 'Bridge Mode' : 'Live Tally'}
        </span>
      </div>
      
      {/* Refresh button if provided */}
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="mt-6 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2 mx-auto"
        >
          <FiRefreshCw className="w-4 h-4" />
          Refresh Data
        </button>
      )}
    </div>
  );
};

export default EmptyDataState;

