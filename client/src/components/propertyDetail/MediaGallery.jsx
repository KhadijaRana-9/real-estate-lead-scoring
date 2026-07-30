import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FiX, FiChevronLeft, FiChevronRight, FiMaximize2, FiImage, FiVideo, FiPlay } from 'react-icons/fi'
import { MEDIA_CATEGORIES } from '../wizard/steps/Step3Media'
import { getVideoEmbed } from '../../utils/videoEmbed'

const CATEGORY_LABEL = Object.fromEntries(MEDIA_CATEGORIES.map((c) => [c.key, c.label]))

function Lightbox({ images, index, onClose, onNavigate }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onNavigate(-1)
      if (e.key === 'ArrowRight') onNavigate(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onNavigate])

  const image = images[index]
  if (!image) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col bg-black/95"
      onClick={onClose}
    >
      <div className="flex items-center justify-between p-4 text-white">
        <span className="text-sm text-gray-300">{index + 1} / {images.length}</span>
        <button onClick={onClose} aria-label="Close" className="rounded-full p-2 hover:bg-white/10">
          <FiX size={22} />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-4 pb-4" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onNavigate(-1)}
          aria-label="Previous"
          className="absolute left-2 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:left-6"
        >
          <FiChevronLeft size={22} />
        </button>

        <AnimatePresence mode="wait">
          <motion.img
            key={image._id}
            src={image.url}
            alt={image.caption}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        </AnimatePresence>

        <button
          onClick={() => onNavigate(1)}
          aria-label="Next"
          className="absolute right-2 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:right-6"
        >
          <FiChevronRight size={22} />
        </button>
      </div>

      {image.caption && <p className="pb-6 text-center text-sm text-gray-300">{image.caption}</p>}
    </motion.div>
  )
}

function VideoPlayerModal({ video, onClose }) {
  if (!video) return null
  const embed = getVideoEmbed(video.url)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 p-4"
      onClick={onClose}
    >
      <div className="flex w-full max-w-4xl items-center justify-between pb-2 text-white">
        <span className="truncate text-sm">{video.title || 'Video'}</span>
        <button onClick={onClose} aria-label="Close" className="rounded-full p-2 hover:bg-white/10">
          <FiX size={20} />
        </button>
      </div>
      <div className="aspect-video w-full max-w-4xl overflow-hidden rounded-lg bg-black" onClick={(e) => e.stopPropagation()}>
        {embed.type === 'embed' ? (
          <iframe src={embed.src} title={video.title || 'Property video'} className="h-full w-full" allow="autoplay; fullscreen" allowFullScreen />
        ) : (
          <video src={embed.src} controls autoPlay className="h-full w-full" />
        )}
      </div>
      {video.caption && <p className="max-w-4xl pt-3 text-center text-sm text-gray-300">{video.caption}</p>}
    </motion.div>
  )
}

export default function MediaGallery({ media, title }) {
  const images = media?.images || []
  const videos = media?.videos || []

  const presentCategories = new Set([...images.map((i) => i.category), ...videos.map((v) => v.category)])
  const categoriesWithMedia = MEDIA_CATEGORIES.filter((c) => presentCategories.has(c.key))

  const [activeCategory, setActiveCategory] = useState('all')
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [activeVideo, setActiveVideo] = useState(null)

  const visibleImages = activeCategory === 'all' ? images : images.filter((i) => i.category === activeCategory)
  const visibleVideos = activeCategory === 'all' ? videos : videos.filter((v) => v.category === activeCategory)
  const sortedImages = [...visibleImages].sort((a, b) => a.order - b.order)

  const heroImage = images.find((i) => i.isCover) || images[0]

  if (images.length === 0 && videos.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-900">
        <div className="text-center">
          <FiImage size={28} className="mx-auto mb-2" />
          <p className="text-sm">No media uploaded for this listing yet</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Hero strip */}
      <div className="grid grid-cols-4 gap-1.5 overflow-hidden rounded-2xl" style={{ height: '420px' }}>
        <button onClick={() => setLightboxIndex(sortedImages.findIndex((i) => i._id === heroImage?._id) || 0)} className="group relative col-span-4 overflow-hidden sm:col-span-2 sm:row-span-2">
          {heroImage ? (
            <img src={heroImage.url} alt={title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className="flex h-full items-center justify-center bg-gray-800"><FiVideo className="text-gray-500" size={32} /></div>
          )}
        </button>
        {images.slice(1, 5).map((img, i) => (
          <button
            key={img._id}
            onClick={() => setLightboxIndex(sortedImages.findIndex((si) => si._id === img._id))}
            className={`group relative hidden overflow-hidden sm:block ${i >= 2 ? 'sm:hidden lg:block' : ''}`}
          >
            <img src={img.url} alt={img.caption} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          </button>
        ))}
        <button
          onClick={() => setLightboxIndex(0)}
          className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-2 text-xs font-semibold text-gray-800 shadow hover:bg-white"
        >
          <FiMaximize2 size={13} /> View all {images.length} photos
        </button>
      </div>

      {/* Category tabs */}
      <div className="-mx-1 mt-4 flex gap-1.5 overflow-x-auto px-1 pb-1">
        <button
          onClick={() => setActiveCategory('all')}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${activeCategory === 'all' ? 'border-brand-600 bg-brand-600 text-white' : 'border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-300'}`}
        >
          All Media ({images.length + videos.length})
        </button>
        {categoriesWithMedia.map((cat) => {
          const count = images.filter((i) => i.category === cat.key).length + videos.filter((v) => v.category === cat.key).length
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${activeCategory === cat.key ? 'border-brand-600 bg-brand-600 text-white' : 'border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-300'}`}
            >
              {cat.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Grid for active category */}
      <AnimatePresence mode="wait">
        <motion.div key={activeCategory} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {sortedImages.map((img, i) => (
            <button key={img._id} onClick={() => setLightboxIndex(i)} className="group relative aspect-square overflow-hidden rounded-lg">
              <img src={img.url} alt={img.caption} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110" />
              {activeCategory === 'all' && (
                <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white">{CATEGORY_LABEL[img.category]}</span>
              )}
            </button>
          ))}
          {visibleVideos.map((v) => (
            <button key={v._id} onClick={() => setActiveVideo(v)} className="group relative aspect-square overflow-hidden rounded-lg bg-gray-900">
              {v.thumbnail ? <img src={v.thumbnail} alt={v.title} className="h-full w-full object-cover opacity-80" /> : null}
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/50">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-brand-600">
                  <FiPlay size={16} />
                </div>
              </div>
              {v.title && <span className="absolute bottom-1 left-1 right-1 truncate rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white">{v.title}</span>}
            </button>
          ))}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {lightboxIndex !== null && (
          <Lightbox
            images={sortedImages}
            index={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onNavigate={(dir) => setLightboxIndex((i) => (i + dir + sortedImages.length) % sortedImages.length)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {activeVideo && <VideoPlayerModal video={activeVideo} onClose={() => setActiveVideo(null)} />}
      </AnimatePresence>
    </div>
  )
}
