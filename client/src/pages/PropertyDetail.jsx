import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { FiMapPin, FiMaximize2 } from 'react-icons/fi'
import { PiBathtub, PiBed } from 'react-icons/pi'
import * as api from '../api/endpoints'
import EmptyState from '../components/EmptyState'
import { formatPKR } from '../utils/format'

const TIMELINE_OPTIONS = [
  { value: 'immediate', label: 'Immediately' },
  { value: '1-3m', label: '1-3 months' },
  { value: '3-6m', label: '3-6 months' },
  { value: 'exploring', label: 'Just exploring' },
]

export default function PropertyDetail() {
  const { id } = useParams()
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .getProperty(id)
      .then(({ data }) => {
        if (!cancelled) setProperty(data)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const onSubmit = async (formValues) => {
    try {
      await api.createInquiry({ propertyId: id, ...formValues, budget: Number(formValues.budget) })
      toast.success('Inquiry sent! The agent will get back to you soon.')
      reset()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send inquiry, please try again.')
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-5xl px-4 py-16 text-center text-gray-400">Loading property...</div>
  }

  if (error || !property) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16">
        <EmptyState
          title="Property not found"
          message="This listing may have been removed."
          action={<Link to="/listings" className="text-brand-600 hover:underline dark:text-brand-400">Back to listings</Link>}
        />
      </div>
    )
  }

  const image = property.images?.[0]
    ? `${property.images[0]}?auto=format&fit=crop&w=1200&q=70`
    : 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=70'

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <img src={image} alt={property.title} className="h-80 w-full rounded-2xl object-cover" />

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold capitalize text-brand-700 dark:bg-brand-900 dark:text-brand-300">
            {property.type}
          </span>
          <h1 className="mt-3 text-3xl font-bold">{property.title}</h1>
          <p className="mt-1 flex items-center gap-1 text-gray-500 dark:text-gray-400">
            <FiMapPin /> {property.city}
          </p>

          <div className="mt-4 flex flex-wrap gap-6 text-sm text-gray-700 dark:text-gray-300">
            <span className="flex items-center gap-1"><FiMaximize2 /> {property.area} {property.areaUnit}</span>
            {property.bedrooms > 0 && <span className="flex items-center gap-1"><PiBed /> {property.bedrooms} Beds</span>}
            {property.bathrooms > 0 && <span className="flex items-center gap-1"><PiBathtub /> {property.bathrooms} Baths</span>}
          </div>

          <p className="mt-6 text-2xl font-bold text-brand-600 dark:text-brand-400">{formatPKR(property.price)}</p>
          <p className="mt-4 leading-relaxed text-gray-600 dark:text-gray-300">{property.description}</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-lg font-semibold">Interested in this property?</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div>
              <input
                {...register('name', { required: 'Name is required' })}
                placeholder="Your name"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div>
              <input
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' },
                })}
                placeholder="Your email"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <input
              {...register('phone')}
              placeholder="Phone (optional)"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />

            <div>
              <input
                type="number"
                {...register('budget', { required: 'Budget is required', min: { value: 1, message: 'Enter a valid budget' } })}
                placeholder="Your budget (PKR)"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              />
              {errors.budget && <p className="mt-1 text-xs text-red-500">{errors.budget.message}</p>}
            </div>

            <select
              {...register('moveTimeline')}
              defaultValue="exploring"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            >
              {TIMELINE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <textarea
              {...register('message')}
              placeholder="Message (tell the agent what you're looking for)"
              rows={3}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {isSubmitting ? 'Sending...' : 'Send Inquiry'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
