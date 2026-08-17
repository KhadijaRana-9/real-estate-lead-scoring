import { motion } from 'framer-motion'
import { fadeUp, fadeIn, scaleIn, slideInLeft, slideInRight, staggerContainer } from '../motion/variants'

const VARIANTS = { fadeUp, fadeIn, scaleIn, slideInLeft, slideInRight }

// Wraps a section so it animates in once when scrolled into view, instead
// of animating on mount (which is wasted motion for content below the
// fold the user hasn't seen yet). `stagger` makes direct motion children
// (using the `staggerItem`/fadeUp variant) reveal one-by-one. `variant`
// picks which single-element entrance to use when not staggering -
// fadeUp for headings/simple content (default), scaleIn/slideInLeft/
// slideInRight for visual columns - so section reveals don't all look
// identical.
export default function ScrollReveal({
  children,
  className,
  stagger = false,
  staggerChildren = 0.08,
  variant = 'fadeUp',
  as = 'div',
  ...rest
}) {
  const Component = motion[as] || motion.div

  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={stagger ? staggerContainer(staggerChildren) : VARIANTS[variant] || fadeUp}
      {...rest}
    >
      {children}
    </Component>
  )
}
