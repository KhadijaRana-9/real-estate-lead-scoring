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
      <div className="absolute left-1/2 top-0 h-[40rem] w-[60rem] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,theme(colors.brand.200/40%),transparent_65%)] dark:bg-[radial-gradient(ellipse_at_top,theme(colors.brand.900/50%),transparent_65%)]" />

      {/* Large soft blobs, slow drift */}
      <motion.div
        className="absolute -left-40 top-10 h-[26rem] w-[26rem] rounded-full bg-brand-300/25 blur-[110px] dark:bg-brand-700/25"
        animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute right-[-8%] top-[-4%] h-[24rem] w-[24rem] rounded-full bg-blue-300/20 blur-[110px] dark:bg-indigo-700/20"
        animate={{ x: [0, -25, 0], y: [0, 25, 0] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-[-15%] left-1/3 h-80 w-80 rounded-full bg-teal-200/20 blur-[100px] dark:bg-teal-800/20"
        animate={{ x: [0, 20, 0], y: [0, -15, 0] }}
        transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
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
