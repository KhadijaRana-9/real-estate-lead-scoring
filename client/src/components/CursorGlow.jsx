import { useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

const HOVER_STYLES = [
  { selector: 'button, [role="button"], input[type="submit"]', color: '16,185,129' },
  { selector: 'a', color: '59,130,246' },
]
const INTERACTIVE_SELECTOR = HOVER_STYLES.map((s) => s.selector).join(', ')

function matchHoverColor(target) {
  for (const style of HOVER_STYLES) {
    if (target.closest(style.selector)) return style.color
  }
  return null
}

// A restrained cursor accent: one small dot, one thin ring - nothing
// larger, no trail, no screen-blend glow (that's what made it read as an
// "oversized blob" earlier). Augments the real cursor, never hides it -
// see the accessibility note in earlier revisions of this file.
export default function CursorGlow() {
  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const ringX = useSpring(x, { stiffness: 500, damping: 40 })
  const ringY = useSpring(y, { stiffness: 500, damping: 40 })

  const [color, setColor] = useState(null)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return
    setEnabled(true)

    const handleMove = (e) => {
      x.set(e.clientX)
      y.set(e.clientY)
      const target = e.target.closest(INTERACTIVE_SELECTOR)
      setColor(target ? matchHoverColor(e.target) : null)
    }

    window.addEventListener('mousemove', handleMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMove)
  }, [x, y])

  if (!enabled) return null

  const rgb = color || '16,185,129'

  return (
    <>
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[60] h-1.5 w-1.5 rounded-full"
        style={{ x, y, translateX: '-50%', translateY: '-50%', backgroundColor: `rgb(${rgb})` }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[60] rounded-full border"
        style={{
          x: ringX,
          y: ringY,
          translateX: '-50%',
          translateY: '-50%',
          borderColor: `rgba(${rgb},0.5)`,
        }}
        animate={{ width: color ? 26 : 16, height: color ? 26 : 16 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      />
    </>
  )
}
