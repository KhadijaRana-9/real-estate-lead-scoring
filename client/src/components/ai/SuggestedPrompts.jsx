import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '../../motion/variants'

const PROMPTS_BY_ROLE = {
  customer: [
    'Find me a 3 bedroom house in Lahore under 2 crore',
    'Show me flats in Islamabad',
    'What plots are available in Karachi?',
  ],
  agent: [
    'How many leads do I have right now?',
    'Summarize my hot leads',
    'Search my available house listings',
  ],
  agency_admin: [
    "What's our current lead breakdown?",
    'Show available listings under 50 lakh',
    'How many hot leads do we have?',
  ],
  super_admin: [
    'Give me a platform overview',
    'How many agencies are active vs trial?',
    "What's our subscription plan breakdown?",
  ],
}

export default function SuggestedPrompts({ role, onSelect }) {
  const prompts = PROMPTS_BY_ROLE[role] || PROMPTS_BY_ROLE.customer

  return (
    <motion.div initial="hidden" animate="visible" variants={staggerContainer(0.06)} className="space-y-2">
      {prompts.map((prompt) => (
        <motion.button
          key={prompt}
          variants={staggerItem}
          whileHover={{ scale: 1.02, x: 2 }}
          onClick={() => onSelect(prompt)}
          className="block w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left text-sm text-gray-700 hover:border-brand-400 hover:text-brand-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-brand-500 dark:hover:text-brand-300"
        >
          {prompt}
        </motion.button>
      ))}
    </motion.div>
  )
}
