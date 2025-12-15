import React, { useEffect, useState, useRef } from 'react'
import useChatStore from '../store/chatStore'
import { chatApi } from '../api/chatApi'
import toast from 'react-hot-toast'
import MessageBubble from '../components/chat/MessageBubble'
import { 
  FiMessageCircle, FiFileText, FiSend, FiCpu, FiDatabase, FiZap,
  FiRefreshCw, FiTrash2, FiBookmark, FiInfo, FiChevronDown
} from 'react-icons/fi'

const suggestedQuestions = [
  { category: 'Financial', questions: [
    "What is my total revenue this year?",
    "Show me my top 10 customers by balance",
    "What are my major expense categories?",
    "Calculate my profit margin"
  ]},
  { category: 'Inventory', questions: [
    "Which items have low stock?",
    "What is my inventory turnover ratio?",
    "Show me slow-moving items"
  ]},
  { category: 'Compliance', questions: [
    "What is my GST liability?",
    "Show pending TDS returns",
    "Calculate my tax obligations"
  ]}
];

export default function ChatPage() {
  const { messages, addMessage, setMessages, loading, setLoading } = useChatStore()
  const [inputValue, setInputValue] = useState('')
  const [chatMode, setChatMode] = useState('document')
  const [showSuggestions, setShowSuggestions] = useState(true)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    setMessages([
      {
        type: 'system',
        content: `👋 Welcome to TallyDash AI! I'm powered by Phi4:14b and can help you analyze your Tally data, answer financial questions, and provide insights from your documents.`,
        sources: []
      }
    ])
    inputRef.current?.focus()
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleModeChange = (mode) => {
    setChatMode(mode)
    const modeMessages = {
      general: '💬 General Chat mode activated. Ask me anything!',
      document: '📊 Document & Tally mode activated. I can now access your financial data!'
    }
    
    addMessage({
      type: 'system',
      content: modeMessages[mode],
      sources: []
    })
    toast.success(`Switched to ${mode === 'general' ? 'General' : 'Data Analysis'} mode`)
  }

  const handleSendMessage = async (e) => {
    e?.preventDefault()
    if (!inputValue.trim() || loading) return

    const query = inputValue
    addMessage({ type: 'user', content: query })
    setInputValue('')
    setShowSuggestions(false)
    setLoading(true)

    try {
      const collection = chatMode === 'general' ? 'general' : 'tally_combined'
      const response = await chatApi.chat(query, '', collection, '')
      
      if (response.success) {
        addMessage({
          type: 'ai',
          content: response.answer,
          tally_sources: response.tally_sources || [],
          document_sources: response.document_sources || []
        })
      } else {
        toast.error('Failed to get response')
        addMessage({
          type: 'system',
          content: '❌ Sorry, I couldn\'t process your request. Please try again.',
          sources: []
        })
      }
    } catch (error) {
      console.error('Chat error:', error)
      toast.error('Connection error')
      addMessage({
        type: 'system',
        content: `⚠️ ${error.message || 'An error occurred. Please check if the AI server is running.'}`,
        sources: []
      })
    } finally {
      setLoading(false)
      scrollToBottom()
    }
  }

  const handleSuggestedQuestion = (question) => {
    setInputValue(question)
    inputRef.current?.focus()
  }

  const handleClearChat = () => {
    setMessages([{
      type: 'system',
      content: '🗑️ Chat cleared. How can I help you today?',
      sources: []
    }])
    setShowSuggestions(true)
    toast.success('Chat cleared')
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Modern Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                <FiCpu className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">AI Assistant</h1>
                <p className="text-slate-500 text-sm flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  Powered by Phi4:14b
                </p>
              </div>
            </div>
            
            <button
              onClick={handleClearChat}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              title="Clear chat"
            >
              <FiTrash2 className="w-5 h-5" />
            </button>
          </div>
          
          {/* Mode Selection */}
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => handleModeChange('document')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                chatMode === 'document'
                  ? 'bg-white text-blue-600 shadow-md'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <FiDatabase className="w-4 h-4" />
              <span>Tally & Documents</span>
            </button>
            
            <button
              onClick={() => handleModeChange('general')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                chatMode === 'general'
                  ? 'bg-white text-blue-600 shadow-md'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <FiMessageCircle className="w-4 h-4" />
              <span>General Chat</span>
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* Messages */}
          {messages.map((message, index) => (
            <MessageBubble key={index} message={message} />
          ))}
          
          {/* Loading State */}
          {loading && (
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                <FiCpu className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 bg-white rounded-2xl rounded-tl-md p-4 shadow-sm border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                  <span className="text-slate-500 text-sm">Analyzing your data...</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Suggested Questions */}
          {showSuggestions && messages.length <= 1 && !loading && (
            <div className="pt-4">
              <div className="flex items-center gap-2 mb-4 text-slate-500">
                <FiZap className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium">Try asking</span>
              </div>
              <div className="grid gap-4">
                {suggestedQuestions.map((category, catIndex) => (
                  <div key={catIndex}>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{category.category}</p>
                    <div className="flex flex-wrap gap-2">
                      {category.questions.map((question, qIndex) => (
                        <button
                          key={qIndex}
                          onClick={() => handleSuggestedQuestion(question)}
                          className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white/80 backdrop-blur-xl border-t border-slate-200 p-4">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                chatMode === 'general'
                  ? 'Ask me anything...'
                  : 'Ask about your financial data, ledgers, invoices...'
              }
              className="w-full px-5 py-4 pr-14 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm text-slate-700 placeholder-slate-400"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !inputValue.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl flex items-center justify-center hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/25"
            >
              <FiSend className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex items-center justify-between mt-3 px-1">
            <p className="text-xs text-slate-400">
              {chatMode === 'document' ? (
                <span className="flex items-center gap-1">
                  <FiInfo className="w-3 h-3" />
                  Responses are based on your Tally data and uploaded documents
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <FiInfo className="w-3 h-3" />
                  General knowledge responses - no data access
                </span>
              )}
            </p>
            <p className="text-xs text-slate-400">
              Press Enter to send
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
