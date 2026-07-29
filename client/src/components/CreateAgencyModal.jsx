import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import * as api from '../api/endpoints'

const PLANS = ['starter', 'professional', 'enterprise']

export default function CreateAgencyModal({ onClose, onCreated }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { subscriptionPlan: 'starter' } })

  const onSubmit = async (values) => {
    try {
      await api.createPlatformAgency(values)
      toast.success('Agency created')
      onCreated()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create agency')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Create Agency</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <input
              {...register('companyName', { required: 'Company name is required' })}
              placeholder="Company Name"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
            {errors.companyName && <p className="mt-1 text-xs text-red-500">{errors.companyName.message}</p>}
          </div>

          <div>
            <input
              {...register('slug', { required: 'Slug is required', pattern: { value: /^[a-z0-9-]+$/, message: 'Lowercase letters, numbers, and hyphens only' } })}
              placeholder="workspace-slug"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
            {errors.slug && <p className="mt-1 text-xs text-red-500">{errors.slug.message}</p>}
          </div>

          <div>
            <input
              {...register('contactEmail', { required: 'Contact email is required' })}
              type="email"
              placeholder="Contact Email"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
            {errors.contactEmail && <p className="mt-1 text-xs text-red-500">{errors.contactEmail.message}</p>}
          </div>

          <select
            {...register('subscriptionPlan')}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm capitalize dark:border-gray-700 dark:bg-gray-800"
          >
            {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {isSubmitting ? 'Creating...' : 'Create Agency'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
