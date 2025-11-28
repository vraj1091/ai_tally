import React, { useState, useEffect } from 'react';
import { 
  FiDatabase, FiWifi, FiWifiOff, FiRefreshCw, FiCheckCircle,
  FiAlertCircle, FiClock, FiActivity, FiServer
} from 'react-icons/fi';

export const TallyStatusIndicator = ({ connected, lastSync }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 2000);
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border-2 ${
      connected 
        ? 'bg-green-50 border-green-200' 
        : 'bg-red-50 border-red-200'
    }`}>
      <div className="relative">
        <FiDatabase className={`w-5 h-5 ${connected ? 'text-green-600' : 'text-red-600'}`} />
        {connected && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
        )}
      </div>
      
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${connected ? 'text-green-900' : 'text-red-900'}`}>
            Tally {connected ? 'Connected' : 'Disconnected'}
          </span>
          {connected && lastSync && (
            <span className="text-xs text-gray-600">
              • Synced {lastSync}
            </span>
          )}
        </div>
        {!connected && (
          <p className="text-xs text-red-700 mt-0.5">Using cached data</p>
        )}
      </div>
      
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className={`p-2 rounded-lg transition-colors ${
          connected 
            ? 'hover:bg-green-100 text-green-700' 
            : 'hover:bg-red-100 text-red-700'
        }`}
      >
        <FiRefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
};

export const ConnectionStatusBar = ({ tallyStatus, cacheStatus, lastActivity }) => {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-2">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-6">
          {/* Tally Connection */}
          <div className="flex items-center gap-2">
            {tallyStatus?.connected ? (
              <>
                <FiWifi className="w-4 h-4 text-green-600" />
                <span className="text-sm text-gray-700">Tally Online</span>
              </>
            ) : (
              <>
                <FiWifiOff className="w-4 h-4 text-orange-600" />
                <span className="text-sm text-gray-700">Tally Offline</span>
              </>
            )}
          </div>

          {/* Cache Status */}
          {cacheStatus && (
            <div className="flex items-center gap-2">
              <FiServer className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-gray-700">
                {cacheStatus.entries} cached items
              </span>
            </div>
          )}

          {/* Last Activity */}
          {lastActivity && (
            <div className="flex items-center gap-2">
              <FiActivity className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-gray-700">
                Active {lastActivity}
              </span>
            </div>
          )}
        </div>

        {/* Status Badge */}
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          tallyStatus?.connected 
            ? 'bg-green-100 text-green-700' 
            : 'bg-orange-100 text-orange-700'
        }`}>
          {tallyStatus?.connected ? '● All Systems Operational' : '● Using Cached Data'}
        </div>
      </div>
    </div>
  );
};

export const DataFreshnessIndicator = ({ timestamp, threshold = 3600 }) => {
  const [freshness, setFreshness] = useState('fresh');

  useEffect(() => {
    if (!timestamp) return;

    const updateFreshness = () => {
      const now = Date.now();
      const age = (now - new Date(timestamp).getTime()) / 1000; // seconds

      if (age < threshold) {
        setFreshness('fresh');
      } else if (age < threshold * 2) {
        setFreshness('aging');
      } else {
        setFreshness('stale');
      }
    };

    updateFreshness();
    const interval = setInterval(updateFreshness, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [timestamp, threshold]);

  const getStyle = () => {
    switch (freshness) {
      case 'fresh':
        return { icon: FiCheckCircle, color: 'text-green-600', bg: 'bg-green-50', label: 'Up to date' };
      case 'aging':
        return { icon: FiClock, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Slightly outdated' };
      case 'stale':
        return { icon: FiAlertCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Needs refresh' };
      default:
        return { icon: FiClock, color: 'text-gray-600', bg: 'bg-gray-50', label: 'Unknown' };
    }
  };

  const style = getStyle();
  const Icon = style.icon;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${style.bg}`}>
      <Icon className={`w-4 h-4 ${style.color}`} />
      <span className={`text-xs font-medium ${style.color}`}>{style.label}</span>
    </div>
  );
};

export const LiveDataBadge = ({ isLive = false }) => {
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${
      isLive ? 'bg-green-100' : 'bg-gray-100'
    }`}>
      <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
      <span className={`text-xs font-medium ${isLive ? 'text-green-700' : 'text-gray-700'}`}>
        {isLive ? 'Live Data' : 'Cached Data'}
      </span>
    </div>
  );
};

export const SyncIndicator = ({ isSyncing, lastSyncTime, onSync }) => {
  return (
    <button
      onClick={onSync}
      disabled={isSyncing}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
        isSyncing
          ? 'bg-blue-50 border-blue-200 cursor-wait'
          : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50'
      }`}
    >
      <FiRefreshCw className={`w-4 h-4 text-blue-600 ${isSyncing ? 'animate-spin' : ''}`} />
      <div className="text-left">
        <p className="text-sm font-medium text-gray-900">
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </p>
        {lastSyncTime && !isSyncing && (
          <p className="text-xs text-gray-600">Last: {lastSyncTime}</p>
        )}
      </div>
    </button>
  );
};

export const CacheStatusWidget = ({ stats }) => {
  if (!stats) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h4 className="text-sm font-semibold text-gray-900 mb-3">Cache Status</h4>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Total Entries:</span>
          <span className="font-medium text-gray-900">{stats.totalEntries || 0}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Expired:</span>
          <span className="font-medium text-gray-900">{stats.expired || 0}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Last Update:</span>
          <span className="font-medium text-gray-900">
            {stats.lastUpdate ? new Date(stats.lastUpdate).toLocaleTimeString() : 'Never'}
          </span>
        </div>
      </div>
      
      {stats.expired > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
            Clear expired cache
          </button>
        </div>
      )}
    </div>
  );
};

export default {
  TallyStatusIndicator,
  ConnectionStatusBar,
  DataFreshnessIndicator,
  LiveDataBadge,
  SyncIndicator,
  CacheStatusWidget
};

