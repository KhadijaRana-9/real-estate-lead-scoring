import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import useIsDark from '../../hooks/useIsDark'
import { SEQUENTIAL_AQUA, CHART_INK, pick } from './colors'

export default function TopPropertiesBar({ data }) {
  const isDark = useIsDark()

  if (!data || data.length === 0) {
    return <p className="py-12 text-center text-sm text-gray-400">No properties yet</p>
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
        <CartesianGrid stroke={pick(CHART_INK.grid, isDark)} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="title"
          stroke={pick(CHART_INK.muted, isDark)}
          fontSize={11}
          tickLine={false}
          interval={0}
          angle={-15}
          textAnchor="end"
          height={50}
        />
        <YAxis stroke={pick(CHART_INK.muted, isDark)} fontSize={12} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            background: isDark ? '#1a1a19' : '#fcfcfb',
            border: `1px solid ${pick(CHART_INK.grid, isDark)}`,
            borderRadius: 8,
            color: pick(CHART_INK.primary, isDark),
          }}
        />
        <Bar dataKey="views" name="Views" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.title} fill={pick(SEQUENTIAL_AQUA, isDark)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
