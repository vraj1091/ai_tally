import React from 'react'

export default function SourceAttribution({ tallySources, documentSources }) {
  return (
    <div className="text-xs text-gray-500 mt-2">
      {tallySources && tallySources.length > 0 && (
        <div className="mb-1">
          <strong>📊 Tally Sources:</strong>
          <ul className="list-disc pl-5">
            {tallySources.map((src, idx) => (
              <li key={idx}>
                {src.metadata?.ledger || src.metadata?.company || 'Company Data'}
              </li>
            ))}
          </ul>
        </div>
      )}
      {documentSources && documentSources.length > 0 && (
        <div>
          <strong>📄 Document Sources:</strong>
          <ul className="list-disc pl-5">
            {documentSources.map((src, idx) => (
              <li key={idx}>{src.metadata?.source || 'Uploaded Document'}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
 
