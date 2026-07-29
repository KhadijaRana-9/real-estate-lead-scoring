export function StatGrid({ stats }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {stats.map(({ label, value }) => (
        <div key={label} className="rounded-lg border border-gray-200 bg-white p-2.5 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-[11px] text-gray-500 dark:text-gray-400">{label}</p>
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-50">{value ?? '—'}</p>
        </div>
      ))}
    </div>
  )
}

export function SimpleTable({ columns, rows, emptyText = 'Nothing to show' }) {
  if (!rows || rows.length === 0) {
    return <p className="py-3 text-center text-xs text-gray-400">{emptyText}</p>
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
      <table className="w-full text-xs">
        <thead className="bg-gray-50 text-gray-500 dark:bg-gray-900 dark:text-gray-400">
          <tr>
            {columns.map((c) => (
              <th key={c.label} className="whitespace-nowrap px-2.5 py-1.5 text-left font-medium">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {rows.map((row, i) => (
            <tr key={row._id || i} className="text-gray-700 dark:text-gray-300">
              {columns.map((c) => (
                <td key={c.label} className="whitespace-nowrap px-2.5 py-1.5">
                  {c.value(row) ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const BADGE_COLORS = {
  hot: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  warm: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  cold: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  trialing: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  suspended: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  past_due: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  canceled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  pending: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  done: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  scheduled: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  new: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  contacted: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  viewing_scheduled: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  negotiation: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  closed_won: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  closed_lost: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  void: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

export function Badge({ value }) {
  const cls = BADGE_COLORS[value] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${cls}`}>{String(value).replace(/_/g, ' ')}</span>
}

export function AttachmentCard({ title, children }) {
  return (
    <div className="mt-2 space-y-2 rounded-xl border border-gray-200 bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-gray-900/60">
      {title && <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{title}</p>}
      {children}
    </div>
  )
}
