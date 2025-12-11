import React, { useEffect, useState } from 'react'
import { googleDriveApi } from '../api/googleDriveApi'
import useUIStore from '../store/uiStore'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import toast from 'react-hot-toast'

export default function GoogleDrivePage() {
  const [files, setFiles] = useState([])
  const [folderId, setFolderId] = useState('')
  const [loading, setLoading] = useState(false)
  const { sidebarOpen } = useUIStore()

  useEffect(() => {
    fetchFiles()
  }, [folderId])

  const fetchFiles = async () => {
    setLoading(true)
    try {
      const response = await googleDriveApi.listFiles(folderId || null)
      setFiles(response.files)
    } catch (error) {
      toast.error('Failed to load Google Drive files')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (fileId) => {
    try {
      toast.success('Downloading file...')
      const response = await googleDriveApi.downloadFile(fileId)
      // You can add logic to view or save file here
    } catch (error) {
      toast.error('Failed to download file')
    }
  }

  return (
    <div className={`${sidebarOpen ? '' : 'pl-4'} space-y-6`}>
      <h1 className="text-3xl font-bold text-gray-900">Google Drive</h1>

      {/* Folder ID Input */}
      <Card>
        <label htmlFor="folder-id" className="block mb-2 font-medium text-gray-700">
          Folder ID (leave empty for root)
        </label>
        <input
          id="folder-id"
          type="text"
          className="w-full p-3 border border-gray-300 rounded-md"
          placeholder="Enter Google Drive folder ID"
          value={folderId}
          onChange={(e) => setFolderId(e.target.value)}
        />
        <Button onClick={fetchFiles} className="mt-3 btn-primary" disabled={loading}>
          {loading ? 'Fetching...' : 'Fetch Files'}
        </Button>
      </Card>

      {/* File List */}
      <Card title={`Files (${files.length})`}>
        {files.length === 0 ? (
          <p>No files found</p>
        ) : (
          <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {files.map((file) => (
              <li key={file.id} className="flex justify-between items-center py-2">
                <span>{file.name}</span>
                <button
                  onClick={() => handleDownload(file.id)}
                  className="text-primary-600 hover:text-primary-700"
                >
                  Download
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
 
