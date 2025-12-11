import React from 'react'

export default function InputBox({ value, onChange, onSubmit, disabled }) {
  return (
    <form
      onSubmit={onSubmit}
      className="flex items-center border-t border-gray-200 px-4 py-3"
    >
      <input
        type="text"
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder="Ask about Tally data or documents..."
        className="flex-1 border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-600 disabled:opacity-50"
        autoComplete="off"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="ml-3 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
      >
        Send
      </button>
    </form>
  )
}

