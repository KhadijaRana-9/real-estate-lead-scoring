import { useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import * as api from '../api/endpoints'
import PriceEstimateBreakdown from './PriceEstimateBreakdown'

const CITIES = ['Faisalabad', 'Islamabad', 'Lahore', 'Karachi', 'Rawalpindi']
const TYPES = ['house', 'flat', 'plot']

export default function PropertyFormModal({ property, onClose, onSaved }) {
  const isEdit = Boolean(property)
  const [estimate, setEstimate] = useState(null)
  const [estimating, setEstimating] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: property || {
      title: '',
      description: '',
      price: '',
      city: 'Faisalabad',
      area: '',
      areaUnit: 'marla',
      type: 'house',
      bedrooms: 0,
      bathrooms: 0,
      images: '',
    },
  })

  const handleEstimate = async () => {
    const { city, area, bedrooms, bathrooms } = watch()
    if (!area) {
      toast.error('Enter the area first')
      return
    }
    setEstimating(true)
    try {
      const { data } = await api.estimatePrice({ city, area, bedrooms, bathrooms })
      setEstimate(data)
    } catch {
      toast.error('Could not estimate price')
    } finally {
      setEstimating(false)
    }
  }

  const onSubmit = async (values) => {
    const payload = {
      ...values,
      price: Number(values.price),
      area: Number(values.area),
      bedrooms: Number(values.bedrooms),
      bathrooms: Number(values.bathrooms),
      images: values.images
        ? values.images.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
    }

    try {
      if (isEdit) {
        await api.updateProperty(property._id, payload)
        toast.success('Listing updated')
      } else {
        await api.createProperty(payload)
        toast.success('Property added')
      }
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save listing')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{isEdit ? 'Edit Listing' : 'Add New Listing'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <input
              {...register('title', { required: 'Title is required' })}
              placeholder="Title, e.g. Luxury Villa"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
            {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
          </div>

          <textarea
            {...register('description')}
            placeholder="Description"
            rows={3}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />

          <div className="grid grid-cols-2 gap-3">
            <select
              {...register('city')}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            >
              {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              {...register('type')}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm capitalize dark:border-gray-700 dark:bg-gray-800"
            >
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <input
              type="number"
              {...register('area', { required: 'Required' })}
              placeholder="Area (marla)"
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
            <input
              type="number"
              {...register('bedrooms')}
              placeholder="Bedrooms"
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
            <input
              type="number"
              {...register('bathrooms')}
              placeholder="Bathrooms"
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
          </div>

          <div className="flex gap-2">
            <input
              type="number"
              {...register('price', { required: 'Price is required' })}
              placeholder="Price (PKR)"
              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
            <button
              type="button"
              onClick={handleEstimate}
              disabled={estimating}
              className="whitespace-nowrap rounded-lg border border-brand-300 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 dark:border-brand-700 dark:text-brand-300 dark:hover:bg-brand-950"
            >
              {estimating ? 'Estimating...' : 'Estimate Price'}
            </button>
          </div>
          {errors.price && <p className="text-xs text-red-500">{errors.price.message}</p>}

          {estimate && <PriceEstimateBreakdown estimate={estimate.estimate} breakdown={estimate.breakdown} />}

          <input
            {...register('images')}
            placeholder="Image URL(s), comma-separated"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Property'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
