import React, { useEffect, useState, useRef } from 'react'
import useChatStore from '../store/chatStore'
import { chatApi } from '../api/chatApi'
import toast from 'react-hot-toast'
import { 
  FiMessageCircle, FiDatabase, FiSend, FiCpu, FiZap, FiTrash2,
  FiCommand, FiCornerDownLeft, FiUser, FiCircle
} from 'react-icons/fi'

const quickPrompts = [
  { label: 'Revenue Summary', prompt: 'What is my total revenue this year?', icon: '📊' },
  { label: 'Top Customers', prompt: 'Show my top 10 customers by balance', icon: '👥' },
  { label: 'Expense Breakdown', prompt: 'What are my major expense categories?', icon: '💰' },
  { label: 'Profit Analysis', prompt: 'Calculate my profit margin and trends', icon: '📈' },
  { label: 'Outstanding Dues', prompt: 'List all outstanding receivables', icon: '📋' },
  { label: 'Cash Position', prompt: 'What is my current cash position?', icon: '💵' },
]

export default function ChatPage() {
  const { messages, addMessage, setMessages, loading, setLoading } = useChatStore()
  const [input, setInput] = useState('')
  const [mode, setMode] = useState('data')
  const endRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    setMessages([{
      type: 'system',
      content: `Welcome! 👋 I'm your AI-powered financial assistant running on Phi4:14b. I can analyze your Tally data, answer complex financial queries, and help you make data-driven decisions. What would you like to explore today?`
    }])
    inputRef.current?.focus()
  }, [])

  const handleSend = async (e) => {
    e?.preventDefault()
    if (!input.trim() || loading) return

    const query = input
    addMessage({ type: 'user', content: query })
    setInput('')
    setLoading(true)

    try {
      const response = await chatApi.chat(query, '', mode === 'data' ? 'tally_combined' : 'general', '')
      
      if (response.success) {
        addMessage({
          type: 'ai',
          content: response.answer,
          tally_sources: response.tally_sources || [],
          document_sources: response.document_sources || []
        })
      } else {
        addMessage({ type: 'system', content: '❌ Failed to get response. Please try again.' })
      }
    } catch (error) {
      addMessage({ type: 'system', content: `⚠️ ${error.message || 'Connection error. Is the AI server running?'}` })
    } finally {
      setLoading(false)
    }
  }

  const handleQuickPrompt = (prompt) => {
    setInput(prompt)
    inputRef.current?.focus()
  }

  const clearChat = () => {
    setMessages([{ type: 'system', content: '🧹 Chat cleared. Ready to answer your questions!' }])
    toast.success('Chat history cleared')
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] lg:h-screen">
      {/* Header */}
      <header className="flex-shrink-0 px-6 py-4 border-b border-white/5 bg-[#0a0a0a]/50 backdrop-blur-2xl">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00F5FF] to-[#BF00FF] flex items-center justify-center shadow-lg animate-pulse-glow">
                <FiCpu className="w-7 h-7 text-white" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#00FF88] rounded-full border-2 border-[#050505] animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gradient">AI Financial Assistant</h1>
              <p className="text-white/40 text-sm flex items-center gap-2">
                <FiZap className="w-3 h-3 text-[#00FF88]" />
                Phi4:14b Model • Online
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Mode Toggle */}
            <div className="flex p-1 bg-white/5 rounded-xl border border-white/10">
              <button onClick={() => setMode('data')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  mode === 'data' 
                    ? 'bg-gradient-to-r from-[#00F5FF] to-[#BF00FF] text-white shadow-lg' 
                    : 'text-white/50 hover:text-white'
                }`}>
                <FiDatabase className="w-4 h-4" />
                Data Mode
              </button>
              <button onClick={() => setMode('general')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  mode === 'general' 
                    ? 'bg-gradient-to-r from-[#00F5FF] to-[#BF00FF] text-white shadow-lg' 
                    : 'text-white/50 hover:text-white'
                }`}>
                <FiMessageCircle className="w-4 h-4" />
                General
              </button>
            </div>

            <button onClick={clearChat}
              className="p-3 text-white/40 hover:text-[#FF6B00] hover:bg-[#FF6B00]/10 rounded-xl transition-all"
              title="Clear chat">
              <FiTrash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} animate-fade-up`}>
              <div className={`max-w-[85%] ${
                msg.type === 'user' 
                  ? 'bg-gradient-to-br from-[#00F5FF] to-[#BF00FF] rounded-3xl rounded-br-lg shadow-lg' 
                  : msg.type === 'system'
                  ? 'glass-card rounded-3xl'
                  : 'glass-card rounded-3xl rounded-bl-lg'
              } px-6 py-4`}>
                
                {/* AI Response Header */}
                {msg.type === 'ai' && (
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#BF00FF] to-[#FF00E5] flex items-center justify-center">
                      <FiCpu className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <span className="text-white/80 text-sm font-semibold">AI Response</span>
                      <span className="text-white/30 text-xs ml-2">Phi4:14b</span>
                    </div>
                  </div>
                )}
                
                {/* User Message Header */}
                {msg.type === 'user' && (
                  <div className="flex items-center gap-2 mb-2">
                    <FiUser className="w-4 h-4 text-white/80" />
                    <span className="text-white/80 text-xs font-medium">You</span>
                  </div>
                )}
                
                {/* Message Content */}
                <p className="text-white/90 whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                
                {/* Data Sources */}
                {msg.tally_sources?.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-white/10">
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
                      <FiDatabase className="w-3 h-3" /> Data Sources
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {msg.tally_sources.map((s, j) => (
                        <span key={j} className="stat-badge">
                          {s.company || s.metadata?.company || 'Tally Data'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading Animation */}
          {loading && (
            <div className="flex justify-start animate-fade-up">
              <div className="glass-card rounded-3xl rounded-bl-lg px-6 py-5">
                <div className="flex items-center gap-4">
                  <div className="flex gap-1.5">
                    {[0, 150, 300].map((delay) => (
                      <span key={delay} 
                        className="w-3 h-3 bg-gradient-to-r from-[#00F5FF] to-[#BF00FF] rounded-full animate-bounce" 
                        style={{ animationDelay: `${delay}ms` }} 
                      />
                    ))}
                  </div>
                  <span className="text-white/50 text-sm font-medium">Processing your request...</span>
                </div>
              </div>
            </div>
          )}

          {/* Quick Prompts - Show when few messages */}
          {messages.length <= 1 && !loading && (
            <div className="pt-8 animate-fade-up stagger-2">
              <p className="text-white/40 text-sm mb-5 flex items-center gap-2">
                <FiCommand className="w-4 h-4" />
                Quick Prompts — Click to start
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {quickPrompts.map((p, i) => (
                  <button key={i} onClick={() => handleQuickPrompt(p.prompt)}
                    className="glass-card p-5 text-left group hover:border-[#00F5FF]/30"
                    style={{ animationDelay: `${0.1 + i * 0.05}s` }}>
                    <span className="text-2xl mb-3 block">{p.icon}</span>
                    <p className="font-semibold text-white/90 group-hover:text-gradient transition-all mb-1">{p.label}</p>
                    <p className="text-white/40 text-sm truncate">{p.prompt}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 px-6 py-6 border-t border-white/5 bg-[#0a0a0a]/50 backdrop-blur-2xl">
        <form onSubmit={handleSend} className="max-w-5xl mx-auto">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={mode === 'data' ? 'Ask about your financial data...' : 'Ask me anything...'}
              className="input-neon w-full pr-16 py-5"
              disabled={loading}
            />
            <button type="submit" disabled={loading || !input.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 bg-gradient-to-br from-[#00F5FF] to-[#BF00FF] rounded-xl flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-[#00F5FF]/30">
              <FiSend className="w-5 h-5 text-white" />
            </button>
          </div>
          
          <div className="flex items-center justify-between mt-4 px-1 text-xs text-white/30">
            <span className="flex items-center gap-2">
              <FiCircle className="w-2 h-2 fill-current text-[#00FF88]" />
              {mode === 'data' ? 'Analyzing Tally & document data' : 'General knowledge mode'}
            </span>
            <span className="flex items-center gap-2">
              <FiCornerDownLeft className="w-3 h-3" /> Press Enter to send
            </span>
          </div>
        </form>
      </div>
    </div>
  )
}
