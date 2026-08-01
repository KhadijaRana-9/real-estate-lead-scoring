import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { FiPlus, FiMenu, FiTrash2, FiStar, FiX } from 'react-icons/fi'
import * as api from '../../api/endpoints'
import { streamChat } from '../../api/aiStream'
import { useAuth } from '../../context/AuthContext'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'
import TypingIndicator from './TypingIndicator'
import SuggestedPrompts from './SuggestedPrompts'
import AiOrb from './AiOrb'
import { EASE } from '../../motion/variants'

export default function ChatWindow({ onClose }) {
  const { user } = useAuth()
  const [conversationId, setConversationId] = useState(null)
  const [messages, setMessages] = useState([])
  const [streaming, setStreaming] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [conversations, setConversations] = useState([])
  const [loadingConversations, setLoadingConversations] = useState(false)
  const scrollRef = useRef(null)
  const abortRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, streaming])

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  const loadConversations = async () => {
    setLoadingConversations(true)
    try {
      const { data } = await api.getAiConversations()
      setConversations(data)
    } catch {
      toast.error('Could not load conversation history')
    } finally {
      setLoadingConversations(false)
    }
  }

  const toggleSidebar = () => {
    setSidebarOpen((v) => !v)
    if (!sidebarOpen) loadConversations()
  }

  const openConversation = async (id) => {
    try {
      const { data } = await api.getAiConversation(id)
      setConversationId(data._id)
      setMessages(data.messages)
      setSidebarOpen(false)
    } catch {
      toast.error('Could not load that conversation')
    }
  }

  const startNewConversation = () => {
    setConversationId(null)
    setMessages([])
    setSidebarOpen(false)
  }

  const togglePin = async (e, convo) => {
    e.stopPropagation()
    try {
      await api.updateAiConversation(convo._id, { pinned: !convo.pinned })
      loadConversations()
    } catch {
      toast.error('Could not update conversation')
    }
  }

  const deleteConversation = async (e, id) => {
    e.stopPropagation()
    try {
      await api.deleteAiConversation(id)
      if (id === conversationId) startNewConversation()
      loadConversations()
    } catch {
      toast.error('Could not delete conversation')
    }
  }

  const send = async (text) => {
    setMessages((prev) => [...prev, { role: 'user', content: text }, { role: 'assistant', content: '' }])
    setStreaming(true)
    abortRef.current = new AbortController()

    try {
      await streamChat({
        message: text,
        conversationId,
        signal: abortRef.current.signal,
        onMeta: (cid) => setConversationId((prev) => prev || cid),
        onChunk: (_chunk, fullText) => {
          setMessages((prev) => {
            const next = [...prev]
            next[next.length - 1] = { ...next[next.length - 1], role: 'assistant', content: fullText }
            return next
          })
        },
        onAttachments: (attachments) => {
          setMessages((prev) => {
            const next = [...prev]
            next[next.length - 1] = { ...next[next.length - 1], role: 'assistant', attachments }
            return next
          })
        },
      })
    } catch (err) {
      if (err.name !== 'AbortError') {
        toast.error(err.message || 'AI request failed - please try again')
        setMessages((prev) => prev.slice(0, -1))
      }
    } finally {
      setStreaming(false)
    }
  }

  const firstName = user?.name ? user.name.split(' ')[0] : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.97 }}
      transition={{ duration: 0.25, ease: EASE }}
      // Deliberately always dark, regardless of the site's own light/dark
      // toggle - like Siri/Perplexity's assistant surface, this commits
      // to one premium look rather than trying to keep a glowing orb
      // readable against a white background. The literal `dark` class
      // here (not just `dark:` utilities) cascades Tailwind's dark
      // variant to every descendant via the `dark, .dark *` custom
      // variant in index.css, so existing dark: styles throughout
      // ChatMessage/SuggestedPrompts/etc. activate unconditionally.
      className="dark fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#050807] shadow-2xl sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[640px] sm:max-h-[80vh] sm:w-96 sm:rounded-3xl sm:border sm:border-white/10"
    >
      {/* Ambient glow backdrop */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-64 w-80 -translate-x-1/2 rounded-full bg-brand-500/20 blur-[80px]" />
        <div className="absolute bottom-0 right-0 h-56 w-56 rounded-full bg-emerald-500/10 blur-[80px]" />
      </div>

      <div className="relative flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-4 py-3 backdrop-blur-xl">
        <button onClick={toggleSidebar} aria-label="Conversation history" className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white">
          <FiMenu size={18} />
        </button>
        <p className="text-sm font-semibold text-white">AI Assistant</p>
        <div className="flex items-center gap-1">
          <button onClick={startNewConversation} aria-label="New conversation" className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white">
            <FiPlus size={18} />
          </button>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white sm:hidden">
            <FiX size={18} />
          </button>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {sidebarOpen && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-10 overflow-y-auto bg-[#050807] p-2"
          >
            {loadingConversations ? (
              <div className="space-y-2 p-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded-lg bg-white/5" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <p className="p-4 text-center text-sm text-white/40">No conversations yet</p>
            ) : (
              conversations.map((c) => (
                <button
                  key={c._id}
                  onClick={() => openConversation(c._id)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/80 hover:bg-white/10"
                >
                  <span className="truncate">{c.title}</span>
                  <span className="flex shrink-0 gap-1 text-white/40">
                    <span onClick={(e) => togglePin(e, c)} className={c.pinned ? 'text-amber-400' : ''}>
                      <FiStar size={14} />
                    </span>
                    <span onClick={(e) => deleteConversation(e, c._id)} className="hover:text-red-400">
                      <FiTrash2 size={14} />
                    </span>
                  </span>
                </button>
              ))
            )}
          </motion.div>
        )}

        <div ref={scrollRef} className="relative h-full space-y-3 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-6 px-2 text-center">
              <AiOrb />
              <div>
                {firstName && <p className="text-sm text-white/50">Hello {firstName}</p>}
                <p className="mt-1 text-xl font-semibold text-white">How can I help you today?</p>
              </div>
              <SuggestedPrompts role={user?.role} onSelect={send} />
            </div>
          ) : (
            messages.map((m, i) => {
              const isLastStreaming = streaming && i === messages.length - 1 && m.role === 'assistant'
              return isLastStreaming && !m.content ? (
                <TypingIndicator key={i} />
              ) : (
                <ChatMessage key={i} role={m.role} content={m.content} attachments={m.attachments} />
              )
            })
          )}
        </div>
      </div>

      <div className="relative">
        <ChatInput onSend={send} disabled={streaming} />
      </div>
    </motion.div>
  )
}
