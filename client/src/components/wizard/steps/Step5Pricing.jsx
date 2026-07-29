import { useState } from 'react'
import toast from 'react-hot-toast'
import * as api from '../../../api/endpoints'
import PriceEstimateBreakdown from '../../PriceEstimateBreakdown'

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800'

export default function Step5Pricing({ property, onChange }) {
  const [estimate, setEstimate] = useState(null)
  const [estimating, setEstimating] = useState(false)
  const set = (key, value) => onChange({ ...property, [key]: value })

  const handleEstimate = async () => {
    if (!property.area) {
      toast.error('Enter the area first (set in Step 1 or below)')
      return
    }
    setEstimating(true)
    try {
      const { data } = await api.estimatePrice({
        city: property.city,
        area: property.area,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
      })
      setEstimate(data)
    } catch {
      toast.error('Could not estimate price')
    } finally {
      setEstimating(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Area (marla)</label>
          <input type="number" min="0" value={property.area || ''} onChange={(e) => set('area', Number(e.target.value))} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Price (PKR)</label>
          <input type="number" min="0" value={property.price || ''} onChange={(e) => set('price', Number(e.target.value))} className={inputClass} />
        </div>
      </div>

      <button
        type="button"
        onClick={handleEstimate}
        disabled={estimating}
        className="rounded-lg border border-brand-300 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-50 dark:border-brand-700 dark:text-brand-300 dark:hover:bg-brand-950"
      >
        {estimating ? 'Estimating...' : 'Get AI Price Estimate'}
      </button>

      {estimate && (
        <div>
          <PriceEstimateBreakdown estimate={estimate.estimate} breakdown={estimate.breakdown} />
          <button
            type="button"
            onClick={() => set('price', estimate.estimate)}
            className="mt-2 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            Use this as my listing price
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Maintenance Charges (PKR/month)</label>
          <input type="number" min="0" value={property.maintenanceCharges || ''} onChange={(e) => set('maintenanceCharges', Number(e.target.value))} className={inputClass} />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={Boolean(property.negotiable)} onChange={(e) => set('negotiable', e.target.checked)} className="h-4 w-4 accent-brand-600" />
            Price is negotiable
          </label>
        </div>
      </div>
    </div>
  )
}
