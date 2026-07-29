import PropertyCard from '../../PropertyCard'
import MonthlyInquiriesLine from '../../charts/MonthlyInquiriesLine'
import LeadStatusPie from '../../charts/LeadStatusPie'
import { formatPKR, formatDate } from '../../../utils/format'
import { StatGrid, SimpleTable, Badge, AttachmentCard } from './shared'

function PropertyCardsAttachment({ data }) {
  if (!data.properties?.length) return <AttachmentCard><p className="text-xs text-gray-400">No matching properties found.</p></AttachmentCard>
  return (
    <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
      {data.properties.map((p, i) => (
        <div key={p._id} className="w-56 flex-shrink-0">
          <PropertyCard property={p} index={i} />
        </div>
      ))}
    </div>
  )
}

function ComparisonTableAttachment({ data }) {
  const rows = data.properties || []
  return (
    <AttachmentCard title={`Comparing ${rows.length} properties`}>
      <SimpleTable
        rows={rows}
        columns={[
          { label: 'Title', value: (p) => p.title },
          { label: 'City', value: (p) => p.city },
          { label: 'Price', value: (p) => formatPKR(p.price) },
          { label: 'Area', value: (p) => `${p.area} ${p.areaUnit}` },
          { label: 'Beds', value: (p) => p.bedrooms },
          { label: 'Type', value: (p) => p.type },
        ]}
      />
    </AttachmentCard>
  )
}

function PropertyAnalyticsAttachment({ data }) {
  const sections = [
    ['Recently Added', data.recentlyAdded],
    ['Featured', data.featured],
    ['Most Viewed', data.mostViewed],
    ['Highest Priced', data.highestPrice],
    ['Lowest Priced', data.lowestPrice],
  ]
  return (
    <AttachmentCard title={`${data.totalAvailable} available listings`}>
      {sections.map(([label, items]) => (
        <div key={label}>
          <p className="mb-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400">{label}</p>
          <SimpleTable
            rows={items}
            columns={[
              { label: 'Title', value: (p) => p.title },
              { label: 'Price', value: (p) => formatPKR(p.price) },
              { label: 'Views', value: (p) => p.views },
            ]}
            emptyText="None"
          />
        </div>
      ))}
    </AttachmentCard>
  )
}

function ScoreBar({ label, value }) {
  return (
    <div>
      <div className="mb-0.5 flex justify-between text-[11px] text-gray-500 dark:text-gray-400">
        <span>{label}</span>
        <span>{value ?? 0}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-800">
        <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${Math.min(100, value || 0)}%` }} />
      </div>
    </div>
  )
}

function LeadScoreExplanationAttachment({ data }) {
  return (
    <AttachmentCard title={`${data.customer} - Lead Score`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl font-bold text-brand-600 dark:text-brand-400">{data.score}</span>
        <Badge value={data.status} />
      </div>
      <div className="space-y-2">
        <ScoreBar label="Budget Match" value={data.breakdown?.budgetMatch} />
        <ScoreBar label="Urgency" value={data.breakdown?.urgency} />
        <ScoreBar label="Interest" value={data.breakdown?.interest} />
        <ScoreBar label="Popularity" value={data.breakdown?.popularity} />
      </div>
      <p className="text-[11px] text-gray-500 dark:text-gray-400">
        Budget {formatPKR(data.budget)} · Timeline: {data.moveTimeline}
      </p>
    </AttachmentCard>
  )
}

function LeadPipelineAttachment({ data }) {
  return (
    <AttachmentCard title={`Pipeline - ${data.total} leads`}>
      <div className="grid grid-cols-3 gap-2">
        {data.stages.map((s) => (
          <div key={s.stage} className="rounded-lg border border-gray-200 bg-white p-2 text-center dark:border-gray-800 dark:bg-gray-900">
            <p className="text-lg font-bold text-gray-900 dark:text-gray-50">{s.count}</p>
            <Badge value={s.stage} />
          </div>
        ))}
      </div>
    </AttachmentCard>
  )
}

function LeadStatsAttachment({ data }) {
  return (
    <AttachmentCard title="Lead Stats">
      <StatGrid
        stats={[
          { label: 'Properties', value: data.totalProperties },
          { label: 'Inquiries', value: data.totalInquiries },
          { label: 'Hot Leads', value: data.hotLeads },
          { label: 'Avg Score', value: data.averageLeadScore },
        ]}
      />
      {data.mostViewedProperty && (
        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          Most viewed: {data.mostViewedProperty.title} ({data.mostViewedProperty.views} views)
        </p>
      )}
    </AttachmentCard>
  )
}

function DashboardSummaryAttachment({ data }) {
  const c = data.cards
  return (
    <AttachmentCard title="Dashboard">
      <StatGrid
        stats={[
          { label: 'Properties', value: c.totalProperties },
          { label: 'Inquiries', value: c.totalInquiries },
          { label: 'Hot Leads', value: c.hotLeads },
          { label: 'Avg Score', value: c.averageLeadScore },
        ]}
      />
      <div className="rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-gray-900">
        <MonthlyInquiriesLine data={data.charts.monthlyInquiries} />
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-gray-900">
        <LeadStatusPie data={data.charts.leadStatusBreakdown} />
      </div>
    </AttachmentCard>
  )
}

function PlatformSummaryAttachment({ data }) {
  const c = data.cards
  return (
    <AttachmentCard title="Platform Overview">
      <StatGrid
        stats={[
          { label: 'Agencies', value: c.totalAgencies },
          { label: 'Active', value: c.activeAgencies },
          { label: 'Properties', value: c.totalProperties },
          { label: 'Hot Leads', value: c.hotLeads },
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Most Active Agencies</p>
      <SimpleTable
        rows={data.mostActiveAgencies}
        columns={[
          { label: 'Agency', value: (a) => a.companyName },
          { label: 'Properties', value: (a) => a.propertyCount },
        ]}
      />
    </AttachmentCard>
  )
}

function AgencyPerformanceAttachment({ data }) {
  return (
    <AttachmentCard title="Agency Performance">
      <StatGrid
        stats={[
          { label: 'Properties', value: data.totalProperties },
          { label: 'Agents', value: data.totalAgents },
          { label: 'Leads', value: data.totalLeads },
          { label: 'Avg Score', value: data.avgLeadScore },
          { label: 'Conversion', value: `${data.conversionRate}%` },
          { label: 'Total Views', value: data.totalViews },
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Top Agents</p>
      <SimpleTable
        rows={data.topAgents}
        columns={[
          { label: 'Agent', value: (a) => a.name },
          { label: 'Listings', value: (a) => a.propertyCount },
          { label: 'Views', value: (a) => a.totalViews },
        ]}
      />
    </AttachmentCard>
  )
}

function AgencyTableAttachment({ data }) {
  return (
    <AttachmentCard title={`${data.pagination?.total ?? data.items.length} agencies`}>
      <SimpleTable
        rows={data.items}
        columns={[
          { label: 'Company', value: (a) => a.companyName },
          { label: 'Plan', value: (a) => <Badge value={a.subscriptionPlan} /> },
          { label: 'Status', value: (a) => <Badge value={a.status} /> },
        ]}
      />
    </AttachmentCard>
  )
}

function SessionListAttachment({ data }) {
  return (
    <AttachmentCard title={`${data.count} active sessions`}>
      <SimpleTable
        rows={data.sessions}
        columns={[
          { label: 'Signed in', value: (s) => formatDate(s.createdAt) },
          { label: 'Expires', value: (s) => formatDate(s.expiresAt) },
        ]}
      />
    </AttachmentCard>
  )
}

function AuditTimelineAttachment({ data }) {
  if (!data.logs?.length) return <AttachmentCard><p className="text-xs text-gray-400">No audit activity yet.</p></AttachmentCard>
  return (
    <AttachmentCard title="Recent Activity">
      <ul className="space-y-1.5">
        {data.logs.map((log) => (
          <li key={log._id} className="border-l-2 border-brand-400 pl-2 text-[11px]">
            <span className="font-medium text-gray-700 dark:text-gray-200">{log.actor.name}</span>{' '}
            <span className="text-gray-500 dark:text-gray-400">{log.action.replace(/_/g, ' ')}</span>
            <span className="block text-gray-400">{formatDate(log.createdAt)}</span>
          </li>
        ))}
      </ul>
    </AttachmentCard>
  )
}

function SubscriptionSummaryAttachment({ data }) {
  return (
    <AttachmentCard title={`${data.plan} plan`}>
      <div className="flex items-center gap-2">
        <Badge value={data.status} />
        <span className="text-sm font-semibold">{formatPKR(data.priceMonthly)}/mo</span>
      </div>
      <ScoreBar label={`Properties (${data.usage.properties}/${data.limits.maxProperties === null ? '∞' : data.limits.maxProperties})`} value={data.usagePercent.properties} />
      <ScoreBar label={`Agents (${data.usage.agents}/${data.limits.maxAgents === null ? '∞' : data.limits.maxAgents})`} value={data.usagePercent.agents} />
    </AttachmentCard>
  )
}

function InvoiceTableAttachment({ data }) {
  return (
    <AttachmentCard title={`${data.count} invoices`}>
      <SimpleTable
        rows={data.invoices}
        columns={[
          { label: 'Period', value: (i) => formatDate(i.periodStart) },
          { label: 'Amount', value: (i) => formatPKR(i.amount) },
          { label: 'Status', value: (i) => <Badge value={i.status} /> },
        ]}
      />
    </AttachmentCard>
  )
}

function TaskListAttachment({ data }) {
  return (
    <AttachmentCard title={`${data.count} tasks`}>
      <SimpleTable
        rows={data.tasks}
        columns={[
          { label: 'Title', value: (t) => t.title },
          { label: 'Due', value: (t) => (t.dueDate ? formatDate(t.dueDate) : '—') },
          { label: 'Status', value: (t) => <Badge value={t.status} /> },
        ]}
      />
    </AttachmentCard>
  )
}

function AppointmentListAttachment({ data }) {
  return (
    <AttachmentCard title={`${data.count} appointments`}>
      <SimpleTable
        rows={data.appointments}
        columns={[
          { label: 'Title', value: (a) => a.title },
          { label: 'When', value: (a) => formatDate(a.scheduledAt) },
          { label: 'Status', value: (a) => <Badge value={a.status} /> },
        ]}
      />
    </AttachmentCard>
  )
}

function RemindersAttachment({ data }) {
  return (
    <AttachmentCard title={`Next ${data.windowHours}h`}>
      {data.overdueTasks?.length > 0 && (
        <div>
          <p className="mb-1 text-[11px] font-semibold text-red-500">Overdue ({data.overdueTasks.length})</p>
          <SimpleTable rows={data.overdueTasks} columns={[{ label: 'Task', value: (t) => t.title }, { label: 'Was due', value: (t) => formatDate(t.dueDate) }]} />
        </div>
      )}
      <div>
        <p className="mb-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400">Due Soon</p>
        <SimpleTable rows={data.dueSoonTasks} columns={[{ label: 'Task', value: (t) => t.title }, { label: 'Due', value: (t) => formatDate(t.dueDate) }]} />
      </div>
      <div>
        <p className="mb-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400">Upcoming Appointments</p>
        <SimpleTable rows={data.upcomingAppointments} columns={[{ label: 'Title', value: (a) => a.title }, { label: 'When', value: (a) => formatDate(a.scheduledAt) }]} />
      </div>
    </AttachmentCard>
  )
}

const RENDERERS = {
  property_cards: PropertyCardsAttachment,
  comparison_table: ComparisonTableAttachment,
  property_analytics: PropertyAnalyticsAttachment,
  lead_stats: LeadStatsAttachment,
  lead_score_explanation: LeadScoreExplanationAttachment,
  lead_pipeline: LeadPipelineAttachment,
  dashboard_summary: DashboardSummaryAttachment,
  platform_summary: PlatformSummaryAttachment,
  agency_performance: AgencyPerformanceAttachment,
  agency_table: AgencyTableAttachment,
  session_list: SessionListAttachment,
  audit_timeline: AuditTimelineAttachment,
  subscription_summary: SubscriptionSummaryAttachment,
  invoice_table: InvoiceTableAttachment,
  task_list: TaskListAttachment,
  appointment_list: AppointmentListAttachment,
  reminders: RemindersAttachment,
}

export default function AttachmentRenderer({ attachments }) {
  if (!attachments?.length) return null
  return (
    <div className="mt-1 space-y-2">
      {attachments.map((att, i) => {
        const Renderer = RENDERERS[att.renderAs]
        if (!Renderer) return null
        return <Renderer key={`${att.tool}-${i}`} data={att.data} />
      })}
    </div>
  )
}
