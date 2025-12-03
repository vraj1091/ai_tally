import React, { useEffect, useState, useRef } from 'react'
import useChatStore from '../store/chatStore'
import { chatApi } from '../api/chatApi'
import toast from 'react-hot-toast'
import Button from '../components/common/Button'
import MessageBubble from '../components/chat/MessageBubble'
import { FiMessageCircle, FiFileText } from 'react-icons/fi'

export default function ChatPage() {
  const { messages, addMessage, setMessages, loading, setLoading } = useChatStore()
  const [inputValue, setInputValue] = useState('')
  const [chatMode, setChatMode] = useState('general') // 'general' or 'document'
  const messagesEndRef = useRef(null)

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Initialize with welcome message
    setMessages([
      {
        type: 'system',
        content: `Welcome to TallyDash Pro! Select a chat mode to get started.`,
        sources: []
      }
    ])
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleModeChange = (mode) => {
    setChatMode(mode)
    const modeMessages = {
      general: 'You are now in General Chat mode. Ask me anything!',
      document: 'You are now in Document & Tally Chat mode. Ask questions about your documents and Tally data!'
    }
    
    setMessages([
      {
        type: 'system',
        content: modeMessages[mode],
        sources: []
      }
    ])
    toast.success(`Switched to ${mode === 'general' ? 'General' : 'Document & Tally'} Chat`)
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    addMessage({ type: 'user', content: inputValue })
    setLoading(true)
    const query = inputValue
    setInputValue('')

    try {
      if (chatMode === 'general') {
        // General chat - no company or tally data required
        const response = await chatApi.chat(query, '', 'general', '')
        
        if (response.success) {
          addMessage({
            type: 'ai',
            content: response.answer,
            sources: []
          })
        } else {
          toast.error('Failed to get response')
        }
      } else {
        // Document & Tally chat mode
        const response = await chatApi.chat(query, '', 'tally_combined', '')
        
        if (response.success) {
          addMessage({
            type: 'ai',
            content: response.answer,
            tally_sources: response.tally_sources,
            document_sources: response.document_sources
          })
        } else {
          toast.error('Failed to get response')
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      toast.error('Chat error: ' + error.message)
      addMessage({
        type: 'system',
        content: 'Sorry, there was an error processing your message. Please try again.',
        sources: []
      })
    } finally {
      setLoading(false)
      scrollToBottom()
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header with Mode Selector */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">AI Chat Assistant</h1>
          
          {/* Mode Selection */}
          <div className="flex gap-3">
            <button
              onClick={() => handleModeChange('general')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                chatMode === 'general'
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FiMessageCircle className="w-5 h-5" />
              General Chat
            </button>
            
            <button
              onClick={() => handleModeChange('document')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                chatMode === 'document'
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FiFileText className="w-5 h-5" />
              Document & Tally Chat
            </button>
          </div>

          {/* Mode Description */}
          <p className="mt-3 text-sm text-gray-600">
            {chatMode === 'general' 
              ? '💬 Ask general questions - powered by Phi4:14b' 
              : '📄 Ask about your documents and Tally data - uses RAG with your uploaded files'}
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message, index) => (
            <MessageBubble key={index} message={message} />
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
              <span className="text-sm">Thinking...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                chatMode === 'general'
                  ? 'Ask me anything...'
                  : 'Ask about your documents or Tally data...'
              }
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={loading}
            />
            <Button
              type="submit"
              disabled={loading || !inputValue.trim()}
              variant="primary"
            >
              Send
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
