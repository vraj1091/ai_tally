import React from 'react'

export default function TypingIndicator() {
  return (
    <div className="flex space-x-2 items-center py-2">
      <div className="w-3 h-3 bg-primary-600 rounded-full animate-bounce delay-150"></div>
      <div className="w-3 h-3 bg-primary-600 rounded-full animate-bounce delay-300"></div>
      <div className="w-3 h-3 bg-primary-600 rounded-full animate-bounce delay-450"></div>
    </div>
  )
}
