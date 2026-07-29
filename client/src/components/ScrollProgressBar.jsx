import { motion, useScroll, useSpring } from 'framer-motion'

export default function ScrollProgressBar() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 300, damping: 40, restDelta: 0.001 })

  return (
    <motion.div
      className="fixed left-0 right-0 top-0 z-50 h-0.5 origin-left bg-gradient-to-r from-brand-400 via-brand-500 to-blue-400"
      style={{ scaleX }}
    />
  )
}
