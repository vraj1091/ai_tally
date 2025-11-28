import React, { useEffect, useState } from 'react'
import { documentApi } from '../../api/documentApi'
import Button from '../common/Button'
import toast from 'react-hot-toast'

export default function DocumentList() {
  const [documents, setDocuments] = useState([])

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      const response = await documentApi.list()
      setDocuments(response.documents)
    } catch (error) {
      toast.error('Failed to load documents')
    }
  }

  const handleDelete = async (filename) => {
    if (!window.confirm(`Delete document "${filename}"?`)) return
    try {
      const response = await documentApi.delete(filename)
      if (response.success) {
        toast.success(response.message)
        fetchDocuments()
      }
    } catch (error) {
      toast.error('Error deleting document: ' + error.message)
    }
  }

  return (
    <div className="space-y-2">
      {documents.length === 0 ? (
        <p>No documents uploaded.</p>
      ) : (
        documents.map((doc) => (
          <div
            key={doc.filename}
            className="flex items-center justify-between p-3 bg-gray-50 rounded"
          >
            <span>{doc.filename}</span>
            <Button onClick={() => handleDelete(doc.filename)} variant="danger" size="sm">
              Delete
            </Button>
          </div>
        ))
      )}
    </div>
  )
}

