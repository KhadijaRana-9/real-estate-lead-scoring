import { useEffect } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'

export default function CountUpNumber({ end, duration = 1.2 }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => Math.round(v).toLocaleString())

  useEffect(() => {
    const controls = animate(count, end, { duration, ease: 'easeOut' })
    return controls.stop
  }, [end, duration])

  return <motion.span>{rounded}</motion.span>
}
