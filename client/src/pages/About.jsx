import { motion } from 'framer-motion'
import { FiHome, FiSearch, FiMail, FiBarChart2 } from 'react-icons/fi'

const STEPS = [
  { icon: <FiSearch />, title: 'Search & Filter', text: 'Browse verified listings by city, price, type, and bedrooms.' },
  { icon: <FiMail />, title: 'Inquire Directly', text: 'Contact the listing agent with your budget and timeline.' },
  { icon: <FiBarChart2 />, title: 'Smart Lead Scoring', text: 'Every inquiry is scored 0–100 so agents can prioritize hot leads.' },
  { icon: <FiHome />, title: 'Manage Listings', text: 'Agents get a dashboard to add, edit, and track their properties.' },
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
          DreamHomes is a real-estate listings portal built to make property search and lead
          management simple — for customers looking for a home, and for agents managing their
          listings and inquiries.
        </p>
      </motion.div>

      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {STEPS.map((step) => (
          <div
            key={step.title}
            className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="text-2xl text-brand-600 dark:text-brand-400">{step.icon}</div>
            <h3 className="mt-3 font-semibold">{step.title}</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{step.text}</p>
          </div>
        ))}
      </div>

      <p className="mt-12 text-center text-sm text-gray-500 dark:text-gray-400">
        Built as a portfolio project demonstrating a full listings + lead-scoring workflow, end to end.
      </p>
    </div>
  )
}
