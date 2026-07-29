import { useState } from 'react'
import { motion } from 'framer-motion'
import { FiSend, FiMic } from 'react-icons/fi'
import useSpeechRecognition from '../../hooks/useSpeechRecognition'

export default function ChatInput({ onSend, disabled }) {
  const [value, setValue] = useState('')
  const { supported: micSupported, listening, start, stop } = useSpeechRecognition({
    onResult: (transcript) => setValue((prev) => (prev ? `${prev} ${transcript}` : transcript)),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-gray-200 p-3 dark:border-gray-800">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        placeholder={listening ? 'Listening...' : 'Ask about listings, leads, or your dashboard...'}
        className="max-h-28 flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-brand-400 dark:border-gray-700 dark:bg-gray-800"
      />
      {micSupported && (
        <motion.button
          type="button"
          onClick={listening ? stop : start}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title={listening ? 'Stop listening' : 'Speak your question'}
          aria-label={listening ? 'Stop voice input' : 'Start voice input'}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-sm transition-colors ${
            listening
              ? 'animate-pulse border-red-400 bg-red-50 text-red-600 dark:border-red-700 dark:bg-red-950 dark:text-red-400'
              : 'border-gray-200 bg-gray-50 text-gray-500 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400'
          }`}
        >
          <FiMic size={16} />
        </motion.button>
      )}
      <motion.button
        type="submit"
        disabled={disabled || !value.trim()}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white disabled:opacity-40"
      >
        <FiSend size={16} />
      </motion.button>
    </form>
  )
}
