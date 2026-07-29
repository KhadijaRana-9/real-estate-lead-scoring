import { useState } from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FiVolume2, FiVolumeX } from 'react-icons/fi'
import AttachmentRenderer from './attachments/AttachmentRenderer'
import { speak, stopSpeaking, speechSynthesisSupported } from '../../utils/speech'

export default function ChatMessage({ role, content, attachments }) {
  const isUser = role === 'user'
  const [speaking, setSpeaking] = useState(false)

  const toggleSpeak = () => {
    if (speaking) {
      stopSpeaking()
      setSpeaking(false)
      return
    }
    speak(content)
    setSpeaking(true)
    // No onend hook here (SpeechSynthesisUtterance would need to survive
    // this render), so approximate the icon reset with a rough duration -
    // good enough for a secondary affordance, not the primary interaction.
    const estimatedMs = Math.min(20000, Math.max(1500, content.length * 55))
    setTimeout(() => setSpeaking(false), estimatedMs)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`group relative max-w-[92%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'rounded-br-sm bg-brand-600 text-white'
            : 'rounded-bl-sm bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <>
            <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-headings:my-2 dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || ' '}</ReactMarkdown>
            </div>
            <AttachmentRenderer attachments={attachments} />
            {speechSynthesisSupported && content && (
              <button
                type="button"
                onClick={toggleSpeak}
                title={speaking ? 'Stop reading aloud' : 'Read aloud'}
                aria-label={speaking ? 'Stop reading aloud' : 'Read aloud'}
                className="absolute -bottom-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-900"
              >
                {speaking ? <FiVolumeX size={12} /> : <FiVolume2 size={12} />}
              </button>
            )}
          </>
        )}
      </div>
    </motion.div>
  )
}
