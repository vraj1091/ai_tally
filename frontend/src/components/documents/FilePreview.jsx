import React from 'react'

export default function FilePreview({ file }) {
  if (!file) {
    return <div>Select a file to preview</div>
  }

  const fileExt = file.filename.split('.').pop().toLowerCase()

  if (fileExt === 'pdf') {
    return (
      <iframe
        src={`/uploads/${file.filename}`}
        title={file.filename}
        className="w-full h-full border rounded"
      />
    )
  }

  if (['png', 'jpg', 'jpeg', 'gif', 'bmp'].includes(fileExt)) {
    return (
      <img
        src={`/uploads/${file.filename}`}
        alt={file.filename}
        className="max-w-full max-h-full rounded shadow"
      />
    )
  }

  return <div>No preview available for this file type.</div>
}
 
