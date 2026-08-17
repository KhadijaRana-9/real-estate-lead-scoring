import { motion } from 'framer-motion'
import { cardHover } from '../../motion/variants'

// The de-facto "rounded-2xl border ... bg-white dark:bg-gray-900" shell
// that already repeats near-verbatim across ~18 files, extracted once.
// `interactive` opts into the shared cardHover lift (y:-6, scale:1.01).
// whileHover takes a literal target object (cardHover.hover), not a
// variant-label string, specifically so it never collides with an
// entrance `variants` (e.g. staggerItem) a caller passes through
// ...rest when this card lives inside a staggerContainer - the two
// animation concerns (entrance vs hover) stay fully independent.
export default function Card({ as = 'div', interactive = false, padding = 'p-5', className = '', children, ...rest }) {
  const base = `rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 ${padding}`

  if (interactive) {
    // `as` must be a string tag name here ('div', 'section', ...) -
    // motion[as] resolves it to the matching motion component. If a
    // caller accidentally passes an already-motion-wrapped component
    // instead (e.g. motion.div) - a real bug that shipped once and
    // crashed the whole page (framer-motion's proxy stringifies an
    // unrecognized key and tries to createElement('[object Object]')) -
    // fall back to plain motion.div rather than repeat that failure.
    const Component = typeof as === 'string' ? motion[as] || motion.div : motion.div
    return (
      <Component
        className={`${base} transition-shadow duration-300 hover:shadow-lg ${className}`}
        whileHover={cardHover.hover}
        {...rest}
      >
        {children}
      </Component>
    )
  }

  const Component = as
  return (
    <Component className={`${base} ${className}`} {...rest}>
      {children}
    </Component>
  )
}
