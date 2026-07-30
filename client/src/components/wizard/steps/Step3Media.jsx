import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import toast from 'react-hot-toast'
import { FiUpload, FiX, FiStar, FiCloud, FiLink, FiVideo, FiImage, FiEdit2, FiCheck, FiFilm } from 'react-icons/fi'
import * as api from '../../../api/endpoints'

export const MEDIA_CATEGORIES = [
  { key: 'exterior', label: 'Exterior' },
  { key: 'living_room', label: 'Living Room' },
  { key: 'kitchen', label: 'Kitchen' },
  { key: 'master_bedroom', label: 'Master Bedroom' },
  { key: 'bedroom_2', label: 'Bedroom 2' },
  { key: 'bedroom_3', label: 'Bedroom 3' },
  { key: 'bathrooms', label: 'Bathrooms' },
  { key: 'dining_room', label: 'Dining Room' },
  { key: 'tv_lounge', label: 'TV Lounge' },
  { key: 'office_room', label: 'Office Room' },
  { key: 'study_room', label: 'Study Room' },
  { key: 'gym', label: 'Gym' },
  { key: 'swimming_pool', label: 'Swimming Pool' },
  { key: 'garden', label: 'Garden' },
  { key: 'garage', label: 'Garage' },
  { key: 'terrace', label: 'Terrace' },
  { key: 'basement', label: 'Basement' },
  { key: 'balcony', label: 'Balcony' },
  { key: 'other', label: 'Other' },
]

const CLOUD_PICKERS = [
  { key: 'VITE_GOOGLE_DRIVE_CLIENT_ID', label: 'Google Drive' },
  { key: 'VITE_DROPBOX_APP_KEY', label: 'Dropbox' },
  { key: 'VITE_ONEDRIVE_CLIENT_ID', label: 'OneDrive' },
]

const inputClass = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800'

function CategoryImages({ propertyId, category, images, onRefresh }) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [urlInput, setUrlInput] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [captionDraft, setCaptionDraft] = useState('')
  const fileInputRef = useRef(null)

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList)
    const invalid = files.find((f) => !['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(f.type))
    if (invalid) {
      toast.error(`Unsupported file type: ${invalid.type || invalid.name}`)
      return
    }
    setUploading(true)
    setProgress(0)
    try {
      const { data } = await api.uploadImages(files, (evt) => setProgress(Math.round((evt.loaded / evt.total) * 100)))
      const items = data.urls.map((url) => ({ url, provider: data.provider }))
      await api.addMediaImages(propertyId, category, items)
      toast.success(`${items.length} image(s) added to ${category.replace(/_/g, ' ')}`)
      onRefresh()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  const handleAddUrl = async (e) => {
    e.preventDefault()
    if (!urlInput.trim()) return
    try {
      await api.addMediaImages(propertyId, category, [{ url: urlInput.trim(), provider: 'url' }])
      setUrlInput('')
      toast.success('Image added')
      onRefresh()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add image URL')
    }
  }

  const handleDelete = async (mediaId) => {
    try {
      await api.deleteMediaImage(propertyId, mediaId)
      onRefresh()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete image')
    }
  }

  const handleSetCover = async (mediaId) => {
    try {
      await api.setCoverImage(propertyId, mediaId)
      toast.success('Cover image updated')
      onRefresh()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not set cover')
    }
  }

  const startEditCaption = (img) => {
    setEditingId(img._id)
    setCaptionDraft(img.caption || '')
  }

  const saveCaption = async (mediaId) => {
    try {
      await api.updateMediaImage(propertyId, mediaId, { caption: captionDraft })
      setEditingId(null)
      onRefresh()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save caption')
    }
  }

  const handleReorder = async (newOrder) => {
    onRefresh(newOrder, 'optimistic-images')
    try {
      await api.reorderMediaImages(propertyId, category, newOrder.map((i) => i._id))
    } catch {
      toast.error('Could not save new order')
      onRefresh()
    }
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
        onClick={() => fileInputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
          dragging ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30' : 'border-gray-300 hover:border-brand-400 dark:border-gray-700'
        }`}
      >
        <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        <FiUpload size={22} className="mb-1.5 text-gray-400" />
        <p className="text-sm font-medium">Drag & drop images, or click to browse</p>
        <p className="mt-0.5 text-xs text-gray-400">JPG, PNG, WEBP, HEIC · bulk upload supported</p>
      </div>

      {uploading && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <motion.div className="h-full bg-brand-600" initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
        </div>
      )}

      <form onSubmit={handleAddUrl} className="mt-2 flex gap-2">
        <div className="relative flex-1">
          <FiLink className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="Paste an image URL" className={`${inputClass} pl-8`} />
        </div>
        <button type="submit" className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
          Add URL
        </button>
      </form>

      {images.length > 0 && (
        <Reorder.Group axis="x" values={images} onReorder={handleReorder} className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((img) => (
            <Reorder.Item key={img._id} value={img} className="group relative cursor-grab overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
              <img src={img.url} alt={img.caption} className="h-24 w-full object-cover" />
              {img.isCover && <span className="absolute left-1 top-1 rounded bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">Cover</span>}
              <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                {!img.isCover && (
                  <button type="button" onClick={() => handleSetCover(img._id)} title="Set as cover" className="rounded-full bg-white p-1.5 text-gray-700 hover:bg-gray-100">
                    <FiStar size={12} />
                  </button>
                )}
                <button type="button" onClick={() => startEditCaption(img)} title="Edit caption" className="rounded-full bg-white p-1.5 text-gray-700 hover:bg-gray-100">
                  <FiEdit2 size={12} />
                </button>
                <button type="button" onClick={() => handleDelete(img._id)} title="Delete" className="rounded-full bg-white p-1.5 text-red-600 hover:bg-gray-100">
                  <FiX size={12} />
                </button>
              </div>
              {editingId === img._id && (
                <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-white p-1 dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
                  <input
                    autoFocus
                    value={captionDraft}
                    onChange={(e) => setCaptionDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveCaption(img._id)}
                    placeholder="Caption..."
                    className="w-full rounded border border-gray-300 px-1.5 py-0.5 text-[10px] dark:border-gray-700 dark:bg-gray-800"
                  />
                  <button type="button" onClick={() => saveCaption(img._id)} className="shrink-0 text-brand-600"><FiCheck size={14} /></button>
                </div>
              )}
              {img.caption && editingId !== img._id && (
                <p className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1.5 py-0.5 text-[10px] text-white">{img.caption}</p>
              )}
            </Reorder.Item>
          ))}
        </Reorder.Group>
      )}
    </div>
  )
}

function CategoryVideos({ propertyId, category, videos, onRefresh }) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [urlInput, setUrlInput] = useState('')
  const fileInputRef = useRef(null)

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList)
    const invalid = files.find((f) => !['video/mp4', 'video/quicktime', 'video/webm'].includes(f.type))
    if (invalid) {
      toast.error(`Unsupported video type: ${invalid.type || invalid.name}`)
      return
    }
    setUploading(true)
    setProgress(0)
    try {
      const { data } = await api.uploadVideos(files, (evt) => setProgress(Math.round((evt.loaded / evt.total) * 100)))
      const items = data.videos.map((v) => ({ url: v.url, provider: v.provider, title: v.originalName }))
      await api.addMediaVideos(propertyId, category, items)
      toast.success(`${items.length} video(s) added to ${category.replace(/_/g, ' ')}`)
      onRefresh()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  const handleAddUrl = async (e) => {
    e.preventDefault()
    if (!urlInput.trim()) return
    try {
      await api.addMediaVideos(propertyId, category, [{ url: urlInput.trim(), provider: 'url' }])
      setUrlInput('')
      toast.success('Video added')
      onRefresh()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add video URL')
    }
  }

  const handleDelete = async (mediaId) => {
    try {
      await api.deleteMediaVideo(propertyId, mediaId)
      onRefresh()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete video')
    }
  }

  const handleTitleChange = async (mediaId, title) => {
    try {
      await api.updateMediaVideo(propertyId, mediaId, { title })
    } catch {
      toast.error('Could not save title')
    }
  }

  return (
    <div>
      <div onClick={() => fileInputRef.current?.click()} className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 p-6 text-center hover:border-brand-400 dark:border-gray-700">
        <input ref={fileInputRef} type="file" multiple accept="video/mp4,video/quicktime,video/webm" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        <FiVideo size={22} className="mb-1.5 text-gray-400" />
        <p className="text-sm font-medium">Click to browse videos</p>
        <p className="mt-0.5 text-xs text-gray-400">MP4, MOV, WEBM · up to 200MB each</p>
      </div>

      {uploading && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <motion.div className="h-full bg-brand-600" initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
        </div>
      )}

      <form onSubmit={handleAddUrl} className="mt-2 flex gap-2">
        <div className="relative flex-1">
          <FiLink className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="Paste a video URL (YouTube, Vimeo, or direct link)" className={`${inputClass} pl-8`} />
        </div>
        <button type="submit" className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
          Add URL
        </button>
      </form>

      {videos.length > 0 && (
        <div className="mt-4 space-y-2">
          {videos.map((v) => (
            <div key={v._id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-2 dark:border-gray-800">
              <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded bg-gray-900 text-white">
                <FiFilm size={18} />
              </div>
              <input
                defaultValue={v.title}
                onBlur={(e) => handleTitleChange(v._id, e.target.value)}
                placeholder="Video title..."
                className="flex-1 border-none bg-transparent text-sm outline-none"
              />
              <button type="button" onClick={() => handleDelete(v._id)} className="shrink-0 text-red-500 hover:text-red-600">
                <FiX size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Step3Media({ property, propertyId, onChange }) {
  const [availability, setAvailability] = useState(null)
  const [activeCategory, setActiveCategory] = useState('exterior')
  const [mediaTab, setMediaTab] = useState('images')
  const [media, setMedia] = useState(property.media || { images: [], videos: [] })

  useEffect(() => {
    api.getUploadAvailability().then(({ data }) => setAvailability(data)).catch(() => {})
  }, [])

  const refresh = async (optimisticList, optimisticKind) => {
    if (optimisticList && optimisticKind) {
      // Instant UI feedback for drag-reorder before the server round-trip lands.
      const key = optimisticKind === 'optimistic-images' ? 'images' : 'videos'
      const untouched = media[key].filter((m) => m.category !== activeCategory)
      setMedia((prev) => ({ ...prev, [key]: [...untouched, ...optimisticList] }))
      return
    }
    if (!propertyId) return
    try {
      // Deliberately not api.getProperty(id) - that's the public detail
      // endpoint and increments the view counter on every call. Listing
      // "my" properties re-fetches the same document without that
      // side effect.
      const { data } = await api.getMyProperties()
      const updated = data.find((p) => p._id === propertyId)
      if (updated) {
        setMedia(updated.media)
        onChange({ ...property, images: updated.images, videos: updated.videos, media: updated.media })
      }
    } catch {
      // Silent - the mutating call already toasted its own error if it failed.
    }
  }

  if (!propertyId) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400 dark:border-gray-700">
        Save the property first (add a title on Step 1) to start managing media.
      </div>
    )
  }

  const imagesInCategory = media.images.filter((i) => i.category === activeCategory).sort((a, b) => a.order - b.order)
  const videosInCategory = media.videos.filter((v) => v.category === activeCategory).sort((a, b) => a.order - b.order)
  const totalImages = media.images.length
  const totalVideos = media.videos.length

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <label className="text-sm font-medium">Media Manager</label>
          <p className="text-xs text-gray-400">{totalImages} images · {totalVideos} videos across {MEDIA_CATEGORIES.length} categories</p>
        </div>
        {availability && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            Storage: {availability.activeProvider}
          </span>
        )}
      </div>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {MEDIA_CATEGORIES.map((cat) => {
          const count = media.images.filter((i) => i.category === cat.key).length + media.videos.filter((v) => v.category === cat.key).length
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(cat.key)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                activeCategory === cat.key
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-gray-300 text-gray-600 hover:border-brand-400 dark:border-gray-700 dark:text-gray-300'
              }`}
            >
              {cat.label} {count > 0 && <span className="opacity-70">({count})</span>}
            </button>
          )
        })}
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800">
        {[{ key: 'images', label: 'Images', icon: FiImage }, { key: 'videos', label: 'Videos', icon: FiVideo }].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setMediaTab(t.key)}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium ${
              mediaTab === t.key ? 'border-brand-600 text-brand-600 dark:text-brand-400' : 'border-transparent text-gray-500'
            }`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={`${activeCategory}-${mediaTab}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          {mediaTab === 'images' ? (
            <CategoryImages propertyId={propertyId} category={activeCategory} images={imagesInCategory} onRefresh={refresh} />
          ) : (
            <CategoryVideos propertyId={propertyId} category={activeCategory} videos={videosInCategory} onRefresh={refresh} />
          )}
        </motion.div>
      </AnimatePresence>

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
                title={configured ? `Import from ${label}` : 'Provider not configured'}
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
