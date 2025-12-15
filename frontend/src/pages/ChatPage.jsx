import React, { useEffect, useState, useRef } from 'react'
import useChatStore from '../store/chatStore'
import { chatApi } from '../api/chatApi'
import toast from 'react-hot-toast'
import MessageBubble from '../components/chat/MessageBubble'
import { 
  FiMessageCircle, FiDatabase, FiSend, FiCpu, FiZap, FiTrash2,
  FiSparkles, FiCommand, FiCornerDownLeft, FiRefreshCw
} from 'react-icons/fi'

const quickPrompts = [
  { label: 'Revenue Summary', prompt: 'What is my total revenue this year?' },
  { label: 'Top Customers', prompt: 'Show my top 10 customers by balance' },
  { label: 'Expense Breakdown', prompt: 'What are my major expense categories?' },
  { label: 'Profit Analysis', prompt: 'Calculate my profit margin and trends' },
  { label: 'Outstanding Dues', prompt: 'List all outstanding receivables' },
  { label: 'Cash Position', prompt: 'What is my current cash position?' },
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
      content: `Hey there! 👋 I'm your AI financial assistant powered by Phi4:14b. I can analyze your Tally data, answer questions about your finances, and help you make better business decisions. What would you like to know?`
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
    setMessages([{ type: 'system', content: '🧹 Chat cleared. How can I help you today?' }])
    toast.success('Chat cleared')
  }

  return (
    <div className="flex flex-col h-full bg-[#0F0F0F] text-white">
      {/* Header */}
      <header className="flex-shrink-0 px-6 py-4 border-b border-white/10 backdrop-blur-xl bg-black/50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <FiCpu className="w-6 h-6" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#0F0F0F] animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold">AI Assistant</h1>
              <p className="text-white/40 text-sm flex items-center gap-2">
                <FiZap className="w-3 h-3 text-amber-400" />
                Phi4:14b • Ready
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Mode Toggle */}
            <div className="flex p-1 bg-white/5 rounded-xl border border-white/10">
              <button onClick={() => setMode('data')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  mode === 'data' ? 'bg-white text-black' : 'text-white/60 hover:text-white'
                }`}>
                <FiDatabase className="w-4 h-4" />
                Data Mode
              </button>
              <button onClick={() => setMode('general')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  mode === 'general' ? 'bg-white text-black' : 'text-white/60 hover:text-white'
                }`}>
                <FiMessageCircle className="w-4 h-4" />
                General
              </button>
            </div>

            <button onClick={clearChat}
              className="p-3 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              title="Clear chat">
              <FiTrash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] ${
                msg.type === 'user' 
                  ? 'bg-gradient-to-br from-violet-500 to-purple-600 rounded-3xl rounded-br-lg' 
                  : msg.type === 'system'
                  ? 'bg-white/5 border border-white/10 rounded-3xl'
                  : 'bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl rounded-bl-lg'
              } px-5 py-4`}>
                {msg.type === 'ai' && (
                  <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/10">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                      <FiSparkles className="w-3 h-3" />
                    </div>
                    <span className="text-white/50 text-xs font-medium">AI Response</span>
                  </div>
                )}
                <p className="text-white/90 whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                {msg.tally_sources?.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-white/10">
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Data Sources</p>
                    <div className="flex flex-wrap gap-2">
                      {msg.tally_sources.map((s, j) => (
                        <span key={j} className="px-2 py-1 bg-white/5 rounded-lg text-xs text-white/60">
                          {s.company || s.metadata?.company || 'Tally Data'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl rounded-bl-lg px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {[0, 150, 300].map((delay) => (
                      <span key={delay} className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                    ))}
                  </div>
                  <span className="text-white/50 text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          {/* Quick Prompts - show when few messages */}
          {messages.length <= 1 && !loading && (
            <div className="pt-8">
              <p className="text-white/40 text-sm mb-4 flex items-center gap-2">
                <FiCommand className="w-4 h-4" />
                Quick prompts
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {quickPrompts.map((p, i) => (
                  <button key={i} onClick={() => handleQuickPrompt(p.prompt)}
                    className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-2xl text-left transition-all group">
                    <p className="font-medium text-white/80 group-hover:text-white transition-colors">{p.label}</p>
                    <p className="text-white/40 text-sm mt-1 truncate">{p.prompt}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-6 py-5 border-t border-white/10 backdrop-blur-xl bg-black/50">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={mode === 'data' ? 'Ask about your financial data...' : 'Ask me anything...'}
              className="w-full px-6 py-4 pr-14 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
              disabled={loading}
            />
            <button type="submit" disabled={loading || !input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center hover:shadow-lg hover:shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
              <FiSend className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-between mt-3 px-1 text-xs text-white/30">
            <span className="flex items-center gap-2">
              {mode === 'data' ? (
                <><FiDatabase className="w-3 h-3" /> Analyzing your Tally & document data</>
              ) : (
                <><FiMessageCircle className="w-3 h-3" /> General knowledge mode</>
              )}
            </span>
            <span className="flex items-center gap-2">
              <FiCornerDownLeft className="w-3 h-3" /> Enter to send
            </span>
          </div>
        </form>
      </div>
    </div>
  )
}
