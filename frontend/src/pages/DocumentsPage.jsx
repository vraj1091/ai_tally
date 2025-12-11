import React, { useEffect, useState } from 'react'
import { documentApi } from '../api/documentApi'
import { googleDriveApi } from '../api/googleDriveApi'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import toast from 'react-hot-toast'

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
    /**
     * Extract file/folder ID from various Google Drive URL formats:
     * - https://drive.google.com/file/d/FILE_ID/view
     * - https://drive.google.com/open?id=FILE_ID
     * - https://drive.google.com/drive/folders/FOLDER_ID
     * - https://drive.google.com/drive/u/0/folders/FOLDER_ID
     * - Direct ID
     */
    if (!url) return null
    
    // If it's already an ID (no slashes), return it
    if (!url.includes('/') && !url.includes('?')) {
      return { id: url, type: 'unknown' }
    }
    
    // File pattern: /file/d/FILE_ID/
    const fileMatch = url.match(/\/file\/d\/([^\/\?]+)/)
    if (fileMatch) {
      return { id: fileMatch[1], type: 'file' }
    }
    
    // Folder pattern: /folders/FOLDER_ID
    const folderMatch = url.match(/\/folders\/([^\/\?]+)/)
    if (folderMatch) {
      return { id: folderMatch[1], type: 'folder' }
    }
    
    // Open pattern: ?id=ID
    const openMatch = url.match(/[?&]id=([^&]+)/)
    if (openMatch) {
      return { id: openMatch[1], type: 'unknown' }
    }
    
    return null
  }

  const fetchDriveFiles = async () => {
    setLoadingDrive(true)
    try {
      let extractedId = driveFolderId
      
      // If driveUrl is provided, extract ID from it
      if (driveUrl) {
        const extracted = extractGoogleDriveId(driveUrl)
        if (!extracted) {
          toast.error('Invalid Google Drive URL. Please provide a valid folder or file link.')
          setLoadingDrive(false)
          return
        }
        extractedId = extracted.id
        
        if (extracted.type === 'file') {
          toast.info('File URL detected - fetching single file')
        } else if (extracted.type === 'folder') {
          toast.info('Folder URL detected - fetching files from folder')
        }
      }
      
      const response = await googleDriveApi.listFiles(extractedId || null)
      setDriveFiles(response.files)
      toast.success(`Loaded ${response.files.length} files from Google Drive`)
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
      } else {
        toast.error('Upload failed')
      }
    } catch (error) {
      toast.error('Error uploading file: ' + error.message)
    } finally {
      setUploading(false)
      setFile(null)
    }
  }

  const handleDelete = async (filename) => {
    try {
      if (window.confirm(`Delete document ${filename}?`)) {
        const response = await documentApi.delete(filename)
        if (response.success) {
          toast.success(response.message)
          fetchLocalDocuments()
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
        {ragStats && (
          <div className="text-sm text-gray-600">
            <span className="font-semibold">RAG Collections: {ragStats.total_collections}</span>
          </div>
        )}
      </div>

      {/* RAG Statistics */}
      {ragStats && ragStats.collections && ragStats.collections.length > 0 && (
        <Card title="📊 RAG Vector Database Status">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ragStats.collections.map((collection) => (
              <div key={collection.name} className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm font-semibold text-gray-700">{collection.name}</div>
                <div className="text-2xl font-bold text-blue-600">{collection.document_count}</div>
                <div className="text-xs text-gray-500">documents in vector DB</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('local')}
            className={`${
              activeTab === 'local'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            📁 Local Uploads ({localDocuments.length})
          </button>
          <button
            onClick={() => setActiveTab('drive')}
            className={`${
              activeTab === 'drive'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            ☁️ Google Drive Links ({driveFiles.length})
          </button>
        </nav>
      </div>

      {/* Local Upload Section */}
      {activeTab === 'local' && (
        <>
          <Card title="📤 Upload Document">
            <div className="flex items-center space-x-4">
              <input 
                type="file" 
                onChange={handleFileChange} 
                disabled={uploading} 
                className="flex-1 border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500"
                accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg"
              />
              <Button
                onClick={handleUpload}
                disabled={!file || uploading}
                loading={uploading}
              >
                {uploading ? 'Uploading...' : 'Upload & Process'}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Supported formats: PDF, DOCX, TXT, MD, Images (PNG, JPG, JPEG)
            </p>
          </Card>

          <Card title={`📄 Local Documents (${localDocuments.length})`}>
            {localDocuments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No documents uploaded yet.</p>
                <p className="text-sm mt-2">Upload a document above to get started.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {localDocuments.map((doc, idx) => (
                  <li key={idx} className="py-4 flex justify-between items-center hover:bg-gray-50 px-2 rounded">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{doc.filename}</div>
                      <div className="text-sm text-gray-500">
                        {formatFileSize(doc.size)} • {formatDate(doc.modified)}
                      </div>
                    </div>
                    <button
                      className="ml-4 px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                      onClick={() => handleDelete(doc.filename)}
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}

      {/* Google Drive Section */}
      {activeTab === 'drive' && (
        <>
          <Card title="☁️ Google Drive Integration">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Google Drive Folder ID (optional - leave empty for root)
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="text"
                    className="flex-1 border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter Google Drive folder ID"
                    value={driveFolderId}
                    onChange={(e) => setDriveFolderId(e.target.value)}
                  />
                  <Button
                    onClick={fetchDriveFiles}
                    disabled={loadingDrive}
                    loading={loadingDrive}
                  >
                    {loadingDrive ? 'Loading...' : 'Fetch Files'}
                  </Button>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                <p>💡 To get a folder ID:</p>
                <p>1. Open the folder in Google Drive</p>
                <p>2. Copy the ID from the URL: drive.google.com/drive/folders/<strong>FOLDER_ID</strong></p>
              </div>
            </div>
          </Card>

          <Card title={`📁 Google Drive Files (${driveFiles.length})`}>
            {driveFiles.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No Google Drive files loaded.</p>
                <p className="text-sm mt-2">Enter a folder ID and click "Fetch Files" to see files.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {driveFiles.map((file) => (
                  <li key={file.id} className="py-4 flex justify-between items-center hover:bg-gray-50 px-2 rounded">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{file.name}</div>
                      <div className="text-sm text-gray-500">
                        {file.mimeType || 'Unknown type'}
                      </div>
                    </div>
                    <button
                      onClick={() => openDriveLink(file.id)}
                      className="ml-4 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                    >
                      Open in Drive →
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
    
