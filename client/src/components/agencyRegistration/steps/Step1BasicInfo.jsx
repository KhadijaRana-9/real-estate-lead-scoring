import Input from '../../ui/Input'
import { compressImageFile } from '../../../utils/imageCompress'

const fileInputClass =
  'text-sm text-gray-600 dark:text-gray-300 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-gray-700 hover:file:bg-gray-200 dark:file:bg-gray-800 dark:file:text-gray-200 dark:hover:file:bg-gray-700'
const labelClass = 'mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400'

export default function Step1BasicInfo({ data, onChange }) {
  const set = (field) => (e) => onChange({ ...data, [field]: e.target.value })
  const setFile = (field) => async (e) => {
    const raw = e.target.files?.[0] || null
    const file = raw ? await compressImageFile(raw) : null
    onChange({ ...data, [field]: file })
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50">Agency Information</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">Tell us about your real estate agency.</p>

      <Input name="companyName" label="Agency Name *" value={data.companyName} onChange={set('companyName')} placeholder="e.g. Prime Estates" />

      <div>
        <label className={labelClass} htmlFor="slug">Workspace URL *</label>
        <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
          <span>dreamhomes.pk/</span>
          <Input
            id="slug"
            name="slug"
            className="flex-1"
            value={data.slug}
            onChange={(e) => onChange({ ...data, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
            placeholder="prime-estates"
          />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="logo">Logo</label>
        <input id="logo" type="file" accept="image/*" onChange={setFile('logo')} className={fileInputClass} />
      </div>

      <Input
        name="description"
        label="Description"
        as="textarea"
        rows={3}
        value={data.description}
        onChange={set('description')}
        placeholder="What does your agency specialize in?"
      />

      <div className="grid grid-cols-2 gap-4">
        <Input name="establishedYear" label="Established Year" type="number" value={data.establishedYear} onChange={set('establishedYear')} placeholder="2015" />
        <Input name="website" label="Website" value={data.website} onChange={set('website')} placeholder="https://..." />
      </div>

      <Input name="address" label="Office Address" value={data.address} onChange={set('address')} placeholder="Street, area" />

      <div className="grid grid-cols-2 gap-4">
        <Input name="city" label="City *" value={data.city} onChange={set('city')} placeholder="Lahore" />
        <Input name="country" label="Country *" value={data.country} onChange={set('country')} placeholder="Pakistan" />
      </div>
    </div>
  )
}

export function step1Errors(data) {
  const errors = []
  if (!data.companyName?.trim()) errors.push('Agency name is required')
  if (!/^[a-z0-9-]{2,}$/.test(data.slug || '')) errors.push('A valid workspace URL is required')
  if (!data.city?.trim()) errors.push('City is required')
  if (!data.country?.trim()) errors.push('Country is required')
  return errors
}
