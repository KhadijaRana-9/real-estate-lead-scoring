import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import FloatingAIButton from './FloatingAIButton'
import ChatWindow from './ChatWindow'

// Only rendered for authenticated users - the assistant needs a role and
// tenant context to be useful (and safe: tool access is gated by role on
// the backend regardless, but there's nothing for an anonymous visitor
// to usefully ask).
export default function AIAssistant() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)

  if (!user) return null

  return (
    <>
      <FloatingAIButton open={open} onClick={() => setOpen((v) => !v)} />
      <AnimatePresence>{open && <ChatWindow onClose={() => setOpen(false)} />}</AnimatePresence>
    </>
  )
}
