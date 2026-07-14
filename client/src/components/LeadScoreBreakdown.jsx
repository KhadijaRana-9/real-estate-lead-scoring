const STATUS_STYLES = {
  hot: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  warm: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  cold: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
}

const STATUS_EMOJI = { hot: '\u{1F525}', warm: '\u{1F7E0}', cold: '\u{1F535}' }

export default function LeadScoreBreakdown({ score, status, breakdown }) {
  const items = [
    { label: 'Budget Match', value: breakdown?.budgetMatch ?? 0, max: 30 },
    { label: 'Urgency', value: breakdown?.urgency ?? 0, max: 25 },
    { label: 'Interest', value: breakdown?.interest ?? 0, max: 25 },
    { label: 'Popularity', value: breakdown?.popularity ?? 0, max: 20 },
  ]

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold">{score}/100</span>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[status]}`}>
          {STATUS_EMOJI[status]} {status}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
        {items.map((item) => (
          <div key={item.label} className="flex justify-between">
            <span>{item.label}</span>
            <span className="font-medium text-gray-800 dark:text-gray-200">
              {item.value}/{item.max}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
