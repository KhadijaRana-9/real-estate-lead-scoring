import { motion } from 'framer-motion'
import ScoreRing from './ScoreRing'
import Badge from './ui/Badge'

const STATUS_TONE = { hot: 'danger', warm: 'warning', cold: 'info' }

const BAR_COLORS = {
  hot: 'bg-danger-500',
  warm: 'bg-warning-500',
  cold: 'bg-info-500',
}

export default function LeadScoreBreakdown({ score, status, breakdown }) {
  const items = [
    { label: 'Budget Match', value: breakdown?.budgetMatch ?? 0, max: 30 },
    { label: 'Urgency', value: breakdown?.urgency ?? 0, max: 25 },
    { label: 'Interest', value: breakdown?.interest ?? 0, max: 25 },
    { label: 'Popularity', value: breakdown?.popularity ?? 0, max: 20 },
  ]

  return (
    <div className="flex items-start gap-4">
      <ScoreRing score={score} status={status} />
      <div className="flex-1 space-y-2">
        <Badge tone={STATUS_TONE[status]} className="capitalize">{status} lead</Badge>
        <div className="space-y-1.5">
          {items.map((item) => (
            <div key={item.label}>
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>{item.label}</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{item.value}/{item.max}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <motion.div
                  className={`h-full rounded-full ${BAR_COLORS[status]}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${(item.value / item.max) * 100}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
