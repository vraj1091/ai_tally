import React from 'react'

export default function MessageBubble({ message }) {
  const { type, content, tally_sources, document_sources } = message

  const userStyle = "bg-primary-600 text-white self-end max-w-3/4 rounded-lg p-3"
  const aiStyle = "bg-gray-100 text-gray-900 self-start max-w-3/4 rounded-lg p-3"

  return (
    <div className={`flex flex-col ${type === 'user' ? 'items-end' : 'items-start'}`}>
      <div className={type === 'user' ? userStyle : aiStyle}>
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
      {type === 'ai' && (tally_sources?.length > 0 || document_sources?.length > 0) && (
        <div className="mt-2 text-xs text-gray-500 max-w-3/4 space-y-1">
          {tally_sources?.length > 0 && (
            <div>
              <strong>📊 Tally Sources:</strong>
              <ul className="list-disc pl-5">
                {tally_sources.map((src, idx) => (
                  <li key={idx}>{src.metadata?.ledger || src.metadata?.company || 'Company Data'}</li>
                ))}
              </ul>
            </div>
          )}
          {document_sources?.length > 0 && (
            <div>
              <strong>📄 Document Sources:</strong>
              <ul className="list-disc pl-5">
                {document_sources.map((src, idx) => (
                  <li key={idx}>{src.metadata?.source || 'Uploaded Document'}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

