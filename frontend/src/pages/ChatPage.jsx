import React, { useState, useRef, useEffect } from 'react'
import { 
  FiMessageCircle, FiSend, FiCpu, FiTrash2, FiDatabase, FiZap, FiUser, FiClock, FiRefreshCw
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import { marked } from 'marked'
import useAuthStore from '../store/authStore'

export default function ChatPage() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedMode, setSelectedMode] = useState('general')
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const { user } = useAuthStore()

  const modes = [
    { id: 'general', label: 'General Chat', icon: FiMessageCircle, color: '#3B8FF3' },
    { id: 'tally', label: 'Tally Analysis', icon: FiDatabase, color: '#34B1AA' },
    { id: 'document', label: 'Document Q&A', icon: FiZap, color: '#F29F67' }
  ]

  const suggestions = [
    { text: 'Show my revenue for this quarter', icon: FiDatabase },
    { text: 'Analyze my top 5 expenses', icon: FiCpu },
    { text: 'What is my profit margin?', icon: FiZap },
    { text: 'Compare sales by month', icon: FiRefreshCw }
  ]

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMessage = { role: 'user', content: input, timestamp: new Date() }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const token = localStorage.getItem('access_token')
      const selectedCompany = localStorage.getItem('selected_company') || ''
      let endpoint = '/api/chat/stream'
      let body = { message: input, company_name: selectedCompany, conversation_history: messages.slice(-10) }

      if (selectedMode === 'tally') {
        endpoint = '/api/tally/query'
        body = { query: input, company_name: selectedCompany }
      } else if (selectedMode === 'document') {
        endpoint = '/api/documents/query'
        body = { query: input }
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body)
      })

      if (!res.ok) throw new Error('Failed to get response')

      if (selectedMode === 'general' && res.headers.get('content-type')?.includes('text/event-stream')) {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let aiMessage = { role: 'assistant', content: '', timestamp: new Date() }
        setMessages(prev => [...prev, aiMessage])

        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.token) {
                  aiMessage.content += data.token
                  setMessages(prev => [...prev.slice(0, -1), { ...aiMessage }])
                }
              } catch {}
            }
          }
        }
      } else {
        const data = await res.json()
        const content = data.response || data.answer || data.result || 'No response received'
        setMessages(prev => [...prev, { role: 'assistant', content, timestamp: new Date() }])
      }
    } catch (error) {
      toast.error('Failed to get AI response')
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', timestamp: new Date() }])
    } finally {
      setLoading(false)
    }
  }

  const clearChat = () => {
    setMessages([])
    toast.success('Chat cleared')
  }

  const handleSuggestionClick = (suggestion) => {
    setInput(suggestion)
    inputRef.current?.focus()
  }

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
            <FiMessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>AI Assistant</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Powered by Phi4:14b</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {modes.map(mode => (
            <button
              key={mode.id}
              onClick={() => setSelectedMode(mode.id)}
              className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all"
              style={{
                background: selectedMode === mode.id ? mode.color : 'var(--bg-tertiary)',
                color: selectedMode === mode.id ? 'white' : 'var(--text-secondary)',
                border: '1px solid var(--border-color)'
              }}
            >
              <mode.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{mode.label}</span>
            </button>
          ))}
          <button onClick={clearChat} className="btn-ghost p-2" title="Clear chat">
            <FiTrash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6" style={{ background: 'var(--bg-primary)' }}>
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6" style={{ background: 'var(--gradient-primary)' }}>
              <FiCpu className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Welcome to AI Chat</h2>
            <p className="mb-8" style={{ color: 'var(--text-muted)' }}>Ask me anything about your financial data, Tally reports, or documents.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => handleSuggestionClick(s.text)} className="card p-4 text-left group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(242, 159, 103, 0.15)' }}>
                      <s.icon className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                    </div>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{s.text}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--gradient-primary)' }}>
                    <FiCpu className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                  <div className="card p-4" style={{ 
                    background: msg.role === 'user' ? 'var(--primary)' : 'var(--bg-secondary)',
                    color: msg.role === 'user' ? 'white' : 'var(--text-primary)'
                  }}>
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm max-w-none" style={{ color: 'var(--text-primary)' }} dangerouslySetInnerHTML={{ __html: marked.parse(msg.content) }} />
                    ) : (
                      <p>{msg.content}</p>
                    )}
                  </div>
                  <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                    <FiClock className="w-3 h-3" />
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--gradient-dark)' }}>
                    <FiUser className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
                  <FiCpu className="w-4 h-4 text-white" />
                </div>
                <div className="card p-4">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--primary)', animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--primary)', animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--primary)', animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)' }}>
        <div className="max-w-4xl mx-auto flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask me anything..."
            disabled={loading}
            className="input-neon flex-1"
          />
          <button onClick={sendMessage} disabled={!input.trim() || loading} className="btn-primary px-6 flex items-center gap-2">
            <FiSend className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </div>
    </div>
  )
}
