import { motion } from 'framer-motion'

// Deterministic pseudo-random sparkle layout - fixed seed so it doesn't
// reshuffle on every re-render (which would read as flickering, not
// "alive"). Positions/timings only need to look organic, not be truly random.
const SPARKLES = Array.from({ length: 18 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  top: `${(i * 53) % 100}%`,
  delay: (i % 6) * 0.6,
  duration: 3 + (i % 4),
}))

// Slow-drifting blurred gradient blobs + soft sparkles, fixed behind
// content. Deliberately reserved for marketing-surface pages (Home,
// About, auth) - NOT the dashboard or listings grid, where a moving
// background would compete with dense data and hurt perceived
// performance. Real SaaS products (Linear, Stripe) keep this treatment
// on marketing pages only. Everything here animates transform/opacity
// only, so it stays GPU-accelerated and cheap even with many elements.
export default function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <motion.div
        className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-300/8 blur-3xl dark:bg-brand-700/20"
        animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute right-[-10%] top-1/4 h-[28rem] w-[28rem] rounded-full bg-blue-300/6 blur-3xl dark:bg-blue-700/15"
        animate={{ x: [0, -30, 0], y: [0, 40, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-[-15%] left-1/3 h-96 w-96 rounded-full bg-brand-400/6 blur-3xl dark:bg-brand-800/20"
        animate={{ x: [0, 25, 0], y: [0, -25, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />

      {SPARKLES.map((s, i) => (
        <motion.span
          key={i}
          className="absolute h-1 w-1 rounded-full bg-brand-400/20 dark:bg-brand-300/50"
          style={{ left: s.left, top: s.top }}
          animate={{ opacity: [0, 0.9, 0], scale: [0.5, 1.2, 0.5] }}
          transition={{ duration: s.duration, repeat: Infinity, delay: s.delay, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}
