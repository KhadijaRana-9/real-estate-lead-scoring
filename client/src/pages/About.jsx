import { motion } from 'framer-motion'
import { FiHome, FiCheckCircle, FiUsers, FiBarChart2 } from 'react-icons/fi'

const STEPS = [
  { icon: <FiCheckCircle />, title: 'Choose a Plan', text: 'Pick the plan that fits your agency and start a free trial or subscribe.' },
  { icon: <FiHome />, title: 'Set Up Your Agency', text: 'Create your own branded workspace with your listings, agents, and profile.' },
  { icon: <FiUsers />, title: 'Build Your Team', text: 'Invite agents directly, or let them apply and approve them yourself.' },
  { icon: <FiBarChart2 />, title: 'Manage Leads & Listings', text: 'Every inquiry is scored 0–100 so your agents can prioritize hot leads.' },
]

export default function About() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="font-heading text-3xl font-extrabold sm:text-4xl">About DreamHomes</h1>
        <p className="mx-auto mt-4 max-w-2xl text-gray-600 dark:text-gray-300">
          DreamHomes is a SaaS platform that gives real estate agencies everything they need to run
          their business online — listings, agent and team management, explainable lead scoring, and
          a fully branded workspace of their own.
        </p>
      </motion.div>

      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {STEPS.map((step, i) => (
          <div
            key={step.title}
            className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
          >
            <motion.div
              className="pointer-events-none absolute -left-10 -top-16 h-48 w-48 rounded-full bg-[radial-gradient(circle,theme(colors.brand.400/35%),theme(colors.sky.400/20%)_45%,transparent_70%)] blur-2xl dark:bg-[radial-gradient(circle,theme(colors.brand.400/25%),theme(colors.indigo.500/20%)_45%,transparent_70%)]"
              animate={{ opacity: [0.5, 0.9, 0.5], scale: [1, 1.15, 1] }}
              transition={{ duration: 6 + i, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="relative text-2xl text-brand-600 dark:text-brand-400">{step.icon}</div>
            <h3 className="relative mt-3 font-semibold">{step.title}</h3>
            <p className="relative mt-1 text-sm text-gray-600 dark:text-gray-300">{step.text}</p>
          </div>
        ))}
      </div>

      <p className="mt-12 text-center text-sm text-gray-500 dark:text-gray-400">
        Built as a portfolio project demonstrating a full listings + lead-scoring workflow, end to end.
      </p>
    </div>
  )
}
