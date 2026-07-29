import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { FiPause, FiPlay, FiTrash2, FiPlus } from 'react-icons/fi'
import * as api from '../../api/endpoints'
import EmptyState from '../../components/EmptyState'
import Pagination from '../../components/Pagination'
import CreateAgencyModal from '../../components/CreateAgencyModal'
import { formatDate } from '../../utils/format'

const STATUS_STYLES = {
  active: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  suspended: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

export default function AgencyManagement() {
  const [result, setResult] = useState({ items: [], pagination: { totalPages: 1 } })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(false)
    api
      .getPlatformAgencies({ page, limit: 20 })
      .then(({ data }) => setResult(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [page])

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
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <FiPlus /> Create Agency
        </button>
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
                <tr key={agency._id} className="bg-white dark:bg-gray-900">
                  <td className="px-4 py-3 font-medium">{agency.companyName}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{agency.slug}</td>
                  <td className="px-4 py-3 capitalize">{agency.subscriptionPlan}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[agency.status]}`}>
                      {agency.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{formatDate(agency.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-3">
                      {agency.status === 'active' ? (
                        <button
                          onClick={() => handleSuspend(agency)}
                          disabled={busyId === agency._id}
                          title="Suspend"
                          className="text-amber-600 hover:underline disabled:opacity-50 dark:text-amber-400"
                        >
                          <FiPause />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivate(agency)}
                          disabled={busyId === agency._id}
                          title="Reactivate"
                          className="text-green-600 hover:underline disabled:opacity-50 dark:text-green-400"
                        >
                          <FiPlay />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(agency)}
                        disabled={busyId === agency._id}
                        title="Delete"
                        className="text-red-600 hover:underline disabled:opacity-50"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
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
