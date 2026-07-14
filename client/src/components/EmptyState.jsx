import { FiInbox } from 'react-icons/fi'

export default function EmptyState({ icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center dark:border-gray-700 dark:bg-gray-900">
      <div className="text-4xl text-gray-300 dark:text-gray-700">{icon ?? <FiInbox />}</div>
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">{title}</h3>
      {message && <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">{message}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
