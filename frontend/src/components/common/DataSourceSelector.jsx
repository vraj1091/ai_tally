import React, { useState, useRef, useEffect } from 'react';
import { FiDatabase, FiUploadCloud, FiX, FiCheckCircle, FiAlertCircle, FiTrash2, FiFile, FiCloud } from 'react-icons/fi';
import { tallyApi } from '../../api/tallyApi';
import toast from 'react-hot-toast';

// Check if we're on EC2/cloud deployment
const isCloudDeployment = () => {
  const hostname = window.location.hostname;
  return !hostname.includes('localhost') && !hostname.includes('127.0.0.1');
};

const DataSourceSelector = ({ dataSource, onDataSourceChange, tallyConnected = true }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [backupFiles, setBackupFiles] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingBackup, setIsLoadingBackup] = useState(false);
  const [autoFallbackNotified, setAutoFallbackNotified] = useState(false);
  const fileInputRef = useRef(null);
  const loadingRef = useRef(false); // Prevent multiple simultaneous calls
  
  // AUTO-FALLBACK: Switch to backup mode when Tally disconnects
  useEffect(() => {
    if (!tallyConnected && dataSource === 'live' && backupFiles.length > 0 && !autoFallbackNotified) {
      console.log('🔄 Auto-fallback: Tally disconnected, switching to backup mode...');
      onDataSourceChange('backup');
      toast('⚠️ Tally disconnected - Switched to Backup Mode', { 
        icon: '🔄',
        duration: 4000 
      });
      setAutoFallbackNotified(true);
    }
    // Reset notification flag when Tally reconnects
    if (tallyConnected && autoFallbackNotified) {
      setAutoFallbackNotified(false);
    }
  }, [tallyConnected, dataSource, backupFiles, onDataSourceChange, autoFallbackNotified]);
  
  // Load backup files when component mounts or when switching to backup mode
  useEffect(() => {
    // Always try to load backup files to show what's available
    if (!loadingRef.current) {
      loadBackupFiles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataSource]);
  
  // Also load on initial mount
  useEffect(() => {
    loadBackupFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBackupFiles = async () => {
    // Prevent multiple simultaneous calls
    if (loadingRef.current || isLoadingBackup) {
      return;
    }
    
    loadingRef.current = true;
    setIsLoadingBackup(true);
    
    try {
      console.log('🔄 Loading backup companies...');
      const response = await tallyApi.getBackupCompanies();
      console.log('📦 Backup companies response:', response);
      
      // Handle both success and error responses gracefully
      if (response && response.companies && Array.isArray(response.companies) && response.companies.length > 0) {
        setBackupFiles(response.companies);
        console.log(`✅ Loaded ${response.companies.length} backup companies`);
      } else {
        setBackupFiles([]);
        if (response && response.message) {
          console.warn('Backup companies:', response.message);
        } else {
          console.warn('No backup companies found in response');
        }
      }
    } catch (error) {
      console.error('Error loading backup files:', error);
      setBackupFiles([]);
      // Don't show error toast - just silently fail and show empty list
    } finally {
      loadingRef.current = false;
      setIsLoadingBackup(false);
    }
  };
  
  const handleDeleteBackup = async () => {
    if (!confirm('Delete all backup data? This will remove all cached backup files.')) {
      return;
    }
    
    setIsDeleting(true);
    try {
      await tallyApi.clearBackupData();
      toast.success('✓ Backup data deleted');
      setBackupFiles([]);
      if (dataSource === 'backup') {
        onDataSourceChange('live'); // Switch to live mode
      }
    } catch (error) {
      console.error('Error deleting backup:', error);
      toast.error('Error deleting backup data');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSourceToggle = (source) => {
    onDataSourceChange(source);
    
    // Also update the connection type for bridge mode
    if (source === 'bridge') {
      localStorage.setItem('tally_connection_type', 'BRIDGE');
      toast.success('✓ Switched to Bridge Mode - Connect via TallyConnector');
    } else if (source === 'live') {
      localStorage.setItem('tally_connection_type', 'DIRECT');
      toast.success('✓ Switched to Live Tally Data');
    } else {
      localStorage.setItem('tally_connection_type', 'BACKUP');
      toast.success('✓ Switched to Backup Data');
      // Don't call loadBackupFiles here - useEffect will handle it
      // This prevents duplicate calls
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type - accept .tbk, .001, .002, etc. (multi-part backups), and .xml
    const validExtensions = ['.tbk', '.001', '.002', '.003', '.004', '.005', '.zip', '.xml'];
    const isValidFile = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    
    if (!isValidFile) {
      toast.error('Invalid file type. Please upload a Tally backup file (.tbk, .001, .zip, .xml)');
      return;
    }

    // Check file size and warn for large files
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const fileSizeGB = (file.size / (1024 * 1024 * 1024)).toFixed(2);
    const isLargeFile = file.size > 500 * 1024 * 1024; // > 500MB
    const isVeryLargeFile = file.size > 1024 * 1024 * 1024; // > 1GB
    
    if (isVeryLargeFile) {
      toast(`Uploading ${fileSizeGB} GB file - this may take 5-15 minutes. Please wait...`, {
        duration: 10000,
        icon: '📁'
      });
    } else if (isLargeFile) {
      toast(`Uploading ${fileSizeMB} MB file - this may take 2-5 minutes. Please wait...`, {
        duration: 8000,
        icon: '📁'
      });
    }

    setIsUploading(true);
    setUploadProgress({ 
      status: 'uploading', 
      message: 'Uploading backup file...', 
      details: isVeryLargeFile 
        ? `${fileSizeGB} GB - Very large file, please be patient (5-15 min)` 
        : isLargeFile 
          ? `${fileSizeMB} MB - Large file may take 2-5 minutes`
          : `${fileSizeMB} MB`,
      percent: 0
    });

    // Progress callback for large file uploads
    const onProgress = (percent, loaded, total) => {
      const loadedMB = (loaded / (1024 * 1024)).toFixed(1);
      const totalMB = (total / (1024 * 1024)).toFixed(1);
      setUploadProgress(prev => ({
        ...prev,
        percent,
        details: `${loadedMB} MB / ${totalMB} MB (${percent}%)`
      }));
    };

    try {
      const result = await tallyApi.uploadBackupFile(file, onProgress);
      
      if (result.success) {
        // Extract counts from the response (API returns data.companies as count, not array)
        const companiesCount = result.data?.companies || result.companies_found || 1;
        const ledgersCount = result.data?.ledgers || result.total_ledgers || 0;
        const vouchersCount = result.data?.vouchers || result.total_vouchers || 0;
        
        setUploadProgress({
          status: 'success',
          message: `✓ Uploaded successfully!`,
          details: `${companiesCount} companies, ${ledgersCount} ledgers, ${vouchersCount} vouchers`
        });

        toast.success(`✓ Backup file loaded: ${companiesCount} companies found`, {
          duration: 5000
        });

        // Reset loading ref to allow refresh
        loadingRef.current = false;
        
        // Auto-switch to backup mode and reload files
        setTimeout(async () => {
          onDataSourceChange('backup');
          // Force reload backup files
          loadingRef.current = false;
          await loadBackupFiles();
          setUploadProgress(null);
        }, 1500);
      }
    } catch (error) {
      console.error('Upload error:', error);
      const errorDetail = error.response?.data?.detail || error.message;
      
      setUploadProgress({
        status: 'error',
        message: 'Failed to upload backup file',
        details: 'Network error during upload. This can happen with very large files. Check your connection and try again.'
      });
      
      // Auto-clear error after 5 seconds
      setTimeout(() => setUploadProgress(null), 5000);
      
      // Show more helpful error message
      if (errorDetail.includes('binary format')) {
        toast.error('This file is in Tally binary format. Please export as XML from Tally first.', {
          duration: 8000
        });
      } else if (errorDetail.includes('Invalid XML format') || errorDetail.includes('invalid character')) {
        toast.error('XML file contains invalid characters. The file will be automatically cleaned and retried.', {
          duration: 8000
        });
        // The backend now automatically cleans invalid characters, so this should be rare
        console.warn('XML parsing error - backend should handle this automatically');
      } else if (errorDetail.includes('Could not parse') || errorDetail.includes('parse XML')) {
        toast.error('Invalid XML format. Please ensure the file is a valid Tally XML export.', {
          duration: 6000
        });
      } else if (errorDetail.includes('corrupted') || errorDetail.includes('corrupt')) {
        toast.error('File appears to be corrupted. Please try re-exporting from Tally.', {
          duration: 6000
        });
      } else {
        toast.error(`Failed to upload: ${errorDetail.substring(0, 100)}`, {
          duration: 6000
        });
      }
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const clearUploadProgress = () => {
    setUploadProgress(null);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Data Source Label */}
          <div className="text-sm font-medium text-gray-700">
            Data Source:
          </div>

          {/* Live / Bridge / Backup Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            {/* Show Live Tally only on localhost */}
            {!isCloudDeployment() && (
              <button
                onClick={() => handleSourceToggle('live')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all ${
                  dataSource === 'live'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FiDatabase className="w-4 h-4" />
                <span className="font-medium">Live Tally</span>
              </button>
            )}
            
            {/* Bridge mode - for cloud deployment connecting to local Tally */}
            <button
              onClick={() => handleSourceToggle('bridge')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all ${
                dataSource === 'bridge'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FiCloud className="w-4 h-4" />
              <span className="font-medium">Bridge</span>
            </button>
            
            <button
              onClick={() => handleSourceToggle('backup')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all ${
                dataSource === 'backup'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FiDatabase className="w-4 h-4" />
              <span className="font-medium">Backup File</span>
            </button>
          </div>

          {/* Upload Button */}
          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              accept=".tbk,.001,.002,.003,.004,.005,.zip,.xml"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isUploading}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className={`flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg transition-all ${
                isUploading
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-50 hover:border-blue-500'
              }`}
            >
              <FiUploadCloud className="w-4 h-4" />
              <span className="font-medium">
                {isUploading ? 'Uploading...' : 'Upload Backup'}
              </span>
            </button>
          </div>
        </div>

        {/* Current Status */}
        <div className="flex items-center space-x-2">
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${
            dataSource === 'bridge'
              ? 'bg-purple-100 text-purple-700'
              : dataSource === 'live' 
              ? 'bg-green-100 text-green-700' 
              : 'bg-blue-100 text-blue-700'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              dataSource === 'bridge' ? 'bg-purple-500' : dataSource === 'live' ? 'bg-green-500' : 'bg-blue-500'
            }`} />
            <span className="text-sm font-medium">
              {dataSource === 'bridge' ? 'Bridge Mode' : dataSource === 'live' ? 'Live Mode' : 'Backup Mode'}
            </span>
          </div>
        </div>
      </div>

      {/* Upload Progress/Result */}
      {uploadProgress && (
        <div className={`mt-4 p-4 rounded-lg border ${
          uploadProgress.status === 'success' 
            ? 'bg-green-50 border-green-200' 
            : uploadProgress.status === 'error'
            ? 'bg-red-50 border-red-200'
            : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              {uploadProgress.status === 'success' && (
                <FiCheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              )}
              {uploadProgress.status === 'error' && (
                <FiAlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              )}
              {uploadProgress.status === 'uploading' && (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mt-0.5" />
              )}
              
              <div className="flex-1">
                <p className={`font-medium ${
                  uploadProgress.status === 'success' 
                    ? 'text-green-900' 
                    : uploadProgress.status === 'error'
                    ? 'text-red-900'
                    : 'text-blue-900'
                }`}>
                  {uploadProgress.message}
                </p>
                {uploadProgress.details && (
                  <p className={`text-sm mt-1 ${
                    uploadProgress.status === 'success' 
                      ? 'text-green-700' 
                      : uploadProgress.status === 'error'
                      ? 'text-red-700'
                      : 'text-blue-700'
                  }`}>
                    {uploadProgress.details}
                  </p>
                )}
                {/* Progress bar for uploading */}
                {uploadProgress.status === 'uploading' && uploadProgress.percent !== undefined && (
                  <div className="mt-2">
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress.percent}%` }}
                      />
                    </div>
                    <p className="text-xs text-blue-600 mt-1 text-center">
                      {uploadProgress.percent}% uploaded
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {uploadProgress.status !== 'uploading' && (
              <button
                onClick={clearUploadProgress}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Helper Text */}
      <div className="mt-3 text-sm text-gray-500 flex items-start space-x-2">
        <div className="text-gray-400 mt-0.5">ℹ️</div>
        <div>
          {dataSource === 'bridge' ? (
            <span>
              Fetching data via WebSocket Bridge from your local PC. 
              <strong className="text-purple-700"> Run TallyConnector on your PC with Tally running.</strong>
            </span>
          ) : dataSource === 'live' ? (
            <span>
              Fetching data directly from Tally ERP (Port 9000). 
              <strong className="text-gray-700"> Make sure Tally Gateway is enabled.</strong>
            </span>
          ) : (
            <span>
              Using data from uploaded backup file (.tbk, .001, .xml, .zip). 
              <strong className="text-gray-700"> Perfect for viewing data when Tally is not running.</strong>
              {' '}(Max 2 GB supported)
            </span>
          )}
        </div>
      </div>

      {/* Loaded Backup Files (only show in backup mode) */}
      {dataSource === 'backup' && backupFiles.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <FiFile className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">
                Loaded Backup Files ({backupFiles.length})
              </span>
            </div>
            <button
              onClick={handleDeleteBackup}
              disabled={isDeleting}
              className="flex items-center space-x-1 px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiTrash2 className="w-3 h-3" />
              <span>{isDeleting ? 'Deleting...' : 'Delete All'}</span>
            </button>
          </div>
          {/* Scrollable company list with max height */}
          <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
            {backupFiles.map((company, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
              >
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <FiCheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-blue-900 truncate">
                    {company.name || 'Unnamed Company'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No backup files message */}
      {dataSource === 'backup' && backupFiles.length === 0 && !isUploading && !uploadProgress && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-center py-4">
            <FiFile className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              No backup files loaded. Upload a backup file to get started.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataSourceSelector;

