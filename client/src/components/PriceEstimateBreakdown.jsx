import { formatPKR } from '../utils/format'

export default function PriceEstimateBreakdown({ estimate, breakdown }) {
  if (!breakdown) return null

  const rows = [
    { label: `${breakdown.area} ${breakdown.areaUnit ?? 'marla'} in ${breakdown.city}`, value: breakdown.baseAmount, sub: `${formatPKR(breakdown.ratePerMarla)}/marla` },
    { label: `${breakdown.bedrooms} bedroom(s) premium`, value: breakdown.bedroomAmount },
    { label: `${breakdown.bathrooms} bathroom(s) premium`, value: breakdown.bathroomAmount },
  ]

  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-800 dark:bg-brand-950/40">
      <p className="text-sm text-gray-600 dark:text-gray-300">Estimated Price</p>
      <p className="text-3xl font-bold text-brand-700 dark:text-brand-300">{formatPKR(estimate)}</p>

      <div className="mt-3 space-y-1 border-t border-brand-200 pt-3 text-xs text-gray-600 dark:border-brand-800 dark:text-gray-400">
        <p className="font-semibold text-gray-700 dark:text-gray-300">Calculation</p>
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-4">
            <span>{row.label}{row.sub ? ` (${row.sub})` : ''}</span>
            <span className="font-medium text-gray-800 dark:text-gray-200">{formatPKR(row.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
