import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import confetti from 'canvas-confetti'
import {
  FiMapPin, FiMaximize2, FiCheckCircle, FiShare2, FiPrinter, FiHeart, FiBarChart2,
  FiPhone, FiMessageCircle, FiMail, FiCheckSquare, FiFileText, FiDownload, FiHome,
  FiLayers, FiCompass, FiCalendar, FiDollarSign, FiZap,
} from 'react-icons/fi'
import { PiBathtub, PiBed } from 'react-icons/pi'
import * as api from '../api/endpoints'
import EmptyState from '../components/EmptyState'
import ScoreRing from '../components/ScoreRing'
import PropertyCard from '../components/PropertyCard'
import MediaGallery from '../components/propertyDetail/MediaGallery'
import MortgageCalculator from '../components/propertyDetail/MortgageCalculator'
import NearbyPlaces from '../components/propertyDetail/NearbyPlaces'
import useWishlist from '../hooks/useWishlist'
import useCompareList from '../hooks/useCompareList'
import { formatPKR, formatDate } from '../utils/format'
import { fadeUp } from '../motion/variants'

const STATUS_LABEL = { hot: 'HOT LEAD', warm: 'WARM LEAD', cold: 'COLD LEAD' }

const TIMELINE_OPTIONS = [
  { value: 'immediate', label: 'Immediately' },
  { value: '1-3m', label: '1-3 months' },
  { value: '3-6m', label: '3-6 months' },
  { value: 'exploring', label: 'Just exploring' },
]

const CONDITION_LABEL = { ready: 'Ready to Move', under_construction: 'Under Construction', new: 'Brand New', used: 'Used' }

function SpecItem({ icon: Icon, label, value }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-800">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{value}</p>
        <p className="text-xs text-gray-400">{label}</p>
      </div>
    </div>
  )
}

function AiPriceInsight({ property }) {
  const [estimate, setEstimate] = useState(null)

  useEffect(() => {
    if (!property.area) return
    api
      .estimatePrice({ city: property.city, area: property.area, bedrooms: property.bedrooms, bathrooms: property.bathrooms })
      .then(({ data }) => setEstimate(data))
      .catch(() => {})
  }, [property])

  if (!estimate) return null

  const diff = property.price - estimate.estimate
  const diffPct = estimate.estimate ? Math.round((diff / estimate.estimate) * 100) : 0
  const isAboveMarket = diffPct > 5
  const isBelowMarket = diffPct < -5

  return (
    <div className="rounded-2xl border border-gray-200 p-5 dark:border-gray-800">
      <h3 className="mb-3 flex items-center gap-2 text-base font-semibold">
        <FiZap className="text-brand-500" /> AI Price Insight
      </h3>
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-900">
          <p className="text-xs text-gray-400">Listed Price</p>
          <p className="text-lg font-bold">{formatPKR(property.price)}</p>
        </div>
        <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-900">
          <p className="text-xs text-gray-400">Market Estimate</p>
          <p className="text-lg font-bold">{formatPKR(estimate.estimate)}</p>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
        {isAboveMarket && `Listed ${diffPct}% above our area-based estimate.`}
        {isBelowMarket && `Listed ${Math.abs(diffPct)}% below our area-based estimate - potentially good value.`}
        {!isAboveMarket && !isBelowMarket && 'Listed close to our area-based market estimate.'}
      </p>
      <p className="mt-1 text-center text-[10px] text-gray-400">Estimate based on city rate, area, bedrooms and bathrooms - not a formal appraisal.</p>
    </div>
  )
}

function AgentAgencyCard({ property }) {
  const agent = property.agent
  const agency = property.agency
  const phone = agent?.phone || agency?.phone
  const whatsapp = agent?.whatsapp || agency?.whatsapp

  return (
    <div className="space-y-4 rounded-2xl border border-gray-200 p-5 dark:border-gray-800">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
          {agent?.name?.[0] || 'A'}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{agent?.name || 'Listing Agent'}</p>
          <p className="text-xs text-gray-400">Listing Agent</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <a href={phone ? `tel:${phone}` : undefined} className={`flex flex-col items-center gap-1 rounded-lg border border-gray-200 py-2.5 text-xs dark:border-gray-800 ${!phone ? 'pointer-events-none opacity-40' : 'hover:bg-gray-50 dark:hover:bg-gray-900'}`}>
          <FiPhone size={15} /> Call
        </a>
        <a
          href={whatsapp ? `https://wa.me/${whatsapp.replace(/[^\d]/g, '')}` : undefined}
          target="_blank"
          rel="noreferrer"
          className={`flex flex-col items-center gap-1 rounded-lg border border-gray-200 py-2.5 text-xs dark:border-gray-800 ${!whatsapp ? 'pointer-events-none opacity-40' : 'hover:bg-emerald-50 dark:hover:bg-emerald-950'}`}
        >
          <FiMessageCircle size={15} /> WhatsApp
        </a>
        <a href={agent?.email ? `mailto:${agent.email}` : undefined} className="flex flex-col items-center gap-1 rounded-lg border border-gray-200 py-2.5 text-xs hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900">
          <FiMail size={15} /> Email
        </a>
      </div>

      {agency && (
        <Link to={`/agencies/${agency.slug}`} className="flex items-center gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
            {agency.logo ? <img src={agency.logo} alt="" className="h-full w-full object-cover" /> : <FiHome className="text-gray-400" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 truncate text-sm font-medium">
              {agency.companyName}
              {agency.verified && <FiCheckCircle className="shrink-0 text-brand-500" size={13} />}
            </p>
            <p className="text-xs text-gray-400">View agency profile</p>
          </div>
        </Link>
      )}
    </div>
  )
}

function RelatedSection({ title, properties }) {
  if (!properties || properties.length === 0) return null
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
        {properties.map((p, i) => (
          <div key={p._id} className="w-64 shrink-0">
            <PropertyCard property={p} index={i} />
          </div>
        ))}
      </div>
    </section>
  )
}

export default function PropertyDetail() {
  const { id } = useParams()
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [submitted, setSubmitted] = useState(null)
  const [similar, setSimilar] = useState(null)
  const [sameAgent, setSameAgent] = useState(null)
  const [sameAgency, setSameAgency] = useState(null)

  const { isSaved, toggle: toggleWishlist } = useWishlist(id)
  const { isInCompare, toggle: toggleCompare, maxReached } = useCompareList(id)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setSimilar(null)
    setSameAgent(null)
    setSameAgency(null)
    api
      .getProperty(id)
      .then(({ data }) => {
        if (cancelled) return
        setProperty(data)
        api.getRecommendedProperties(id).then(({ data: rec }) => !cancelled && setSimilar(rec)).catch(() => {})
        if (data.agent?._id) {
          api
            .getProperties({ workspace: data.agency?.slug, agent: data.agent._id, excludeId: id, limit: 6 })
            .then(({ data: res }) => !cancelled && setSameAgent(res.items))
            .catch(() => {})
        }
        api
          .getProperties({ workspace: data.agency?.slug, excludeId: id, sort: 'newest', limit: 6 })
          .then(({ data: res }) => !cancelled && setSameAgency(res.items))
          .catch(() => {})
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
      const { data } = await api.createInquiry({ propertyId: id, ...formValues, budget: Number(formValues.budget) })
      toast.success('Inquiry sent! The agent will get back to you soon.')
      reset()
      setSubmitted({ score: data.score, status: data.status })
      if (data.status === 'hot') {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } })
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send inquiry, please try again.')
    }
  }

  const handleShare = async () => {
    const shareData = { title: property.title, text: `Check out this property: ${property.title}`, url: window.location.href }
    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied to clipboard')
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-[420px] animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-900" />)}
          </div>
          <div className="h-64 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-900" />
        </div>
      </div>
    )
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 print:max-w-full">
      <MediaGallery media={property.media} title={property.title} />

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {/* Header */}
          <motion.div initial="hidden" animate="visible" variants={fadeUp}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold capitalize text-brand-700 dark:bg-brand-900 dark:text-brand-300">{property.type}</span>
                  {property.featured && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">Featured</span>}
                  {property.negotiable && <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">Negotiable</span>}
                </div>
                <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{property.title}</h1>
                <p className="mt-1 flex items-center gap-1 text-gray-500 dark:text-gray-400">
                  <FiMapPin /> {property.locality ? `${property.locality}, ` : ''}{property.city}
                </p>
              </div>
              <div className="flex gap-2 print:hidden">
                <button onClick={toggleWishlist} title={isSaved ? 'Remove from wishlist' : 'Save to wishlist'} className={`rounded-lg border p-2.5 ${isSaved ? 'border-red-300 bg-red-50 text-red-500 dark:border-red-800 dark:bg-red-950' : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900'}`}>
                  <FiHeart size={16} className={isSaved ? 'fill-red-500' : ''} />
                </button>
                <button onClick={toggleCompare} disabled={!isInCompare && maxReached} title="Add to compare" className={`rounded-lg border p-2.5 ${isInCompare ? 'border-brand-300 bg-brand-50 text-brand-600 dark:border-brand-800 dark:bg-brand-950' : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900'} disabled:opacity-40`}>
                  <FiBarChart2 size={16} />
                </button>
                <button onClick={handleShare} title="Share" className="rounded-lg border border-gray-200 p-2.5 text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900">
                  <FiShare2 size={16} />
                </button>
                <button onClick={() => window.print()} title="Print" className="rounded-lg border border-gray-200 p-2.5 text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900">
                  <FiPrinter size={16} />
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-6 text-sm text-gray-700 dark:text-gray-300">
              <span className="flex items-center gap-1"><FiMaximize2 /> {property.area} {property.areaUnit}</span>
              {property.bedrooms > 0 && <span className="flex items-center gap-1"><PiBed /> {property.bedrooms} Beds</span>}
              {property.bathrooms > 0 && <span className="flex items-center gap-1"><PiBathtub /> {property.bathrooms} Baths</span>}
            </div>

            <p className="mt-6 text-2xl font-bold text-brand-600 dark:text-brand-400">{formatPKR(property.price)}</p>
            {property.description && <p className="mt-4 leading-relaxed text-gray-600 dark:text-gray-300">{property.description}</p>}
          </motion.div>

          {/* Specifications */}
          <section>
            <h2 className="mb-3 text-lg font-bold">Property Overview</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <SpecItem icon={FiLayers} label="Floors" value={property.floors || undefined} />
              <SpecItem icon={FiCalendar} label="Year Built" value={property.constructionYear || undefined} />
              <SpecItem icon={FiCheckSquare} label="Condition" value={CONDITION_LABEL[property.condition]} />
              <SpecItem icon={FiHome} label="Category" value={property.category && property.category[0].toUpperCase() + property.category.slice(1)} />
              <SpecItem icon={FiCompass} label="Locality" value={property.locality || undefined} />
              <SpecItem icon={FiDollarSign} label="Maintenance" value={property.maintenanceCharges ? formatPKR(property.maintenanceCharges) + '/mo' : undefined} />
            </div>
          </section>

          {/* Amenities - real data only, whatever the agent actually entered */}
          {property.amenities?.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-bold">Amenities &amp; Features</h2>
              <div className="flex flex-wrap gap-2">
                {property.amenities.map((a) => (
                  <span key={a} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm dark:border-gray-800">
                    <FiCheckCircle className="text-brand-500" size={13} /> {a}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Documents / Floor Plans */}
          {property.documents?.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-bold">Documents &amp; Floor Plans</h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {property.documents.map((doc, i) => (
                  <a key={i} href={doc.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 hover:border-brand-400 dark:border-gray-800">
                    <FiFileText className="shrink-0 text-brand-500" size={18} />
                    <span className="flex-1 truncate text-sm">{doc.name}</span>
                    <FiDownload className="shrink-0 text-gray-400" size={14} />
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Virtual Tour */}
          {property.virtualTourUrl && (
            <section>
              <h2 className="mb-3 text-lg font-bold">Virtual Tour</h2>
              <a href={property.virtualTourUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center rounded-2xl border border-dashed border-brand-300 bg-brand-50 py-10 text-sm font-medium text-brand-700 hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300">
                Open 360° Virtual Tour
              </a>
            </section>
          )}

          <NearbyPlaces location={property.location} address={`${property.locality || ''} ${property.city}`.trim()} />

          <MortgageCalculator price={property.price} />

          <AiPriceInsight property={property} />

          <RelatedSection title="Similar Properties" properties={similar} />
          <RelatedSection title="More From This Agent" properties={sameAgent} />
          <RelatedSection title="More From This Agency" properties={sameAgency} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6 print:hidden">
          <div className="sticky top-20 space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              {submitted ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }} className="flex flex-col items-center py-4 text-center">
                  <FiCheckCircle className="text-4xl text-brand-600 dark:text-brand-400" />
                  <h2 className="mt-2 text-lg font-semibold">Inquiry Submitted Successfully</h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">We'll notify the agent immediately.</p>
                  <div className="mt-4">
                    <ScoreRing score={submitted.score} status={submitted.status} size={100} />
                  </div>
                  <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                    {STATUS_LABEL[submitted.status]} &middot; {submitted.score}/100
                  </p>
                  <button onClick={() => setSubmitted(null)} className="mt-5 text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">
                    Send another inquiry
                  </button>
                </motion.div>
              ) : (
                <>
                  <h2 className="mb-4 text-lg font-semibold">Interested in this property?</h2>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                    <div>
                      <input {...register('name', { required: 'Name is required' })} placeholder="Your name" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
                      {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
                    </div>
                    <div>
                      <input
                        {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' } })}
                        placeholder="Your email"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                      />
                      {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
                    </div>
                    <input {...register('phone')} placeholder="Phone (optional)" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
                    <div>
                      <input
                        type="number"
                        {...register('budget', { required: 'Budget is required', min: { value: 1, message: 'Enter a valid budget' } })}
                        placeholder="Your budget (PKR)"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                      />
                      {errors.budget && <p className="mt-1 text-xs text-red-500">{errors.budget.message}</p>}
                    </div>
                    <select {...register('moveTimeline')} defaultValue="exploring" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800">
                      {TIMELINE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                    <textarea {...register('message')} placeholder="Message (tell the agent what you're looking for)" rows={3} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
                    <button type="submit" disabled={isSubmitting} className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
                      {isSubmitting ? 'Sending...' : 'Send Inquiry'}
                    </button>
                  </form>
                </>
              )}
            </div>

            <AgentAgencyCard property={property} />

            <p className="text-center text-xs text-gray-400">Listed {formatDate(property.publishedAt || property.createdAt)} &middot; {property.views} views</p>
          </div>
        </div>
      </div>
    </div>
  )
}
