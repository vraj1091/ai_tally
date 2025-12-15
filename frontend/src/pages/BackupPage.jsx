import React, { useState, useEffect } from 'react'
import { tallyApi } from '../api/tallyApi'
import toast from 'react-hot-toast'
import { FiUploadCloud, FiFile, FiCheckCircle, FiAlertCircle, FiDatabase, FiDownload, FiTrash2, FiRefreshCw } from 'react-icons/fi'

export default function BackupPage() {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [companies, setCompanies] = useState([])
  const [loadingCompanies, setLoadingCompanies] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  useEffect(() => {
    loadBackupCompanies()
  }, [])

  const loadBackupCompanies = async () => {
    setLoadingCompanies(true)
    try {
      const response = await tallyApi.getBackupCompanies()
      setCompanies(response.companies || [])
    } catch (error) {
      console.error('Failed to load backup companies:', error)
    } finally {
      setLoadingCompanies(false)
    }
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      validateAndSetFile(selectedFile)
    }
  }

  const validateAndSetFile = (selectedFile) => {
    // Check file extension
    const allowedExtensions = ['.xml', '.tbk', '.zip']
    const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'))
    
    if (!allowedExtensions.includes(fileExtension)) {
      toast.error('Invalid file type. Please upload .xml, .tbk, or .zip files only.')
      return
    }

    // Check file size (2GB max)
    const maxSize = 2 * 1024 * 1024 * 1024 // 2GB
    if (selectedFile.size > maxSize) {
      toast.error('File size exceeds 2GB limit. Please choose a smaller file.')
      return
    }

    setFile(selectedFile)
    toast.success(`File selected: ${selectedFile.name} (${formatFileSize(selectedFile.size)})`)
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) {
      validateAndSetFile(droppedFile)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file first')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      const response = await tallyApi.uploadBackupFile(file, (percent, loaded, total) => {
        setUploadProgress(percent)
        console.log(`Upload progress: ${percent}% (${formatFileSize(loaded)} / ${formatFileSize(total)})`)
      })

      if (response.success) {
        toast.success(`✓ ${response.message || 'Backup uploaded successfully'}`)
        setFile(null)
        setUploadProgress(0)
        loadBackupCompanies()
      } else {
        toast.error(response.message || 'Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Error uploading backup file')
    } finally {
      setUploading(false)
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Backup Management
          </h1>
          <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>
            Upload and manage your Tally backup files for offline access
          </p>
        </div>
        <button
          onClick={loadBackupCompanies}
          disabled={loadingCompanies}
          className="btn-ghost flex items-center gap-2"
        >
          <FiRefreshCw className={`w-4 h-4 ${loadingCompanies ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Upload Section */}
      <div className="card p-8" style={{ border: '1px solid var(--border-color)' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
            <FiUploadCloud className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Upload Backup File
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Supports .xml, .tbk, and .zip files up to 2GB
            </p>
          </div>
        </div>

        {/* Drag & Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-12 transition-all ${
            dragActive ? 'border-primary scale-[1.02]' : 'border-gray-300'
          }`}
          style={{
            background: dragActive ? 'rgba(139, 92, 246, 0.05)' : 'var(--bg-secondary)',
            borderColor: dragActive ? 'var(--primary)' : 'var(--border-color)'
          }}
        >
          <div className="text-center">
            {file ? (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
                  <FiFile className="w-8 h-8" style={{ color: '#10B981' }} />
                </div>
                <div>
                  <p className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
                    {file.name}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {formatFileSize(file.size)}
                  </p>
                </div>
                {uploading ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="font-semibold" style={{ color: 'var(--primary)' }}>
                        Uploading... {uploadProgress}%
                      </span>
                    </div>
                    <div className="max-w-md mx-auto h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                      <div
                        className="h-full transition-all duration-300"
                        style={{
                          width: `${uploadProgress}%`,
                          background: 'var(--gradient-primary)'
                        }}
                      />
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {uploadProgress < 100 
                        ? 'Uploading file to server...' 
                        : 'Processing backup file...'}
                    </p>
                  </div>
                ) : (
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={handleUpload}
                      className="btn-primary px-6 py-3 flex items-center gap-2"
                    >
                      <FiUploadCloud className="w-5 h-5" />
                      Upload & Process
                    </button>
                    <button
                      onClick={() => setFile(null)}
                      className="btn-ghost px-6 py-3"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
                  <FiUploadCloud className="w-10 h-10" style={{ color: 'var(--primary)' }} />
                </div>
                <div>
                  <p className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                    Drag & Drop your backup file here
                  </p>
                  <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                    or click below to browse
                  </p>
                </div>
                <label className="btn-primary px-6 py-3 inline-flex items-center gap-2 cursor-pointer">
                  <FiFile className="w-5 h-5" />
                  Choose File
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept=".xml,.tbk,.zip"
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="p-4 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <div className="flex items-center gap-3">
              <FiCheckCircle className="w-5 h-5" style={{ color: '#10B981' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Supported Formats
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  .xml, .tbk, .zip
                </p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <div className="flex items-center gap-3">
              <FiDatabase className="w-5 h-5" style={{ color: '#3B82F6' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Maximum Size
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Up to 2GB
                </p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <div className="flex items-center gap-3">
              <FiAlertCircle className="w-5 h-5" style={{ color: '#F59E0B' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Processing Time
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  5-60 mins for large files
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Backup Companies List */}
      <div className="card p-6" style={{ border: '1px solid var(--border-color)' }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>
              <FiDatabase className="w-5 h-5" style={{ color: '#3B82F6' }} />
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Backup Companies ({companies.length})
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Companies available from backup files
              </p>
            </div>
          </div>
        </div>

        {loadingCompanies ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : companies.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
              <FiDatabase className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
            </div>
            <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              No Backup Companies Found
            </p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Upload a backup file to get started
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.map((company, index) => (
              <div
                key={index}
                className="p-4 rounded-lg hover:scale-[1.02] transition-transform cursor-pointer"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
                      <FiCheckCircle className="w-5 h-5" style={{ color: '#10B981' }} />
                    </div>
                    <div>
                      <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {typeof company === 'string' ? company : company.name}
                      </p>
                      <span className="badge badge-cyan text-xs">BACKUP</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="card p-6" style={{ border: '1px solid var(--border-color)', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)' }}>
        <h3 className="font-bold text-lg mb-3" style={{ color: 'var(--text-primary)' }}>
          📖 How to Export Backup from Tally
        </h3>
        <ol className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <li>1. Open Tally ERP and go to <strong>Gateway of Tally</strong></li>
          <li>2. Press <strong>Alt + F3</strong> to open Company Info menu</li>
          <li>3. Select <strong>Backup</strong> option</li>
          <li>4. Choose the companies you want to backup</li>
          <li>5. Select destination folder and click <strong>Yes</strong></li>
          <li>6. Upload the generated .zip or .xml file here</li>
        </ol>
      </div>
    </div>
  )
}

