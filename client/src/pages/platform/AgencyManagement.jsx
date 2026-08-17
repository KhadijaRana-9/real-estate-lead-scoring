import { Fragment, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FiPause, FiPlay, FiTrash2, FiPlus, FiCheck, FiX, FiChevronDown, FiChevronUp, FiFileText } from 'react-icons/fi'
import * as api from '../../api/endpoints'
import EmptyState from '../../components/EmptyState'
import Pagination from '../../components/Pagination'
import CreateAgencyModal from '../../components/CreateAgencyModal'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { formatDate } from '../../utils/format'

// One shared tone map per concept, consolidating what used to be 3
// independent inline color-map objects (STATUS_STYLES/PAYMENT_STATUS_
// STYLES/PLAN_STYLES) into the app-wide Badge component's tone system.
const STATUS_TONE = { active: 'success', suspended: 'danger', pending: 'warning', rejected: 'neutral' }
const PAYMENT_TONE = { paid: 'success', unpaid: 'warning', not_required: 'neutral' }
const PLAN_TONE = { trial: 'warning', starter: 'info', professional: 'brand', enterprise: 'success' }

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending Approval' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'rejected', label: 'Rejected' },
]

const DOC_LABELS = {
  registration_certificate: 'Registration Certificate',
  business_license: 'Business License',
  cnic: 'CNIC',
  office_proof: 'Office Proof',
}

export default function AgencyManagement() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [result, setResult] = useState({ items: [], pagination: { totalPages: 1 } })
  const [page, setPage] = useState(1)
  // Deep-linkable via ?status= (e.g. PlatformDashboard's stat cards) -
  // falls back to '' (All) when absent/unrecognized, same default as
  // before this was made URL-aware.
  const initialStatus = STATUS_FILTERS.some((f) => f.value === searchParams.get('status')) ? searchParams.get('status') : ''
  const [statusFilter, setStatusFilterState] = useState(initialStatus || '')
  const setStatusFilter = (value) => {
    setStatusFilterState(value)
    setSearchParams(value ? { status: value } : {})
  }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(false)
    api
      .getPlatformAgencies({ page, limit: 20, status: statusFilter || undefined })
      .then(({ data }) => setResult(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [page, statusFilter])

  useEffect(() => {
    load()
  }, [load])

  const handleSuspend = async (agency) => {
    setBusyId(agency._id)
    try {
      await api.suspendAgency(agency._id)
      toast.success(`${agency.companyName} suspended`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not suspend agency')
    } finally {
      setBusyId(null)
    }
  }

  const handleApprove = async (agency) => {
    setBusyId(agency._id)
    try {
      await api.approveAgency(agency._id)
      toast.success(`${agency.companyName} approved`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not approve agency')
    } finally {
      setBusyId(null)
    }
  }

  const handleReject = async (agency) => {
    const reason = window.prompt(`Reason for rejecting "${agency.companyName}"? (optional)`)
    if (reason === null) return // cancelled
    setBusyId(agency._id)
    try {
      await api.rejectAgency(agency._id, reason)
      toast.success(`${agency.companyName} rejected`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not reject agency')
    } finally {
      setBusyId(null)
    }
  }

  const handleReactivate = async (agency) => {
    setBusyId(agency._id)
    try {
      await api.reactivateAgency(agency._id)
      toast.success(`${agency.companyName} reactivated`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not reactivate agency')
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (agency) => {
    if (!window.confirm(`Permanently delete "${agency.companyName}" and all of its data? This cannot be undone.`)) return
    setBusyId(agency._id)
    try {
      await api.deletePlatformAgency(agency._id)
      toast.success(`${agency.companyName} deleted`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete agency')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agency Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Every agency on the platform, across every workspace.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <FiPlus /> Create Agency
        </Button>
      </div>

      <div className="mb-4 flex gap-1 overflow-x-auto">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => {
              setStatusFilter(f.value)
              setPage(1)
            }}
            className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${
              statusFilter === f.value ? 'bg-brand-600 text-white' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-900'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error ? (
        <EmptyState title="Couldn't load agencies" message="Please check your connection and try again." />
      ) : loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : result.items.length === 0 ? (
        <EmptyState title="No agencies yet" message="Create the first agency to get started." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Workspace</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {result.items.map((agency) => (
                <Fragment key={agency._id}>
                <tr className="bg-white transition-colors hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800/60">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                        {(agency.companyName || '?')[0].toUpperCase()}
                      </span>
                      <span>{agency.companyName || 'Untitled Agency'}</span>
                      <button
                        onClick={() => setExpandedId((id) => (id === agency._id ? null : agency._id))}
                        title="View verification documents, billing & payment details"
                        className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                      >
                        {expandedId === agency._id ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{agency.slug}</td>
                  <td className="px-4 py-3">
                    {agency.subscriptionPlan ? (
                      <Badge tone={PLAN_TONE[agency.subscriptionPlan] || 'neutral'} className="capitalize">{agency.subscriptionPlan}</Badge>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[agency.status] || 'neutral'} className="capitalize">{agency.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{formatDate(agency.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      {agency.status === 'pending' && (
                        <>
                          <Button onClick={() => handleApprove(agency)} disabled={busyId === agency._id} variant="success" size="sm">
                            <FiCheck size={12} /> Approve
                          </Button>
                          <Button onClick={() => handleReject(agency)} disabled={busyId === agency._id} variant="danger" size="sm">
                            <FiX size={12} /> Reject
                          </Button>
                        </>
                      )}
                      {agency.status === 'active' && (
                        <Button onClick={() => handleSuspend(agency)} disabled={busyId === agency._id} variant="warning" size="sm">
                          <FiPause size={12} /> Suspend
                        </Button>
                      )}
                      {(agency.status === 'suspended' || agency.status === 'rejected') && (
                        <Button onClick={() => handleReactivate(agency)} disabled={busyId === agency._id} variant="success" size="sm">
                          <FiPlay size={12} /> Reactivate
                        </Button>
                      )}
                      <Button onClick={() => handleDelete(agency)} disabled={busyId === agency._id} variant="danger" size="sm">
                        <FiTrash2 size={12} /> Delete
                      </Button>
                    </div>
                  </td>
                </tr>
                {expandedId === agency._id && (
                  <tr className="bg-gray-50 dark:bg-gray-900/60">
                    <td colSpan={6} className="px-4 py-3">
                      <p className="mb-2 text-xs font-semibold uppercase text-gray-400">Subscription &amp; Payment</p>
                      <div className="mb-3 flex flex-wrap gap-2">
                        <Badge tone={PAYMENT_TONE[agency.paymentStatus] || 'neutral'}>
                          Payment: {(agency.paymentStatus || 'unknown').replace('_', ' ')}
                        </Badge>
                        <Badge tone="neutral" className="capitalize">Billing: {agency.billingCycle || 'monthly'}</Badge>
                        {agency.trialEndsAt && (
                          <Badge tone="neutral">
                            Trial ends: {formatDate(agency.trialEndsAt)}
                          </Badge>
                        )}
                      </div>

                      <p className="mb-2 text-xs font-semibold uppercase text-gray-400">Verification Documents</p>
                      {agency.verificationDocuments?.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {agency.verificationDocuments.map((doc) => (
                            <a
                              key={doc.docType}
                              href={doc.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:border-brand-400 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300"
                            >
                              <FiFileText size={12} /> {DOC_LABELS[doc.docType] || doc.docType}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">None on file (created directly by Super Admin).</p>
                      )}
                      {agency.rejectionReason && (
                        <p className="mt-2 text-xs text-red-500">Rejection reason: {agency.rejectionReason}</p>
                      )}
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={result.pagination.totalPages} onChange={setPage} />

      {showCreate && (
        <CreateAgencyModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false)
            load()
          }}
        />
      )}
    </div>
  )
}
