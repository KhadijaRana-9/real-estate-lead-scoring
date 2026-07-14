import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import useIsDark from '../../hooks/useIsDark'
import { SEQUENTIAL_BLUE, CHART_INK, pick } from './colors'

export default function MonthlyInquiriesLine({ data }) {
  const isDark = useIsDark()

  if (!data || data.length === 0) {
    return <p className="py-12 text-center text-sm text-gray-400">No inquiries yet</p>
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
        <CartesianGrid stroke={pick(CHART_INK.grid, isDark)} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" stroke={pick(CHART_INK.muted, isDark)} fontSize={12} tickLine={false} />
        <YAxis stroke={pick(CHART_INK.muted, isDark)} fontSize={12} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            background: isDark ? '#1a1a19' : '#fcfcfb',
            border: `1px solid ${pick(CHART_INK.grid, isDark)}`,
            borderRadius: 8,
            color: pick(CHART_INK.primary, isDark),
          }}
        />
        <Line
          type="monotone"
          dataKey="count"
          name="Inquiries"
          stroke={pick(SEQUENTIAL_BLUE, isDark)}
          strokeWidth={2}
          dot={{ r: 4, fill: pick(SEQUENTIAL_BLUE, isDark) }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
