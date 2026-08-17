import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { FiX } from 'react-icons/fi'
import * as api from '../../api/endpoints'
import WizardProgressBar from './WizardProgressBar'
import Step1BasicInfo from './steps/Step1BasicInfo'
import Step2Location from './steps/Step2Location'
import Step3Media from './steps/Step3Media'
import Step4Amenities from './steps/Step4Amenities'
import Step5Pricing from './steps/Step5Pricing'
import Step6Documents from './steps/Step6Documents'
import Step7Review, { getMissingRequiredFields } from './steps/Step7Review'
import { EASE } from '../../motion/variants'

const STEP_COMPONENTS = [Step1BasicInfo, Step2Location, Step3Media, Step4Amenities, Step5Pricing, Step6Documents, Step7Review]
const AUTOSAVE_INTERVAL_MS = 15000

const EMPTY_PROPERTY = {
  title: '',
  description: '',
  type: 'house',
  category: 'residential',
  bedrooms: 0,
  bathrooms: 0,
  floors: 0,
  constructionYear: null,
  condition: '',
  city: '',
  locality: '',
  area: 0,
  areaUnit: 'marla',
  location: {},
  amenities: [],
  images: [],
  videos: [],
  media: { images: [], videos: [] },
  virtualTourUrl: '',
  documents: [],
  price: 0,
  negotiable: false,
  maintenanceCharges: 0,
  featured: false,
}

export default function PropertyWizard({ property: existingProperty, onClose, onSaved }) {
  const [step, setStep] = useState(1)
  const [property, setProperty] = useState(existingProperty || EMPTY_PROPERTY)
  const [propertyId, setPropertyId] = useState(existingProperty?._id || null)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)

  const propertyRef = useRef(property)
  propertyRef.current = property
  const propertyIdRef = useRef(propertyId)
  propertyIdRef.current = propertyId

  const isEdit = Boolean(existingProperty)

  // The wizard always holds the *full* property shape in state, even for
  // fields the user hasn't reached yet (Step 1 alone leaves price/city/
  // area/location at their untouched placeholder values). The backend
  // schema's "optional" only means "may be omitted" - a present-but-empty
  // value like location: {} or price: 0 still gets validated against the
  // real shape and correctly rejects it. So strip untouched placeholders
  // here rather than sending them, letting every other real field through
  // unchanged.
  const buildSavePayload = (source) => {
    const payload = { ...source }
    if (!payload.price) delete payload.price
    if (!payload.area) delete payload.area
    if (!payload.city) delete payload.city
    if (!payload.constructionYear) delete payload.constructionYear
    if (!payload.location || payload.location.lat == null || payload.location.lng == null) {
      delete payload.location
    }
    return payload
  }

  const handleChange = (next) => {
    setProperty(next)
    setDirty(true)
  }

  // Silent autosave path (interval + step navigation) vs. the "Save
  // Draft" button, which additionally toasts and closes - same
  // underlying persistence, different UX around it.
  const persist = useCallback(async () => {
    if (!dirty) return true
    try {
      if (!propertyIdRef.current) {
        if (!propertyRef.current.title) return true // nothing worth saving until Step 1 has a title
        const { data } = await api.createDraftProperty(buildSavePayload(propertyRef.current))
        setPropertyId(data._id)
      } else {
        await api.updateProperty(propertyIdRef.current, buildSavePayload(propertyRef.current))
      }
      setDirty(false)
      setLastSaved(new Date())
      return true
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save draft')
      return false
    }
  }, [dirty])

  useEffect(() => {
    const interval = setInterval(persist, AUTOSAVE_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [persist])

  useEffect(() => {
    const handler = (e) => {
      if (dirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const goNext = async () => {
    setSaving(true)
    await persist()
    setSaving(false)
    setStep((s) => Math.min(s + 1, STEP_COMPONENTS.length))
  }

  const goBack = () => setStep((s) => Math.max(s - 1, 1))

  const handleSaveDraft = async () => {
    setSaving(true)
    const ok = await persist()
    setSaving(false)
    if (ok) {
      toast.success('Draft saved')
      onSaved?.()
    }
  }

  const handlePublish = async () => {
    const missing = getMissingRequiredFields(property)
    if (missing.length > 0) {
      toast.error(`Missing required fields: ${missing.join(', ')}`)
      return
    }
    setSaving(true)
    try {
      const ok = await persist()
      if (!ok) return
      await api.publishProperty(propertyIdRef.current)
      toast.success('Property published!')
      onSaved?.()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not publish')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    if (dirty && !window.confirm('You have unsaved changes. Close anyway?')) return
    onClose()
  }

  const StepComponent = STEP_COMPONENTS[step - 1]
  const isLastStep = step === STEP_COMPONENTS.length

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 sm:z-50 sm:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.25, ease: EASE }}
        className="flex h-full w-full flex-col overflow-hidden bg-white dark:bg-gray-950 sm:h-[85vh] sm:w-[80vw] sm:max-w-4xl sm:rounded-2xl sm:border sm:border-gray-200 sm:shadow-2xl dark:sm:border-gray-800"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800 sm:px-6">
          <div>
            <h2 className="text-lg font-bold">{isEdit ? 'Edit Property' : 'Add New Property'}</h2>
            {lastSaved && <p className="text-xs text-gray-400">Saved {lastSaved.toLocaleTimeString()}</p>}
          </div>
          <button onClick={handleClose} className="rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800">
            <FiX size={20} />
          </button>
        </div>

        <WizardProgressBar currentStep={step} />

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
            >
              <StepComponent property={property} onChange={handleChange} propertyId={propertyId} />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="sticky bottom-0 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950 sm:px-6">
          <button onClick={goBack} disabled={step === 1} className="rounded-lg border border-gray-300 px-4 py-2 text-sm disabled:opacity-40 dark:border-gray-700">
            Back
          </button>
          <div className="flex gap-2">
            <button onClick={handleSaveDraft} disabled={saving} className="rounded-lg border border-gray-300 px-4 py-2 text-sm disabled:opacity-60 dark:border-gray-700">
              Save Draft
            </button>
            {isLastStep ? (
              <button
                onClick={handlePublish}
                disabled={saving}
                className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {saving ? 'Publishing...' : 'Publish'}
              </button>
            ) : (
              <button
                onClick={goNext}
                disabled={saving}
                className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Next'}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
