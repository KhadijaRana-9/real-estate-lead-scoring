import { motion } from 'framer-motion'
import { fadeUp, staggerContainer } from '../motion/variants'

// Wraps a section so it animates in once when scrolled into view, instead
// of animating on mount (which is wasted motion for content below the
// fold the user hasn't seen yet). `stagger` makes direct motion children
// (using the `staggerItem`/fadeUp variant) reveal one-by-one.
export default function ScrollReveal({ children, className, stagger = false, staggerChildren = 0.08, as = 'div' }) {
  const Component = motion[as] || motion.div

  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={stagger ? staggerContainer(staggerChildren) : fadeUp}
    >
      {children}
    </Component>
  )
}
