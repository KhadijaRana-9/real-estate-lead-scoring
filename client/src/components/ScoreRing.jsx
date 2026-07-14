import { motion } from 'framer-motion'
import { STATUS_COLORS, pick } from './charts/colors'
import useIsDark from '../hooks/useIsDark'

const STATUS_EMOJI = { hot: '\u{1F525}', warm: '\u{1F7E0}', cold: '\u{1F535}' }
const RADIUS = 34
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function ScoreRing({ score, status, size = 88 }) {
  const isDark = useIsDark()
  const color = pick(STATUS_COLORS[status], isDark)
  const offset = CIRCUMFERENCE * (1 - score / 100)

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 80 80" className="-rotate-90">
        <circle cx="40" cy="40" r={RADIUS} fill="none" stroke={isDark ? '#2c2c2a' : '#e1e0d9'} strokeWidth="8" />
        <motion.circle
          cx="40"
          cy="40"
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          initial={{ strokeDashoffset: CIRCUMFERENCE }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-lg font-bold">{score}%</span>
        <span className="text-sm">{STATUS_EMOJI[status]}</span>
      </div>
    </div>
  )
}
