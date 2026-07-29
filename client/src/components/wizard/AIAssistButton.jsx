import { useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { FiZap } from 'react-icons/fi'
import * as api from '../../api/endpoints'

export default function AIAssistButton({ action, property, onSuggestion, label }) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
      const { data } = await api.propertyAssist(action, property)
      onSuggestion(data.suggestion)
      toast.success('Applied')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not generate suggestion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      disabled={loading}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className="flex items-center gap-1.5 rounded-lg border border-brand-300 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-brand-700 dark:text-brand-300 dark:hover:bg-brand-950"
    >
      <FiZap size={13} className={loading ? 'animate-pulse' : ''} />
      {loading ? 'Working...' : label}
    </motion.button>
  )
}
