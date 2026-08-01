import { motion } from 'framer-motion'

// A real animated element (rotating conic-gradient swirl + a
// slow-breathing outer glow), not a static icon standing in for one.
// Brand teal/emerald, not Apple's blue - same "premium glowing sphere"
// language as the reference, in this app's own palette.
export default function AiOrb({ size = 88, listening = false }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <motion.div
        className="absolute inset-[-40%] rounded-full blur-2xl"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.55) 0%, rgba(45,212,191,0.25) 45%, transparent 70%)' }}
        animate={{ scale: listening ? [1, 1.25, 1] : [1, 1.12, 1], opacity: [0.6, 0.9, 0.6] }}
        transition={{ duration: listening ? 1.4 : 3.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute inset-0 overflow-hidden rounded-full shadow-[0_0_30px_rgba(16,185,129,0.5)]"
        animate={{ rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
      >
        <div
          className="h-full w-full"
          style={{
            background: 'conic-gradient(from 0deg, #042f2e, #10b981, #5eead4, #042f2e, #0d9488, #042f2e)',
          }}
        />
      </motion.div>
      <motion.div
        className="absolute inset-[18%] rounded-full bg-black/40 backdrop-blur-sm"
        animate={{ scale: listening ? [1, 0.9, 1] : [1, 1.04, 1] }}
        transition={{ duration: listening ? 0.8 : 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}
