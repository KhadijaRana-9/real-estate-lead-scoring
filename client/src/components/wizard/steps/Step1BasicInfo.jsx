import AIAssistButton from '../AIAssistButton'

const TYPES = ['house', 'flat', 'plot', 'farmhouse', 'office', 'shop', 'warehouse']
const CONDITIONS = [
  { value: '', label: 'Not specified' },
  { value: 'ready', label: 'Ready' },
  { value: 'under_construction', label: 'Under Construction' },
  { value: 'new', label: 'New' },
  { value: 'used', label: 'Used' },
]

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800'

export default function Step1BasicInfo({ property, onChange }) {
  const set = (key, value) => onChange({ ...property, [key]: value })
  const isCommercial = ['office', 'shop', 'warehouse'].includes(property.type)

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="text-sm font-medium">Property Title</label>
          <AIAssistButton
            action="improve_title"
            property={property}
            label="Improve title"
            onSuggestion={(text) => set('title', text)}
          />
        </div>
        <input
          value={property.title || ''}
          onChange={(e) => set('title', e.target.value)}
          placeholder="e.g. Luxury Villa in DHA Phase 6"
          className={inputClass}
        />
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="text-sm font-medium">Description</label>
          <AIAssistButton
            action="improve_description"
            property={property}
            label="Improve description"
            onSuggestion={(text) => set('description', text)}
          />
        </div>
        <textarea
          value={property.description || ''}
          onChange={(e) => set('description', e.target.value)}
          rows={4}
          placeholder="Describe the property..."
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Property Type</label>
          <select value={property.type || 'house'} onChange={(e) => set('type', e.target.value)} className={`${inputClass} capitalize`}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Category</label>
          <select value={property.category || 'residential'} onChange={(e) => set('category', e.target.value)} className={inputClass}>
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
          </select>
        </div>
      </div>

      {!isCommercial && (
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Bedrooms</label>
            <input type="number" min="0" value={property.bedrooms || 0} onChange={(e) => set('bedrooms', Number(e.target.value))} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Bathrooms</label>
            <input type="number" min="0" value={property.bathrooms || 0} onChange={(e) => set('bathrooms', Number(e.target.value))} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Floors</label>
            <input type="number" min="0" value={property.floors || 0} onChange={(e) => set('floors', Number(e.target.value))} className={inputClass} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Construction Year</label>
          <input
            type="number"
            min="1900"
            max="2100"
            value={property.constructionYear || ''}
            onChange={(e) => set('constructionYear', e.target.value ? Number(e.target.value) : null)}
            placeholder="e.g. 2022"
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Condition</label>
          <select value={property.condition || ''} onChange={(e) => set('condition', e.target.value)} className={inputClass}>
            {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={Boolean(property.featured)}
          onChange={(e) => set('featured', e.target.checked)}
          className="h-4 w-4 accent-brand-600"
        />
        Mark as Featured
      </label>
    </div>
  )
}
