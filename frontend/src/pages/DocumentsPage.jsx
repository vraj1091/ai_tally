import React, { useEffect, useState } from 'react'
import { documentApi } from '../api/documentApi'
import { googleDriveApi } from '../api/googleDriveApi'
import toast from 'react-hot-toast'
import { FiUpload, FiFile, FiTrash2, FiCloud, FiFolder, FiExternalLink, FiDatabase, FiRefreshCw } from 'react-icons/fi'

export default function DocumentsPage() {
  const [localDocuments, setLocalDocuments] = useState([])
  const [driveFiles, setDriveFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState(null)
  const [activeTab, setActiveTab] = useState('local') // 'local' or 'drive'
  const [driveFolderId, setDriveFolderId] = useState('')
  const [driveUrl, setDriveUrl] = useState('')
  const [loadingDrive, setLoadingDrive] = useState(false)
  const [ragStats, setRagStats] = useState(null)

  useEffect(() => {
    fetchLocalDocuments()
    fetchRagStats()
  }, [])

  const fetchLocalDocuments = async () => {
    try {
      const response = await documentApi.list()
      setLocalDocuments(response.documents)
    } catch (error) {
      toast.error('Failed to load local documents')
    }
  }

  const extractGoogleDriveId = (url) => {
    if (!url) return null
    if (!url.includes('/') && !url.includes('?')) {
      return { id: url, type: 'unknown' }
    }
    const fileMatch = url.match(/\/file\/d\/([^\/\?]+)/)
    if (fileMatch) return { id: fileMatch[1], type: 'file' }
    const folderMatch = url.match(/\/folders\/([^\/\?]+)/)
    if (folderMatch) return { id: folderMatch[1], type: 'folder' }
    const openMatch = url.match(/[?&]id=([^&]+)/)
    if (openMatch) return { id: openMatch[1], type: 'unknown' }
    return null
  }

  const fetchDriveFiles = async () => {
    setLoadingDrive(true)
    try {
      let extractedId = driveFolderId
      if (driveUrl) {
        const extracted = extractGoogleDriveId(driveUrl)
        if (!extracted) {
          toast.error('Invalid Google Drive URL')
          setLoadingDrive(false)
          return
        }
        extractedId = extracted.id
      }
      const response = await googleDriveApi.listFiles(extractedId || null)
      setDriveFiles(response.files)
      toast.success(`Loaded ${response.files.length} files`)
    } catch (error) {
      toast.error('Failed to load Google Drive files: ' + error.message)
    } finally {
      setLoadingDrive(false)
    }
  }

  const fetchRagStats = async () => {
    try {
      const response = await documentApi.getRagStats()
      setRagStats(response)
    } catch (error) {
      console.error('Failed to load RAG stats:', error)
    }
  }

  const handleFileChange = (e) => {
    setFile(e.target.files[0])
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    try {
      const response = await documentApi.upload(file)
      if (response.success) {
        toast.success(response.message)
        fetchLocalDocuments()
        fetchRagStats()
        setFile(null)
      } else {
        toast.error('Upload failed')
      }
    } catch (error) {
      toast.error('Error uploading file: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (filename) => {
    try {
      if (window.confirm(`Delete document ${filename}?`)) {
        const response = await documentApi.delete(filename)
        if (response.success) {
          toast.success(response.message)
          fetchLocalDocuments()
          fetchRagStats()
        }
      }
    } catch (error) {
      toast.error('Error deleting document: ' + error.message)
    }
  }

  const openDriveLink = (fileId) => {
    window.open(`https://drive.google.com/file/d/${fileId}/view`, '_blank')
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString()
  }

  return (
    <div className="p-6 lg:p-8" style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>📄 Documents</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Upload and manage your documents for AI analysis</p>
        </div>
        {ragStats && (
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
            <FiDatabase className="w-5 h-5" style={{ color: 'var(--primary)' }} />
            <div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>RAG Collections</div>
              <div className="text-lg font-bold" style={{ color: 'var(--primary)' }}>{ragStats.total_collections}</div>
            </div>
          </div>
        )}
      </div>

      {/* RAG Statistics */}
      {ragStats && ragStats.collections && ragStats.collections.length > 0 && (
        <div className="card p-6 mb-6 animate-fade-up">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)' }}>
              <FiDatabase className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>📊 RAG Vector Database Status</h2>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Document embeddings and vector storage</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ragStats.collections.map((collection) => (
              <div key={collection.name} className="p-5 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                <div className="text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{collection.name}</div>
                <div className="text-3xl font-bold" style={{ color: '#3B82F6' }}>{collection.document_count}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>documents indexed</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6" style={{ borderBottom: '2px solid var(--border-color)' }}>
        <button
          onClick={() => setActiveTab('local')}
          className="px-6 py-3 font-medium transition-all"
          style={{
            color: activeTab === 'local' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'local' ? '3px solid var(--primary)' : '3px solid transparent',
            marginBottom: '-2px'
          }}
        >
          <div className="flex items-center gap-2">
            <FiFolder className="w-4 h-4" />
            Local Uploads ({localDocuments.length})
          </div>
        </button>
        <button
          onClick={() => setActiveTab('drive')}
          className="px-6 py-3 font-medium transition-all"
          style={{
            color: activeTab === 'drive' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'drive' ? '3px solid var(--primary)' : '3px solid transparent',
            marginBottom: '-2px'
          }}
        >
          <div className="flex items-center gap-2">
            <FiCloud className="w-4 h-4" />
            Google Drive Links ({driveFiles.length})
          </div>
        </button>
      </div>

      {/* Local Upload Section */}
      {activeTab === 'local' && (
        <>
          <div className="card p-6 mb-6 animate-fade-up">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
                <FiUpload className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>📤 Upload Document</h2>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Process and index your documents</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <input 
                type="file" 
                onChange={handleFileChange} 
                disabled={uploading} 
                className="input-neon flex-1"
                accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg"
              />
              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="btn-primary px-8 flex items-center justify-center gap-2"
                style={{
                  background: uploading ? 'var(--bg-secondary)' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  cursor: (!file || uploading) ? 'not-allowed' : 'pointer',
                  opacity: (!file || uploading) ? 0.6 : 1
                }}
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <FiUpload className="w-4 h-4" />
                    Upload & Process
                  </>
                )}
              </button>
            </div>
            <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                ✓ Supported: PDF, DOCX, TXT, MD, Images (PNG, JPG, JPEG)
              </span>
            </div>
          </div>

          <div className="card p-6 animate-fade-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>📄 Local Documents</h2>
              <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                {localDocuments.length} files
              </span>
            </div>
            {localDocuments.length === 0 ? (
              <div className="text-center py-16">
                <FiFile className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                <p className="text-lg font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>No documents uploaded yet</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Upload a document above to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {localDocuments.map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-xl hover:scale-[1.01] transition-all" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--primary)' }}>
                        <FiFile className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{doc.filename}</div>
                        <div className="text-sm flex items-center gap-3 mt-1" style={{ color: 'var(--text-muted)' }}>
                          <span>{formatFileSize(doc.size)}</span>
                          <span>•</span>
                          <span>{formatDate(doc.modified)}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(doc.filename)}
                      className="p-2 rounded-lg hover:scale-110 transition-all"
                      style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Google Drive Section */}
      {activeTab === 'drive' && (
        <>
          <div className="card p-6 mb-6 animate-fade-up">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}>
                <FiCloud className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>☁️ Google Drive Integration</h2>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Connect to your Google Drive folders</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  Google Drive Folder ID
                </label>
                <div className="flex flex-col sm:flex-row gap-4">
                  <input
                    type="text"
                    className="input-neon flex-1"
                    placeholder="Enter folder ID or paste Drive URL"
                    value={driveFolderId}
                    onChange={(e) => setDriveFolderId(e.target.value)}
                  />
                  <button
                    onClick={fetchDriveFiles}
                    disabled={loadingDrive}
                    className="btn-primary px-8 flex items-center justify-center gap-2"
                    style={{
                      background: loadingDrive ? 'var(--bg-secondary)' : 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
                    }}
                  >
                    {loadingDrive ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Loading...
                      </>
                    ) : (
                      <>
                        <FiRefreshCw className="w-4 h-4" />
                        Fetch Files
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="rounded-xl p-4" style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.05) 100%)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <p className="font-semibold mb-2">💡 How to get a folder ID:</p>
                  <p>1. Open the folder in Google Drive</p>
                  <p>2. Copy the ID from URL: <span className="font-mono" style={{ color: 'var(--primary)' }}>drive.google.com/drive/folders/[FOLDER_ID]</span></p>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-6 animate-fade-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>📁 Google Drive Files</h2>
              <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                {driveFiles.length} files
              </span>
            </div>
            {driveFiles.length === 0 ? (
              <div className="text-center py-16">
                <FiCloud className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                <p className="text-lg font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>No Google Drive files loaded</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Enter a folder ID and click "Fetch Files" above</p>
              </div>
            ) : (
              <div className="space-y-3">
                {driveFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-4 rounded-xl hover:scale-[1.01] transition-all" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#F59E0B' }}>
                        <FiCloud className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{file.name}</div>
                        <div className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                          {file.mimeType || 'Unknown type'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => openDriveLink(file.id)}
                      className="px-4 py-2 rounded-lg flex items-center gap-2 hover:scale-105 transition-all"
                      style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' }}
                    >
                      <span className="text-sm font-medium">Open</span>
                      <FiExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
