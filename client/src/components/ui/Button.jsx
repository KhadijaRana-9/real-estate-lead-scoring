import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { buttonTap } from '../../motion/variants'

const VARIANTS = {
  primary:
    'bg-brand-600 text-white shadow-sm shadow-brand-600/30 hover:bg-brand-700 hover:shadow-md hover:shadow-brand-600/40 focus-visible:ring-brand-500/50',
  secondary:
    'bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 focus-visible:ring-gray-400/50',
  outline:
    'border border-gray-300 bg-transparent text-gray-700 hover:border-brand-400 hover:text-brand-600 dark:border-gray-700 dark:text-gray-200 dark:hover:border-brand-500 dark:hover:text-brand-400 focus-visible:ring-brand-500/50',
  ghost:
    'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 focus-visible:ring-gray-400/50',
  danger:
    'bg-danger-600 text-white shadow-sm shadow-danger-600/30 hover:bg-danger-700 hover:shadow-md hover:shadow-danger-600/40 focus-visible:ring-danger-500/50',
  success:
    'bg-success-600 text-white shadow-sm shadow-success-600/30 hover:bg-success-700 hover:shadow-md hover:shadow-success-600/40 focus-visible:ring-success-500/50',
  warning:
    'bg-warning-600 text-white shadow-sm shadow-warning-600/30 hover:bg-warning-700 hover:shadow-md hover:shadow-warning-600/40 focus-visible:ring-warning-500/50',
}

const SIZES = {
  sm: 'rounded-lg px-3 py-1.5 text-xs gap-1.5',
  md: 'rounded-lg px-4 py-2 text-sm gap-2',
  lg: 'rounded-xl px-6 py-3 text-sm gap-2',
}

const BASE =
  'inline-flex items-center justify-center font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-950 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none'

// CSS-only press/hover scale for the Link/anchor render paths (kept in
// sync with buttonTap's 1.03/0.97 values) - avoids depending on
// framer-motion's Link-wrapping API, which has shifted across major
// versions. motion.button below uses the real buttonTap variant since
// <button> is a guaranteed-stable motion target.
const LINK_SCALE = 'transition-transform duration-150 hover:scale-[1.03] active:scale-[0.97]'

function Spinner({ className = '' }) {
  return (
    <svg className={`h-3.5 w-3.5 animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', to, href, loading = false, disabled = false, className = '', children, ...rest },
  ref
) {
  const classes = `${BASE} ${VARIANTS[variant] || VARIANTS.primary} ${SIZES[size] || SIZES.md} ${className}`
  const isDisabled = disabled || loading

  if (to) {
    return (
      <Link
        ref={ref}
        to={to}
        className={`${classes} ${LINK_SCALE} ${isDisabled ? 'pointer-events-none opacity-50' : ''}`}
        aria-disabled={isDisabled || undefined}
        {...rest}
      >
        {loading && <Spinner />}
        {children}
      </Link>
    )
  }

  if (href) {
    return (
      <a ref={ref} href={href} className={`${classes} ${LINK_SCALE} ${isDisabled ? 'pointer-events-none opacity-50' : ''}`} {...rest}>
        {loading && <Spinner />}
        {children}
      </a>
    )
  }

  return (
    <motion.button ref={ref} className={classes} disabled={isDisabled} {...(isDisabled ? {} : buttonTap)} {...rest}>
      {loading && <Spinner />}
      {children}
    </motion.button>
  )
})

export default Button
