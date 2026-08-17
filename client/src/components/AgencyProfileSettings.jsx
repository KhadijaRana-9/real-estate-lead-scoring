import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import * as api from '../api/endpoints'
import Input from './ui/Input'
import Button from './ui/Button'
import Badge from './ui/Badge'
import Alert from './ui/Alert'

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

// agency.status (Super Admin approval workflow: pending -> active, or
// suspended/rejected) is a completely different concept from
// agency.verified (an optional platform trust badge, off by default,
// granted separately - see agency.model.js). The old UI only ever
// rendered the verified/'Not Verified' pill and never showed status at
// all, so a fully-approved, active agency still displayed "Not
// Verified" with nothing to explain why - easily misread as "not
// approved". This shows the real approval status first.
const STATUS_TONE = { active: 'success', pending: 'warning', suspended: 'danger', rejected: 'danger' }
const STATUS_LABEL = { active: 'Active', pending: 'Pending Approval', suspended: 'Suspended', rejected: 'Rejected' }

export default function AgencyProfileSettings() {
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.getAgencyProfileSettings().then(({ data }) => {
      setForm({
        companyName: data.companyName || '',
        phone: data.phone || '',
        contactEmail: data.contactEmail || '',
        logo: data.logo || '',
        primaryColor: data.primaryColor || '#4F46E5',
        secondaryColor: data.secondaryColor || '#0EA5E9',
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
        status: data.status,
        slug: data.slug,
      })
    }).finally(() => setLoading(false))
  }, [])

  if (loading || !form) {
    return (
      <div className="space-y-4">
        <div className="h-14 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    )
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
      await api.updateAgencyBranding({
        logo: form.logo || undefined,
        primaryColor: form.primaryColor,
        secondaryColor: form.secondaryColor,
      })
      await api.updateAgencyProfileSettings({
        companyName: form.companyName,
        phone: form.phone,
        contactEmail: form.contactEmail,
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
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-800 dark:bg-gray-900">
        <span>Public profile:</span>
        <a href={`/agencies/${form.slug}`} target="_blank" rel="noreferrer" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
          /agencies/{form.slug}
        </a>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {STATUS_TONE[form.status] && <Badge tone={STATUS_TONE[form.status]}>{STATUS_LABEL[form.status]}</Badge>}
          <Badge
            tone={form.verified ? 'info' : 'neutral'}
            title="A trust badge DreamHomes can optionally grant your agency - separate from your account's approval status above"
          >
            {form.verified ? '✓ Verified Badge' : 'Verified Badge Not Granted'}
          </Badge>
          {form.featured && <Badge tone="warning">Featured</Badge>}
        </div>
      </div>
      {form.status === 'pending' && (
        <Alert tone="warning">
          Your agency is still awaiting Super Admin review. Your public profile and team features unlock once it's approved.
        </Alert>
      )}
      {form.status === 'suspended' && (
        <Alert tone="danger">Your agency workspace has been suspended by DreamHomes. Contact support for details.</Alert>
      )}

      <section>
        <h3 className="mb-3 text-sm font-semibold">Identity &amp; Branding</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Agency Name" value={form.companyName} onChange={(e) => update('companyName', e.target.value)} />
          <Input label="Logo URL" value={form.logo} onChange={(e) => update('logo', e.target.value)} placeholder="https://..." />
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Primary Color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={form.primaryColor} onChange={(e) => update('primaryColor', e.target.value)} className="h-9 w-12 shrink-0 rounded-lg border border-gray-300 dark:border-gray-700" />
              <Input value={form.primaryColor} onChange={(e) => update('primaryColor', e.target.value)} className="flex-1" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Secondary Color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={form.secondaryColor} onChange={(e) => update('secondaryColor', e.target.value)} className="h-9 w-12 shrink-0 rounded-lg border border-gray-300 dark:border-gray-700" />
              <Input value={form.secondaryColor} onChange={(e) => update('secondaryColor', e.target.value)} className="flex-1" />
            </div>
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold">About</h3>
        <div className="space-y-3">
          <Input
            label="Description"
            as="textarea"
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            rows={4}
            maxLength={3000}
            placeholder="Tell customers about your agency..."
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Cover Banner URL" value={form.coverBanner} onChange={(e) => update('coverBanner', e.target.value)} placeholder="https://..." />
            <Input label="Established Year" type="number" value={form.establishedYear} onChange={(e) => update('establishedYear', e.target.value)} placeholder="2020" />
            <Input label="City" value={form.city} onChange={(e) => update('city', e.target.value)} />
            <Input label="Country" value={form.country} onChange={(e) => update('country', e.target.value)} />
            <Input label="Languages (comma separated)" value={form.languages} onChange={(e) => update('languages', e.target.value)} placeholder="English, Urdu" />
            <Input label="Specializations (comma separated)" value={form.specializations} onChange={(e) => update('specializations', e.target.value)} placeholder="Residential, Commercial" />
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold">Contact</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Phone" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+923001234567" />
          <Input label="Contact Email" type="email" value={form.contactEmail} onChange={(e) => update('contactEmail', e.target.value)} />
          <Input label="WhatsApp" value={form.whatsapp} onChange={(e) => update('whatsapp', e.target.value)} placeholder="+923001234567" />
          <Input label="Website" value={form.website} onChange={(e) => update('website', e.target.value)} placeholder="https://..." />
          <Input label="Address" className="sm:col-span-2" value={form.address} onChange={(e) => update('address', e.target.value)} />
          <Input label="License Number" value={form.licenseNumber} onChange={(e) => update('licenseNumber', e.target.value)} />
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold">Office Location</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Label" value={form.officeLabel} onChange={(e) => update('officeLabel', e.target.value)} placeholder="Head Office" />
          <Input label="City" value={form.officeCity} onChange={(e) => update('officeCity', e.target.value)} />
          <Input label="Address" className="sm:col-span-2" value={form.officeAddress} onChange={(e) => update('officeAddress', e.target.value)} />
          <Input label="Latitude" value={form.officeLat} onChange={(e) => update('officeLat', e.target.value)} placeholder="31.5204" />
          <Input label="Longitude" value={form.officeLng} onChange={(e) => update('officeLng', e.target.value)} placeholder="74.3587" />
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold">Business Hours</h3>
        <div className="space-y-2">
          {form.businessHours.map((h) => {
            const dayInfo = DAYS.find((d) => d.key === h.day)
            return (
              <div key={h.day} className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-900">
                <span className="w-24 shrink-0 text-gray-500 dark:text-gray-400">{dayInfo?.label}</span>
                <label className="flex items-center gap-1.5 text-xs">
                  <input type="checkbox" checked={h.closed} onChange={(e) => updateHour(h.day, 'closed', e.target.checked)} className="accent-brand-600" />
                  Closed
                </label>
                {!h.closed && (
                  <>
                    <input type="time" value={h.open} onChange={(e) => updateHour(h.day, 'open', e.target.value)} className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-gray-700 dark:bg-gray-800" />
                    <span className="text-gray-400">to</span>
                    <input type="time" value={h.close} onChange={(e) => updateHour(h.day, 'close', e.target.value)} className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-gray-700 dark:bg-gray-800" />
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
          <Input label="Mission" as="textarea" value={form.mission} onChange={(e) => update('mission', e.target.value)} rows={2} maxLength={1000} />
          <Input label="Vision" as="textarea" value={form.vision} onChange={(e) => update('vision', e.target.value)} rows={2} maxLength={1000} />
          <Input label="CEO Message" as="textarea" value={form.ceoMessage} onChange={(e) => update('ceoMessage', e.target.value)} rows={3} maxLength={2000} />
          <Input
            label="Office Gallery (image URLs, comma separated)"
            value={form.officeGallery}
            onChange={(e) => update('officeGallery', e.target.value)}
            placeholder="https://..., https://..."
          />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Company Timeline</h3>
          <Button type="button" onClick={addTimelineEvent} variant="ghost" size="sm">+ Add milestone</Button>
        </div>
        <div className="space-y-2">
          {form.timeline.map((t, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="number"
                value={t.year}
                onChange={(e) => updateTimelineEvent(i, 'year', e.target.value)}
                className="w-24 rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-gray-700 dark:bg-gray-800"
              />
              <Input value={t.title} onChange={(e) => updateTimelineEvent(i, 'title', e.target.value)} placeholder="e.g. Opened our first branch" className="flex-1" />
              <Button type="button" onClick={() => removeTimelineEvent(i)} variant="outline" size="sm" className="!border-danger-300 !text-danger-600 hover:!bg-danger-50 dark:!border-danger-900 dark:!text-danger-400">
                Remove
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Awards &amp; Certifications</h3>
          <Button type="button" onClick={addAward} variant="ghost" size="sm">+ Add award</Button>
        </div>
        <div className="space-y-2">
          {form.awards.map((a, i) => (
            <div key={i} className="flex gap-2">
              <Input value={a.title} onChange={(e) => updateAward(i, 'title', e.target.value)} placeholder="Award title" className="flex-1" />
              <Input value={a.issuer} onChange={(e) => updateAward(i, 'issuer', e.target.value)} placeholder="Issued by" className="flex-1" />
              <input
                type="number"
                value={a.year}
                onChange={(e) => updateAward(i, 'year', e.target.value)}
                placeholder="Year"
                className="w-24 rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-gray-700 dark:bg-gray-800"
              />
              <Button type="button" onClick={() => removeAward(i)} variant="outline" size="sm" className="!border-danger-300 !text-danger-600 hover:!bg-danger-50 dark:!border-danger-900 dark:!text-danger-400">
                Remove
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold">Social Media</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {['facebook', 'instagram', 'twitter', 'linkedin', 'youtube'].map((key) => (
            <Input
              key={key}
              label={key[0].toUpperCase() + key.slice(1)}
              value={form.socialMedia[key]}
              onChange={(e) => updateSocial(key, e.target.value)}
              placeholder="https://..."
            />
          ))}
        </div>
      </section>

      <Button type="submit" loading={saving}>
        {saving ? 'Saving...' : 'Save Agency Profile'}
      </Button>
    </form>
  )
}
