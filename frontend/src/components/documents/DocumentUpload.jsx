import React, { useState } from 'react'
import { documentApi } from '../../api/documentApi'
import Button from '../common/Button'
import toast from 'react-hot-toast'

export default function DocumentUpload({ onUploadSuccess }) {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  const handleFileChange = (e) => {
    setFile(e.target.files[0])
  }

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file')
      return
    }
    setUploading(true)
    try {
      const response = await documentApi.upload(file)
      if (response.success) {
        if (response.rag_status && response.rag_status !== 'stored_in_rag') {
          toast(response.message, {
            icon: '⚠️',
            style: {
              borderRadius: '10px',
              background: '#FFF3CD',
              color: '#856404',
            },
            duration: 5000,
          })
        } else {
          toast.success(response.message)
        }
        onUploadSuccess && onUploadSuccess()
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

  return (
    <div className="flex items-center space-x-4">
      <input
        type="file"
        accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg"
        onChange={handleFileChange}
        disabled={uploading}
        className="border border-gray-300 rounded px-3 py-2"
      />
      <Button
        onClick={handleUpload}
        disabled={uploading || !file}
        loading={uploading}
      >
        Upload
      </Button>
    </div>
  )
}
 
