import { motion } from 'framer-motion'

// Premium, restrained hero backdrop - theme-aware (unlike the previous
// version, this respects light/dark mode rather than forcing dark).
// Deliberately NOT particles/sparkles/wavy SVG lines - that read as a
// generic template effect. Instead: a soft mesh of large blurred color
// blobs, a subtle radial glow, and a faint grain texture for depth.
// Everything animates transform/opacity only.
export default function HeroNebula() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-white dark:bg-[#08070f]">
      {/* Radial glow, centered - the "depth" layer */}
      <div className="absolute left-1/2 top-0 h-[40rem] w-[60rem] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,theme(colors.brand.300/55%),transparent_65%)] dark:bg-[radial-gradient(ellipse_at_top,theme(colors.brand.400/40%),transparent_65%)]" />

      {/* Large soft blobs, continuously orbiting (not a back-and-forth
          wobble that stalls at each end - a real closed loop of keyframe
          points traced with linear easing so it never pauses). */}
      <motion.div
        className="absolute -left-40 top-10 h-[26rem] w-[26rem] rounded-full bg-brand-400/45 blur-[100px] dark:bg-emerald-400/40"
        animate={{ x: [0, 60, 30, -30, 0], y: [0, 40, 80, 40, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute right-[-8%] top-[-4%] h-[24rem] w-[24rem] rounded-full bg-blue-400/35 blur-[100px] dark:bg-teal-400/35"
        animate={{ x: [0, -50, -70, -30, 0], y: [0, 50, 10, -30, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute bottom-[-15%] left-1/3 h-80 w-80 rounded-full bg-teal-400/35 blur-[90px] dark:bg-emerald-500/35"
        animate={{ x: [0, 40, 60, 20, 0], y: [0, -35, -10, 25, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
      />

      {/* Faint grain for depth - cheap inline SVG turbulence, no asset request */}
      <div
        className="absolute inset-0 opacity-[0.025] dark:opacity-[0.05]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Subtle bottom fade so content below the hero meets a clean edge */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent dark:from-[#08070f]" />
    </div>
  )
}
