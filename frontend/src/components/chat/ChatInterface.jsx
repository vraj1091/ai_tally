import React, { useState, useEffect, useRef } from 'react'
import useChatStore from '../../store/chatStore'
import InputBox from './InputBox'
import MessageBubble from './MessageBubble'
import SourceAttribution from './SourceAttribution'
import TypingIndicator from './TypingIndicator'

export default function ChatInterface() {
  const {
    messages,
    addMessage,
    loading,
    setLoading,
    selectedCompany
  } = useChatStore()

  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (e) => {
    e.preventDefault()
    if (!inputValue.trim() || loading) return

    addMessage({ type: 'user', content: inputValue })
    setLoading(true)
    setInputValue('')

    // TODO: integrate actual backend call here

    setTimeout(() => {
      addMessage({
        type: 'ai',
        content: 'This is a placeholder AI response.',
        tally_sources: [],
        document_sources: []
      })
      setLoading(false)
    }, 1000)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-12">
            Select a company and start chatting.
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className="flex flex-col">
            <MessageBubble message={msg} />
            {msg.type === 'ai' && (
              <SourceAttribution
                tallySources={msg.tally_sources}
                documentSources={msg.document_sources}
              />
            )}
          </div>
        ))}
        {loading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>
      <InputBox
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onSubmit={handleSend}
        disabled={loading}
      />
    </div>
  )
}
 
