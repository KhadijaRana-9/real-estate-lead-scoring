import { motion } from 'framer-motion'
import { FiCheck } from 'react-icons/fi'

const STEPS = ['Owner Information', 'Agency Information', 'Verification']

export default function RegistrationProgressBar({ currentStep }) {
  const percent = Math.round((currentStep / STEPS.length) * 100)

  return (
    <div className="border-b border-gray-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-gray-800 dark:bg-gray-950/90 sm:px-6">
      <div className="mb-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>Step {currentStep} of {STEPS.length}</span>
        <span>{percent}% complete</span>
      </div>

      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <motion.div
          className="h-full rounded-full bg-brand-600"
          initial={false}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        />
      </div>

      <div className="hidden items-center gap-1 overflow-x-auto sm:flex">
        {STEPS.map((label, i) => {
          const stepNum = i + 1
          const completed = stepNum < currentStep
          const active = stepNum === currentStep
          return (
            <div key={label} className="flex flex-1 items-center gap-1 last:flex-none">
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                    completed
                      ? 'bg-brand-600 text-white'
                      : active
                        ? 'bg-brand-100 text-brand-700 ring-2 ring-brand-500 dark:bg-brand-900 dark:text-brand-300'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                >
                  {completed ? <FiCheck size={11} /> : stepNum}
                </span>
                <span className={`text-xs ${active ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-500'}`}>{label}</span>
              </div>
              {stepNum < STEPS.length && <div className={`mx-1 h-px flex-1 ${completed ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-800'}`} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export { STEPS }
