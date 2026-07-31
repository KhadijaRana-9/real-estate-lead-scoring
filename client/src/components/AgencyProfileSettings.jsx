import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import * as api from '../api/endpoints'

const DAYS = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
]

const EMPTY_HOURS = DAYS.map((d) => ({ day: d.key, open: '09:00', close: '18:00', closed: d.key === 'sun' }))

function toCsv(arr) {
  return (arr || []).join(', ')
}
function fromCsv(str) {
  return str.split(',').map((s) => s.trim()).filter(Boolean)
}

const inputCls = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 dark:border-gray-700 dark:bg-gray-800'
const labelCls = 'mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400'

export default function AgencyProfileSettings() {
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.getAgencyProfileSettings().then(({ data }) => {
      setForm({
        description: data.description || '',
        whatsapp: data.whatsapp || '',
        website: data.website || '',
        address: data.address || '',
        city: data.city || '',
        country: data.country || '',
        coverBanner: data.coverBanner || '',
        licenseNumber: data.licenseNumber || '',
        establishedYear: data.establishedYear || '',
        languages: toCsv(data.languages),
        specializations: toCsv(data.specializations),
        officeLabel: data.officeLocations?.[0]?.label || '',
        officeAddress: data.officeLocations?.[0]?.address || '',
        officeCity: data.officeLocations?.[0]?.city || '',
        officeLat: data.officeLocations?.[0]?.lat ?? '',
        officeLng: data.officeLocations?.[0]?.lng ?? '',
        businessHours: data.businessHours?.length ? data.businessHours : EMPTY_HOURS,
        socialMedia: data.socialMedia || { facebook: '', instagram: '', twitter: '', linkedin: '', youtube: '' },
        ceoMessage: data.ceoMessage || '',
        mission: data.mission || '',
        vision: data.vision || '',
        timeline: data.timeline?.length ? data.timeline : [],
        awards: data.awards?.length ? data.awards : [],
        officeGallery: toCsv(data.officeGallery),
        verified: data.verified,
        featured: data.featured,
        slug: data.slug,
      })
    }).finally(() => setLoading(false))
  }, [])

  if (loading || !form) {
    return <div className="h-96 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
  }

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }))
  const updateHour = (day, field, value) =>
    setForm((f) => ({ ...f, businessHours: f.businessHours.map((h) => (h.day === day ? { ...h, [field]: value } : h)) }))
  const updateSocial = (key, value) => setForm((f) => ({ ...f, socialMedia: { ...f.socialMedia, [key]: value } }))

  const addTimelineEvent = () => setForm((f) => ({ ...f, timeline: [...f.timeline, { year: new Date().getFullYear(), title: '' }] }))
  const updateTimelineEvent = (i, field, value) =>
    setForm((f) => ({ ...f, timeline: f.timeline.map((t, idx) => (idx === i ? { ...t, [field]: value } : t)) }))
  const removeTimelineEvent = (i) => setForm((f) => ({ ...f, timeline: f.timeline.filter((_, idx) => idx !== i) }))

  const addAward = () => setForm((f) => ({ ...f, awards: [...f.awards, { title: '', year: '', issuer: '' }] }))
  const updateAward = (i, field, value) => setForm((f) => ({ ...f, awards: f.awards.map((a, idx) => (idx === i ? { ...a, [field]: value } : a)) }))
  const removeAward = (i) => setForm((f) => ({ ...f, awards: f.awards.filter((_, idx) => idx !== i) }))

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.updateAgencyProfileSettings({
        description: form.description,
        whatsapp: form.whatsapp,
        website: form.website,
        address: form.address,
        city: form.city,
        country: form.country,
        coverBanner: form.coverBanner,
        licenseNumber: form.licenseNumber,
        establishedYear: form.establishedYear ? Number(form.establishedYear) : undefined,
        languages: fromCsv(form.languages),
        specializations: fromCsv(form.specializations),
        officeLocations: form.officeAddress
          ? [{ label: form.officeLabel, address: form.officeAddress, city: form.officeCity, lat: form.officeLat || undefined, lng: form.officeLng || undefined }]
          : [],
        businessHours: form.businessHours,
        socialMedia: form.socialMedia,
        ceoMessage: form.ceoMessage,
        mission: form.mission,
        vision: form.vision,
        timeline: form.timeline.filter((t) => t.title.trim()).map((t) => ({ ...t, year: Number(t.year) })),
        awards: form.awards.filter((a) => a.title.trim()).map((a) => ({ ...a, year: a.year ? Number(a.year) : undefined })),
        officeGallery: fromCsv(form.officeGallery),
      })
      toast.success('Agency profile updated')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-8">
      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-800 dark:bg-gray-900">
        <span>Public profile:</span>
        <a href={`/agencies/${form.slug}`} target="_blank" rel="noreferrer" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
          /agencies/{form.slug}
        </a>
        <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${form.verified ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
          {form.verified ? 'Verified' : 'Not Verified'}
        </span>
        {form.featured && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">Featured</span>}
      </div>

      <section>
        <h3 className="mb-3 text-sm font-semibold">About</h3>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Description</label>
            <textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows={4} maxLength={3000} className={inputCls} placeholder="Tell customers about your agency..." />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div><label className={labelCls}>Cover Banner URL</label><input value={form.coverBanner} onChange={(e) => update('coverBanner', e.target.value)} className={inputCls} placeholder="https://..." /></div>
            <div><label className={labelCls}>Established Year</label><input type="number" value={form.establishedYear} onChange={(e) => update('establishedYear', e.target.value)} className={inputCls} placeholder="2020" /></div>
            <div><label className={labelCls}>City</label><input value={form.city} onChange={(e) => update('city', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Country</label><input value={form.country} onChange={(e) => update('country', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Languages (comma separated)</label><input value={form.languages} onChange={(e) => update('languages', e.target.value)} className={inputCls} placeholder="English, Urdu" /></div>
            <div><label className={labelCls}>Specializations (comma separated)</label><input value={form.specializations} onChange={(e) => update('specializations', e.target.value)} className={inputCls} placeholder="Residential, Commercial" /></div>
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold">Contact</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div><label className={labelCls}>WhatsApp</label><input value={form.whatsapp} onChange={(e) => update('whatsapp', e.target.value)} className={inputCls} placeholder="+923001234567" /></div>
          <div><label className={labelCls}>Website</label><input value={form.website} onChange={(e) => update('website', e.target.value)} className={inputCls} placeholder="https://..." /></div>
          <div className="sm:col-span-2"><label className={labelCls}>Address</label><input value={form.address} onChange={(e) => update('address', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>License Number</label><input value={form.licenseNumber} onChange={(e) => update('licenseNumber', e.target.value)} className={inputCls} /></div>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold">Office Location</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div><label className={labelCls}>Label</label><input value={form.officeLabel} onChange={(e) => update('officeLabel', e.target.value)} className={inputCls} placeholder="Head Office" /></div>
          <div><label className={labelCls}>City</label><input value={form.officeCity} onChange={(e) => update('officeCity', e.target.value)} className={inputCls} /></div>
          <div className="sm:col-span-2"><label className={labelCls}>Address</label><input value={form.officeAddress} onChange={(e) => update('officeAddress', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Latitude</label><input value={form.officeLat} onChange={(e) => update('officeLat', e.target.value)} className={inputCls} placeholder="31.5204" /></div>
          <div><label className={labelCls}>Longitude</label><input value={form.officeLng} onChange={(e) => update('officeLng', e.target.value)} className={inputCls} placeholder="74.3587" /></div>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold">Business Hours</h3>
        <div className="space-y-2">
          {form.businessHours.map((h) => {
            const dayInfo = DAYS.find((d) => d.key === h.day)
            return (
              <div key={h.day} className="flex items-center gap-3 text-sm">
                <span className="w-24 shrink-0 text-gray-500 dark:text-gray-400">{dayInfo?.label}</span>
                <label className="flex items-center gap-1.5 text-xs">
                  <input type="checkbox" checked={h.closed} onChange={(e) => updateHour(h.day, 'closed', e.target.checked)} className="accent-brand-600" />
                  Closed
                </label>
                {!h.closed && (
                  <>
                    <input type="time" value={h.open} onChange={(e) => updateHour(h.day, 'open', e.target.value)} className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800" />
                    <span className="text-gray-400">to</span>
                    <input type="time" value={h.close} onChange={(e) => updateHour(h.day, 'close', e.target.value)} className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800" />
                  </>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold">Company Story</h3>
        <p className="mb-3 text-xs text-gray-400">Optional - these only appear on your public profile once filled in.</p>
        <div className="space-y-3">
          <div><label className={labelCls}>Mission</label><textarea value={form.mission} onChange={(e) => update('mission', e.target.value)} rows={2} maxLength={1000} className={inputCls} /></div>
          <div><label className={labelCls}>Vision</label><textarea value={form.vision} onChange={(e) => update('vision', e.target.value)} rows={2} maxLength={1000} className={inputCls} /></div>
          <div><label className={labelCls}>CEO Message</label><textarea value={form.ceoMessage} onChange={(e) => update('ceoMessage', e.target.value)} rows={3} maxLength={2000} className={inputCls} /></div>
          <div><label className={labelCls}>Office Gallery (image URLs, comma separated)</label><input value={form.officeGallery} onChange={(e) => update('officeGallery', e.target.value)} className={inputCls} placeholder="https://..., https://..." /></div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Company Timeline</h3>
          <button type="button" onClick={addTimelineEvent} className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">+ Add milestone</button>
        </div>
        <div className="space-y-2">
          {form.timeline.map((t, i) => (
            <div key={i} className="flex gap-2">
              <input type="number" value={t.year} onChange={(e) => updateTimelineEvent(i, 'year', e.target.value)} className="w-24 rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
              <input value={t.title} onChange={(e) => updateTimelineEvent(i, 'title', e.target.value)} placeholder="e.g. Opened our first branch" className={`flex-1 ${inputCls}`} />
              <button type="button" onClick={() => removeTimelineEvent(i)} className="rounded-lg border border-gray-300 px-3 text-xs text-red-500 dark:border-gray-700">Remove</button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Awards &amp; Certifications</h3>
          <button type="button" onClick={addAward} className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">+ Add award</button>
        </div>
        <div className="space-y-2">
          {form.awards.map((a, i) => (
            <div key={i} className="flex gap-2">
              <input value={a.title} onChange={(e) => updateAward(i, 'title', e.target.value)} placeholder="Award title" className={`flex-1 ${inputCls}`} />
              <input value={a.issuer} onChange={(e) => updateAward(i, 'issuer', e.target.value)} placeholder="Issued by" className={`flex-1 ${inputCls}`} />
              <input type="number" value={a.year} onChange={(e) => updateAward(i, 'year', e.target.value)} placeholder="Year" className="w-24 rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
              <button type="button" onClick={() => removeAward(i)} className="rounded-lg border border-gray-300 px-3 text-xs text-red-500 dark:border-gray-700">Remove</button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold">Social Media</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {['facebook', 'instagram', 'twitter', 'linkedin', 'youtube'].map((key) => (
            <div key={key}><label className={`${labelCls} capitalize`}>{key}</label><input value={form.socialMedia[key]} onChange={(e) => updateSocial(key, e.target.value)} className={inputCls} placeholder="https://..." /></div>
          ))}
        </div>
      </section>

      <button type="submit" disabled={saving} className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
        {saving ? 'Saving...' : 'Save Agency Profile'}
      </button>
    </form>
  )
}
