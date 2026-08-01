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
    <motion.div initial="hidden" animate="visible" variants={staggerContainer(0.06)} className="flex flex-wrap justify-center gap-2">
      {prompts.map((prompt) => (
        <motion.button
          key={prompt}
          variants={staggerItem}
          whileHover={{ scale: 1.03, y: -1 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect(prompt)}
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-left text-sm text-white/80 backdrop-blur-xl transition-colors hover:border-brand-400/50 hover:bg-white/10 hover:text-white"
        >
          {prompt}
        </motion.button>
      ))}
    </motion.div>
  )
}
