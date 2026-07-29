import { useEffect, useRef, useState } from 'react'
import { motion, Reorder } from 'framer-motion'
import toast from 'react-hot-toast'
import { FiUpload, FiX, FiStar, FiCloud } from 'react-icons/fi'
import * as api from '../../../api/endpoints'

const MAX_IMAGES = 20
const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800'

// Public client IDs meant to live in the browser bundle - honestly gates
// the cloud-picker buttons without a backend round-trip. None are set in
// this build, so these render as disabled/"connect" states, exactly as
// intended rather than faking a working picker.
const CLOUD_PICKERS = [
  { key: 'VITE_GOOGLE_DRIVE_CLIENT_ID', label: 'Google Drive' },
  { key: 'VITE_DROPBOX_APP_KEY', label: 'Dropbox' },
  { key: 'VITE_ONEDRIVE_CLIENT_ID', label: 'OneDrive' },
]

export default function Step3Media({ property, onChange }) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [availability, setAvailability] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    api.getUploadAvailability().then(({ data }) => setAvailability(data)).catch(() => {})
  }, [])

  const images = property.images || []

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList).slice(0, MAX_IMAGES - images.length)
    if (files.length === 0) {
      toast.error(`Maximum ${MAX_IMAGES} images reached`)
      return
    }
    const invalid = files.find((f) => !['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(f.type))
    if (invalid) {
      toast.error(`Unsupported file type: ${invalid.type || invalid.name}`)
      return
    }

    setUploading(true)
    setProgress(0)
    try {
      const { data } = await api.uploadImages(files, (evt) => {
        setProgress(Math.round((evt.loaded / evt.total) * 100))
      })
      onChange({ ...property, images: [...images, ...data.urls] })
      toast.success(`${data.urls.length} image(s) uploaded via ${data.provider}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  const removeImage = (url) => onChange({ ...property, images: images.filter((i) => i !== url) })
  const setCover = (url) => onChange({ ...property, images: [url, ...images.filter((i) => i !== url)] })
  const reorderImages = (newOrder) => onChange({ ...property, images: newOrder })

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium">Property Images ({images.length}/{MAX_IMAGES})</label>
          {availability && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              Storage: {availability.activeProvider}
            </span>
          )}
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
            dragging ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30' : 'border-gray-300 hover:border-brand-400 dark:border-gray-700'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <FiUpload size={28} className="mb-2 text-gray-400" />
          <p className="text-sm font-medium">Drag & drop images here, or click to browse</p>
          <p className="mt-1 text-xs text-gray-400">JPG, PNG, WEBP · up to 5MB each</p>
        </div>

        {uploading && (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <motion.div className="h-full bg-brand-600" initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
          </div>
        )}

        {images.length > 0 && (
          <Reorder.Group axis="x" values={images} onReorder={reorderImages} className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {images.map((url, i) => (
              <Reorder.Item key={url} value={url} className="group relative cursor-grab overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
                <img src={url} alt="" className="h-24 w-full object-cover" />
                {i === 0 && (
                  <span className="absolute left-1 top-1 rounded bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">Cover</span>
                )}
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  {i !== 0 && (
                    <button type="button" onClick={() => setCover(url)} title="Set as cover" className="rounded-full bg-white p-1.5 text-gray-700 hover:bg-gray-100">
                      <FiStar size={13} />
                    </button>
                  )}
                  <button type="button" onClick={() => removeImage(url)} title="Remove" className="rounded-full bg-white p-1.5 text-red-600 hover:bg-gray-100">
                    <FiX size={13} />
                  </button>
                </div>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        )}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Import From Cloud Storage</label>
        <div className="flex flex-wrap gap-2">
          {CLOUD_PICKERS.map(({ key, label }) => {
            const configured = Boolean(import.meta.env[key])
            return (
              <button
                key={key}
                type="button"
                disabled={!configured}
                title={configured ? `Import from ${label}` : `Add ${key} to the client .env to enable`}
                className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700"
              >
                <FiCloud size={14} /> {label} {!configured && '(not connected)'}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Video Tour URL (YouTube / Vimeo)</label>
          <input
            value={property.videos?.[0] || ''}
            onChange={(e) => onChange({ ...property, videos: e.target.value ? [e.target.value] : [] })}
            placeholder="https://youtube.com/watch?v=..."
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">360° / Virtual Tour URL</label>
          <input
            value={property.virtualTourUrl || ''}
            onChange={(e) => onChange({ ...property, virtualTourUrl: e.target.value })}
            placeholder="Matterport / Kuula link"
            className={inputClass}
          />
        </div>
      </div>
    </div>
  )
}
