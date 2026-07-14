import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FiHome, FiMail, FiTrendingUp, FiStar, FiEye } from 'react-icons/fi'
import { FaFire } from 'react-icons/fa'
import * as api from '../api/endpoints'
import StatCard from '../components/StatCard'
import EmptyState from '../components/EmptyState'
import PropertyFormModal from '../components/PropertyFormModal'
import LeadScoreBreakdown from '../components/LeadScoreBreakdown'
import RecentActivity from '../components/RecentActivity'
import LeadStatusPie from '../components/charts/LeadStatusPie'
import MonthlyInquiriesLine from '../components/charts/MonthlyInquiriesLine'
import TopPropertiesBar from '../components/charts/TopPropertiesBar'
import { formatPKR, formatDate } from '../utils/format'

const TABS = ['Overview', 'Leads', 'My Listings']

export default function AgentDashboard() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = TABS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'Overview'
  const [tab, setTabState] = useState(initialTab)

  const setTab = (next) => {
    setTabState(next)
    setSearchParams(next === 'Overview' ? {} : { tab: next })
  }
  const [summary, setSummary] = useState(null)
  const [inquiries, setInquiries] = useState([])
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [editingProperty, setEditingProperty] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const loadAll = useCallback(() => {
    setLoading(true)
    setError(false)
    Promise.all([api.getDashboardSummary(), api.getInquiries(), api.getMyProperties()])
      .then(([summaryRes, inquiriesRes, propertiesRes]) => {
        setSummary(summaryRes.data)
        setInquiries(inquiriesRes.data)
        setProperties(propertiesRes.data)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this listing? This cannot be undone.')) return
    try {
      await api.deleteProperty(id)
      toast.success('Delete successful')
      loadAll()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete listing')
    }
  }

  const openCreate = () => {
    setEditingProperty(null)
    setShowForm(true)
  }

  const openEdit = (property) => {
    setEditingProperty(property)
    setShowForm(true)
  }

  const handleSaved = () => {
    setShowForm(false)
    loadAll()
  }

  if (loading) {
    return <div className="mx-auto max-w-7xl px-4 py-16 text-center text-gray-400">Loading dashboard...</div>
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16">
        <EmptyState
          title="Couldn't load dashboard"
          message="Please check your connection and try again."
          action={<button onClick={loadAll} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white">Retry</button>}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Agent Dashboard</h1>
        <button onClick={openCreate} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
          + Add Property
        </button>
      </div>

      <div className="mb-6 flex gap-2 border-b border-gray-200 dark:border-gray-800">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium ${
              tab === t
                ? 'border-b-2 border-brand-600 text-brand-600 dark:text-brand-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Properties" value={summary.cards.totalProperties} icon={<FiHome />} />
            <StatCard label="Inquiries" value={summary.cards.totalInquiries} icon={<FiMail />} />
            <StatCard label="Hot Leads" value={summary.cards.hotLeads} sub="score ≥ 70" icon={<FaFire />} />
            <StatCard label="Avg Lead Score" value={summary.cards.averageLeadScore} icon={<FiTrendingUp />} />
            <StatCard
              label="Highest Scoring Lead"
              value={summary.cards.highestScoringLead ? summary.cards.highestScoringLead.score : '—'}
              sub={summary.cards.highestScoringLead?.name}
              icon={<FiStar />}
            />
            <StatCard
              label="Most Viewed Property"
              value={summary.cards.mostViewedProperty ? summary.cards.mostViewedProperty.views : '—'}
              sub={summary.cards.mostViewedProperty?.title}
              icon={<FiEye />}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-2 text-sm font-semibold">Monthly Inquiries</h3>
              <MonthlyInquiriesLine data={summary.charts.monthlyInquiries} />
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-2 text-sm font-semibold">Lead Status Breakdown</h3>
              <LeadStatusPie data={summary.charts.leadStatusBreakdown} />
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-2 text-sm font-semibold">Top Properties by Views</h3>
              <TopPropertiesBar data={summary.charts.topProperties} />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-3 text-sm font-semibold">Recent Activity</h3>
            <RecentActivity properties={properties} inquiries={inquiries} />
          </div>
        </div>
      )}

      {tab === 'Leads' && (
        inquiries.length === 0 ? (
          <EmptyState title="No inquiries yet" message="Leads will show up here as customers inquire about your listings." />
        ) : (
          <div className="space-y-4">
            {inquiries.map((inq) => (
              <div key={inq._id} className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                <div className="flex flex-col justify-between gap-4 sm:flex-row">
                  <div>
                    <p className="font-semibold">{inq.customer.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{inq.customer.email}{inq.customer.phone ? ` · ${inq.customer.phone}` : ''}</p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{inq.property?.title} — {inq.property?.city}</p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Budget: {formatPKR(inq.budget)} · {formatDate(inq.createdAt)}</p>
                    {inq.message && <p className="mt-2 max-w-lg text-sm italic text-gray-500 dark:text-gray-400">"{inq.message}"</p>}
                  </div>
                  <LeadScoreBreakdown score={inq.score} status={inq.status} breakdown={inq.scoreBreakdown} />
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'My Listings' && (
        properties.length === 0 ? (
          <EmptyState
            title="No listings yet"
            message="Add your first property to start receiving inquiries."
            action={<button onClick={openCreate} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white">+ Add Property</button>}
          />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Views</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {properties.map((p) => (
                  <tr key={p._id} className="bg-white dark:bg-gray-900">
                    <td className="px-4 py-3 font-medium">{p.title}</td>
                    <td className="px-4 py-3">{p.city}</td>
                    <td className="px-4 py-3">{formatPKR(p.price)}</td>
                    <td className="px-4 py-3">{p.views}</td>
                    <td className="px-4 py-3 capitalize">{p.status}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(p)} className="mr-3 text-brand-600 hover:underline dark:text-brand-400">Edit</button>
                      <button onClick={() => handleDelete(p._id)} className="text-red-600 hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {showForm && (
        <PropertyFormModal
          property={editingProperty}
          onClose={() => setShowForm(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
