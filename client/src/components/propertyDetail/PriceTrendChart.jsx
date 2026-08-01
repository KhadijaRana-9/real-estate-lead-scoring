import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { FiTrendingUp } from 'react-icons/fi'
import * as api from '../../api/endpoints'
import useIsDark from '../../hooks/useIsDark'
import { SEQUENTIAL_AQUA, CHART_INK, pick } from '../charts/colors'
import { formatPKR } from '../../utils/format'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Real month-over-month average asking price for this city, computed live
// from actual listings (see server/src/features/market/market.service.js)
// - never a fabricated "index" number. A city with too few listings in a
// given month is simply absent from the series rather than interpolated.
export default function PriceTrendChart({ city }) {
  const isDark = useIsDark()
  const [trend, setTrend] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!city) return
    setLoading(true)
    api
      .getMarketPriceTrend({ city, months: 12 })
      .then(({ data }) => setTrend(data.items))
      .catch(() => setTrend([]))
      .finally(() => setLoading(false))
  }, [city])

  if (!city) return null

  const points = (trend || []).map((t) => ({ label: `${MONTH_NAMES[t.month - 1]} ${t.year}`, avgPrice: t.avgPrice, listingCount: t.listingCount }))
  const first = points[0]
  const last = points[points.length - 1]
  const changePct = first && last && first.avgPrice ? Math.round(((last.avgPrice - first.avgPrice) / first.avgPrice) * 100) : null

  return (
    <div className="rounded-2xl border border-gray-200 p-5 dark:border-gray-800">
      <h3 className="mb-1 flex items-center gap-2 text-base font-semibold">
        <FiTrendingUp className="text-brand-500" /> Price Index &middot; {city}
      </h3>
      <p className="mb-4 text-xs text-gray-400">Average asking price per month, computed from real listings in {city}.</p>

      {loading ? (
        <div className="h-52 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-900" />
      ) : points.length < 2 ? (
        <p className="py-10 text-center text-sm text-gray-400">Not enough listing history in {city} yet for a reliable trend.</p>
      ) : (
        <>
          {changePct !== null && (
            <p className={`mb-3 text-sm font-semibold ${changePct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
              {changePct >= 0 ? '+' : ''}
              {changePct}% over this period
            </p>
          )}
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={points} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid stroke={pick(CHART_INK.grid, isDark)} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" stroke={pick(CHART_INK.muted, isDark)} fontSize={11} tickLine={false} minTickGap={20} />
              <YAxis
                stroke={pick(CHART_INK.muted, isDark)}
                fontSize={11}
                tickLine={false}
                tickFormatter={(v) => `${Math.round(v / 1e6)}M`}
                width={44}
              />
              <Tooltip
                contentStyle={{
                  background: isDark ? '#1a1a19' : '#fcfcfb',
                  border: `1px solid ${pick(CHART_INK.grid, isDark)}`,
                  borderRadius: 8,
                  color: pick(CHART_INK.primary, isDark),
                }}
                formatter={(value, name) => (name === 'avgPrice' ? [formatPKR(value), 'Avg. Price'] : [value, name])}
              />
              <Line
                type="monotone"
                dataKey="avgPrice"
                name="avgPrice"
                stroke={pick(SEQUENTIAL_AQUA, isDark)}
                strokeWidth={2}
                dot={{ r: 3, fill: pick(SEQUENTIAL_AQUA, isDark) }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  )
}
