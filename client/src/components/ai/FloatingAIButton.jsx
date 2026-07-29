import { motion, AnimatePresence } from 'framer-motion'
import { FiMessageCircle, FiX } from 'react-icons/fi'

export default function FloatingAIButton({ open, onClick, hasUnread }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.94 }}
      aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg shadow-brand-600/40 sm:bottom-6 sm:right-6"
    >
      {!open && (
        <motion.span
          className="absolute inset-0 rounded-full bg-brand-500"
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={open ? 'close' : 'open'}
          initial={{ opacity: 0, rotate: -45 }}
          animate={{ opacity: 1, rotate: 0 }}
          exit={{ opacity: 0, rotate: 45 }}
          transition={{ duration: 0.15 }}
          className="relative"
        >
          {open ? <FiX size={22} /> : <FiMessageCircle size={22} />}
        </motion.span>
      </AnimatePresence>
      {hasUnread && !open && (
        <span className="absolute right-0 top-0 h-3 w-3 rounded-full border-2 border-white bg-red-500 dark:border-gray-950" />
      )}
    </motion.button>
  )
}
