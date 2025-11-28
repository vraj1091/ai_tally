import React, { useState, useRef, useEffect } from 'react';
import { FiDatabase, FiUploadCloud, FiX, FiCheckCircle, FiAlertCircle, FiTrash2, FiFile } from 'react-icons/fi';
import { tallyApi } from '../../api/tallyApi';
import toast from 'react-hot-toast';

const DataSourceSelector = ({ dataSource, onDataSourceChange }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [backupFiles, setBackupFiles] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingBackup, setIsLoadingBackup] = useState(false);
  const fileInputRef = useRef(null);
  const loadingRef = useRef(false); // Prevent multiple simultaneous calls
  
  // Load backup files when component mounts or when switching to backup mode
  useEffect(() => {
    if (dataSource === 'backup' && !loadingRef.current) {
      loadBackupFiles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataSource]);

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
    if (source === 'live') {
      toast.success('✓ Switched to Live Tally Data');
    } else {
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

    setIsUploading(true);
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    setUploadProgress({ 
      status: 'uploading', 
      message: 'Uploading backup file...', 
      details: `${fileSizeMB} MB - Large files may take 1-3 minutes to process`
    });

    try {
      const result = await tallyApi.uploadBackupFile(file);
      
      if (result.success) {
        setUploadProgress({
          status: 'success',
          message: `✓ Uploaded successfully!`,
          details: `${result.companies_found} companies, ${result.total_ledgers} ledgers, ${result.total_vouchers} vouchers`
        });

        toast.success(`✓ Backup file loaded: ${result.companies_found} companies found`, {
          duration: 5000
        });

        // Auto-switch to backup mode and reload files
        setTimeout(() => {
          onDataSourceChange('backup');
          loadBackupFiles();
          setUploadProgress(null);
        }, 2000);
      }
    } catch (error) {
      console.error('Upload error:', error);
      const errorDetail = error.response?.data?.detail || error.message;
      
      setUploadProgress({
        status: 'error',
        message: 'Failed to upload backup file',
        details: errorDetail
      });
      
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

          {/* Live / Backup Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
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
            dataSource === 'live' 
              ? 'bg-green-100 text-green-700' 
              : 'bg-blue-100 text-blue-700'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              dataSource === 'live' ? 'bg-green-500' : 'bg-blue-500'
            }`} />
            <span className="text-sm font-medium">
              {dataSource === 'live' ? 'Live Mode' : 'Backup Mode'}
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
          {dataSource === 'live' ? (
            <span>
              Fetching data directly from Tally ERP (Port 9000). 
              <strong className="text-gray-700"> Make sure Tally Gateway is enabled.</strong>
            </span>
          ) : (
            <span>
              Using data from uploaded backup file (.tbk, .001, .xml, .zip). 
              <strong className="text-gray-700"> Perfect for viewing data when Tally is not running.</strong>
              {' '}(Max 100 MB, 3-minute timeout for large files)
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

