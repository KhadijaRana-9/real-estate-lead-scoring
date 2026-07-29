import GoogleMapPicker from '../GoogleMapPicker'

const CITIES = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta']

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800'

export default function Step2Location({ property, onChange }) {
  const set = (key, value) => onChange({ ...property, [key]: value })
  const setLocation = (coords) => onChange({ ...property, location: { ...property.location, ...coords } })

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">City</label>
          <select value={property.city || ''} onChange={(e) => set('city', e.target.value)} className={inputClass}>
            <option value="">Select a city</option>
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Locality / Society</label>
          <input
            value={property.locality || ''}
            onChange={(e) => set('locality', e.target.value)}
            placeholder="e.g. DHA Phase 6"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Pin Location</label>
        <GoogleMapPicker lat={property.location?.lat} lng={property.location?.lng} onChange={setLocation} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Latitude</label>
          <input
            type="number"
            step="any"
            value={property.location?.lat ?? ''}
            onChange={(e) => setLocation({ lat: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="31.5497"
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Longitude</label>
          <input
            type="number"
            step="any"
            value={property.location?.lng ?? ''}
            onChange={(e) => setLocation({ lng: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="74.3436"
            className={inputClass}
          />
        </div>
      </div>
      <p className="text-xs text-gray-400">
        Coordinates save regardless of whether the interactive map is connected. Nearby-places lookup (schools, hospitals, etc.) requires the Places API and is not enabled in this build.
      </p>
    </div>
  )
}
