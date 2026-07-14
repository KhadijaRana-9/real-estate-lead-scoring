import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import useIsDark from '../../hooks/useIsDark'
import { STATUS_COLORS, CHART_INK, pick } from './colors'

export default function LeadStatusPie({ data }) {
  const isDark = useIsDark()
  const total = data.reduce((sum, d) => sum + d.count, 0)

  if (total === 0) {
    return <p className="py-12 text-center text-sm text-gray-400">No leads yet</p>
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="status"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
          label={({ status, count }) => `${status}: ${count}`}
        >
          {data.map((entry) => (
            <Cell
              key={entry.status}
              fill={pick(STATUS_COLORS[entry.status], isDark)}
              stroke={isDark ? '#1a1a19' : '#fcfcfb'}
              strokeWidth={2}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: isDark ? '#1a1a19' : '#fcfcfb',
            border: `1px solid ${pick(CHART_INK.grid, isDark)}`,
            borderRadius: 8,
            color: pick(CHART_INK.primary, isDark),
          }}
        />
        <Legend
          verticalAlign="bottom"
          formatter={(value) => <span style={{ color: pick(CHART_INK.secondary, isDark), textTransform: 'capitalize' }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
