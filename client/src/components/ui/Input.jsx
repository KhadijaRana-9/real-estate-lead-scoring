import { forwardRef } from 'react'

// Labeled input/select/textarea wrapper with a real focus ring (most
// raw <input>s in the app currently have none) and a built-in error
// slot. Forwards ref so it drops straight into react-hook-form's
// {...register('field')} spread the same way a plain <input> would.
const FIELD_BASE =
  'w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 transition-colors placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500'

const Input = forwardRef(function Input({ label, error, as = 'input', className = '', id, children, ...rest }, ref) {
  const Tag = as
  const fieldId = id || rest.name
  const borderClasses = error
    ? 'border-danger-400 focus:ring-danger-500/40 focus:border-danger-500 dark:border-danger-700'
    : 'border-gray-300 dark:border-gray-700'

  return (
    <div className={className}>
      {label && (
        <label htmlFor={fieldId} className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <Tag ref={ref} id={fieldId} className={`${FIELD_BASE} ${borderClasses}`} {...rest}>
        {children}
      </Tag>
      {error && <p className="mt-1 text-xs text-danger-600 dark:text-danger-400">{error}</p>}
    </div>
  )
})

export default Input
