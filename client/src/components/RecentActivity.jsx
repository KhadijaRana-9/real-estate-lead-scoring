import { FiCheckCircle, FiHome } from 'react-icons/fi'
import { FaFire } from 'react-icons/fa'

function dayLabel(date) {
  const now = new Date()
  const d = new Date(date)
  const diffDays = Math.floor((now.setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return d.toLocaleDateString('en-PK', { month: 'short', day: 'numeric' })
}

function buildEvents(properties, inquiries) {
  const events = []

  for (const p of properties) {
    events.push({
      id: `prop-${p._id}`,
      date: p.createdAt,
      icon: <FiHome className="text-brand-500" />,
      text: `Property Added — ${p.title}`,
    })
  }

  for (const inq of inquiries) {
    events.push({
      id: `inq-${inq._id}`,
      date: inq.createdAt,
      icon: <FiCheckCircle className="text-blue-500" />,
      text: `Inquiry Received from ${inq.customer.name} — ${inq.property?.title ?? 'a listing'}`,
    })
    if (inq.status === 'hot') {
      events.push({
        id: `hot-${inq._id}`,
        date: inq.createdAt,
        icon: <FaFire className="text-red-500" />,
        text: `Hot Lead Created — ${inq.customer.name} (${inq.score}/100)`,
      })
    }
  }

  return events.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10)
}

export default function RecentActivity({ properties, inquiries }) {
  const events = buildEvents(properties, inquiries)

  if (events.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">No activity yet</p>
  }

  let lastDay = null

  return (
    <div className="space-y-3">
      {events.map((event) => {
        const label = dayLabel(event.date)
        const showDayHeading = label !== lastDay
        lastDay = label

        return (
          <div key={event.id}>
            {showDayHeading && (
              <p className="mb-1.5 mt-3 text-xs font-semibold uppercase tracking-wide text-gray-400 first:mt-0">
                {label}
              </p>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              {event.icon}
              <span className="truncate">{event.text}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
