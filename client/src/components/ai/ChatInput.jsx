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
    <form onSubmit={handleSubmit} className="p-3">
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1.5 pl-5 pr-1.5 shadow-[0_0_25px_rgba(16,185,129,0.15)] backdrop-blur-xl">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={listening ? 'Listening...' : 'Ask anything...'}
          className="max-h-24 flex-1 resize-none bg-transparent py-1.5 text-sm text-white placeholder-white/40 outline-none"
        />
        {micSupported && (
          <motion.button
            type="button"
            onClick={listening ? stop : start}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={listening ? 'Stop listening' : 'Speak your question'}
            aria-label={listening ? 'Stop voice input' : 'Start voice input'}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
              listening ? 'animate-pulse bg-red-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
            }`}
          >
            <FiMic size={15} />
          </motion.button>
        )}
        <motion.button
          type="submit"
          disabled={disabled || !value.trim()}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-emerald-600 text-white shadow-lg shadow-brand-500/30 disabled:opacity-30"
        >
          <FiSend size={14} />
        </motion.button>
      </div>
    </form>
  )
}
