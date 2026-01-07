import React from 'react'
import { FiUser, FiCpu, FiInfo, FiDatabase, FiFileText } from 'react-icons/fi'

/**
 * Parse and render markdown-like content to React elements
 */
const formatContent = (text) => {
  if (!text) return null;
  
  // Split by lines
  const lines = text.split('\n');
  const elements = [];
  let listItems = [];
  let listType = null; // 'ul' or 'ol'
  let currentListNumber = 0;
  
  const flushList = () => {
    if (listItems.length > 0) {
      if (listType === 'ol') {
        elements.push(
          <ol key={`list-${elements.length}`} className="list-decimal list-inside space-y-2 my-3 pl-2">
            {listItems}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-2 my-3 pl-2">
            {listItems}
          </ul>
        );
      }
      listItems = [];
      listType = null;
      currentListNumber = 0;
    }
  };
  
  lines.forEach((line, index) => {
    // Check for numbered list (1. or 1) style)
    const numberedMatch = line.match(/^(\d+)[.)]\s*(.+)/);
    // Check for bullet list (- or * style)
    const bulletMatch = line.match(/^[-*•]\s*(.+)/);
    // Check for sub-bullet (  - style with indent)
    const subBulletMatch = line.match(/^\s{2,}[-*•]\s*(.+)/);
    
    if (numberedMatch) {
      if (listType !== 'ol') {
        flushList();
        listType = 'ol';
      }
      const content = formatInlineText(numberedMatch[2]);
      listItems.push(
        <li key={`item-${index}`} className="text-gray-700 leading-relaxed">
          {content}
        </li>
      );
    } else if (bulletMatch || subBulletMatch) {
      if (listType !== 'ul') {
        flushList();
        listType = 'ul';
      }
      const content = formatInlineText(bulletMatch ? bulletMatch[1] : subBulletMatch[1]);
      listItems.push(
        <li key={`item-${index}`} className={`text-gray-700 leading-relaxed ${subBulletMatch ? 'ml-4' : ''}`}>
          {content}
        </li>
      );
    } else {
      flushList();
      
      // Check for headers
      if (line.startsWith('###')) {
        elements.push(
          <h4 key={`h4-${index}`} className="font-semibold text-gray-800 mt-4 mb-2">
            {formatInlineText(line.replace(/^###\s*/, ''))}
          </h4>
        );
      } else if (line.startsWith('##')) {
        elements.push(
          <h3 key={`h3-${index}`} className="font-bold text-gray-900 text-lg mt-4 mb-2">
            {formatInlineText(line.replace(/^##\s*/, ''))}
          </h3>
        );
      } else if (line.startsWith('#')) {
        elements.push(
          <h2 key={`h2-${index}`} className="font-bold text-gray-900 text-xl mt-4 mb-3">
            {formatInlineText(line.replace(/^#\s*/, ''))}
          </h2>
        );
      } else if (line.trim() === '') {
        // Empty line - add some spacing
        elements.push(<div key={`space-${index}`} className="h-2" />);
      } else {
        // Regular paragraph
        elements.push(
          <p key={`p-${index}`} className="text-gray-700 leading-relaxed my-2">
            {formatInlineText(line)}
          </p>
        );
      }
    }
  });
  
  flushList(); // Flush any remaining list items
  
  return elements;
};

/**
 * Format inline text (bold, italic, code, etc.)
 */
const formatInlineText = (text) => {
  if (!text) return null;
  
  const parts = [];
  let remaining = text;
  let key = 0;
  
  // Process text with regex for **bold**, *italic*, `code`, and ₹ currency
  const patterns = [
    { regex: /\*\*([^*]+)\*\*/g, wrapper: (match, content) => <strong key={key++} className="font-semibold text-gray-900">{content}</strong> },
    { regex: /\*([^*]+)\*/g, wrapper: (match, content) => <em key={key++} className="italic">{content}</em> },
    { regex: /`([^`]+)`/g, wrapper: (match, content) => <code key={key++} className="bg-gray-200 px-1.5 py-0.5 rounded text-sm font-mono text-purple-700">{content}</code> },
    { regex: /(₹[\d,]+\.?\d*(?:\s*(?:Cr|Lakh|K|M|crore|lakh))?)/gi, wrapper: (match, content) => <span key={key++} className="font-semibold text-green-700">{content}</span> },
  ];
  
  // Simple approach: replace patterns one by one
  let result = text;
  
  // Replace **bold**
  result = result.replace(/\*\*([^*]+)\*\*/g, '⟪BOLD⟫$1⟪/BOLD⟫');
  // Replace *italic* (but not ** which we already handled)
  result = result.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '⟪ITALIC⟫$1⟪/ITALIC⟫');
  // Replace `code`
  result = result.replace(/`([^`]+)`/g, '⟪CODE⟫$1⟪/CODE⟫');
  
  // Now split and process
  const tokens = result.split(/(⟪BOLD⟫|⟪\/BOLD⟫|⟪ITALIC⟫|⟪\/ITALIC⟫|⟪CODE⟫|⟪\/CODE⟫)/);
  
  let inBold = false;
  let inItalic = false;
  let inCode = false;
  
  tokens.forEach((token, idx) => {
    if (token === '⟪BOLD⟫') { inBold = true; return; }
    if (token === '⟪/BOLD⟫') { inBold = false; return; }
    if (token === '⟪ITALIC⟫') { inItalic = true; return; }
    if (token === '⟪/ITALIC⟫') { inItalic = false; return; }
    if (token === '⟪CODE⟫') { inCode = true; return; }
    if (token === '⟪/CODE⟫') { inCode = false; return; }
    
    if (token) {
      if (inBold) {
        parts.push(<strong key={key++} className="font-semibold text-gray-900">{token}</strong>);
      } else if (inItalic) {
        parts.push(<em key={key++} className="italic">{token}</em>);
      } else if (inCode) {
        parts.push(<code key={key++} className="bg-purple-100 px-1.5 py-0.5 rounded text-sm font-mono text-purple-700">{token}</code>);
      } else {
        // Highlight currency values
        const currencyParts = token.split(/(₹[\d,]+\.?\d*(?:\s*(?:Cr|Lakh|K|M|crore|lakh))?)/gi);
        currencyParts.forEach((part, cidx) => {
          if (part.match(/^₹[\d,]+\.?\d*/i)) {
            parts.push(<span key={key++} className="font-semibold text-emerald-600">{part}</span>);
          } else if (part) {
            parts.push(<span key={key++}>{part}</span>);
          }
        });
      }
    }
  });
  
  return parts.length > 0 ? parts : text;
};

export default function MessageBubble({ message }) {
  const { type, content, tally_sources, document_sources } = message;

  // Different styles based on message type
  const getContainerStyle = () => {
    switch (type) {
      case 'user':
        return 'flex justify-end';
      case 'ai':
        return 'flex justify-start';
      case 'system':
        return 'flex justify-center';
      default:
        return 'flex justify-start';
    }
  };

  const getBubbleStyle = () => {
    switch (type) {
      case 'user':
        return 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-2xl rounded-br-md px-5 py-3 max-w-[85%] shadow-lg';
      case 'ai':
        return 'bg-white border border-gray-200 text-gray-800 rounded-2xl rounded-bl-md px-5 py-4 max-w-[85%] shadow-sm';
      case 'system':
        return 'bg-blue-50 border border-blue-200 text-blue-800 rounded-xl px-4 py-2 text-sm';
      default:
        return 'bg-gray-100 text-gray-800 rounded-xl px-4 py-3';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'user':
        return <FiUser className="w-5 h-5" />;
      case 'ai':
        return <FiCpu className="w-5 h-5" />;
      case 'system':
        return <FiInfo className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className={`${getContainerStyle()} mb-4`}>
      <div className="flex gap-3 max-w-4xl">
        {/* Avatar for AI messages */}
        {type === 'ai' && (
          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
            {getIcon()}
          </div>
        )}
        
        <div className="flex flex-col">
          {/* Message bubble */}
          <div className={getBubbleStyle()}>
            {type === 'user' ? (
              <p className="text-white leading-relaxed">{content}</p>
            ) : type === 'system' ? (
              <div className="flex items-center gap-2">
                {getIcon()}
                <span>{content}</span>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none">
                {formatContent(content)}
              </div>
            )}
          </div>
          
          {/* Sources for AI messages */}
          {type === 'ai' && (tally_sources?.length > 0 || document_sources?.length > 0) && (
            <div className="mt-3 space-y-2">
              {tally_sources?.length > 0 && (
                <div className="flex items-start gap-2 text-xs bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  <FiDatabase className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-emerald-700">Tally Sources:</span>
                    <ul className="mt-1 space-y-0.5 text-emerald-600">
                      {tally_sources.map((src, idx) => (
                        <li key={idx} className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          {src.metadata?.ledger || src.metadata?.company || 'Company Data'}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              
              {document_sources?.length > 0 && (
                <div className="flex items-start gap-2 text-xs bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  <FiFileText className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-blue-700">Document Sources:</span>
                    <ul className="mt-1 space-y-0.5 text-blue-600">
                      {document_sources.map((src, idx) => (
                        <li key={idx} className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                          {src.metadata?.source || 'Uploaded Document'}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Avatar for user messages */}
        {type === 'user' && (
          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-white shadow-md">
            {getIcon()}
          </div>
        )}
      </div>
    </div>
  );
}
