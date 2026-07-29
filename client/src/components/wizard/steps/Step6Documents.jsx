import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { FiUpload, FiFileText, FiTrash2, FiDownload } from 'react-icons/fi'
import * as api from '../../../api/endpoints'

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
]

export default function Step6Documents({ property, onChange }) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef(null)

  const documents = property.documents || []

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList)
    const invalid = files.find((f) => !ALLOWED_TYPES.includes(f.type))
    if (invalid) {
      toast.error(`Unsupported file type: ${invalid.type || invalid.name}. Use PDF, DOC, DOCX, JPG, or PNG.`)
      return
    }

    setUploading(true)
    setProgress(0)
    try {
      const { data } = await api.uploadDocuments(files, (evt) => setProgress(Math.round((evt.loaded / evt.total) * 100)))
      onChange({ ...property, documents: [...documents, ...data.documents] })
      toast.success(`${data.documents.length} document(s) uploaded`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  const removeDocument = (url) => onChange({ ...property, documents: documents.filter((d) => d.url !== url) })

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Floor plans, brochures, ownership papers - PDF, DOCX, or images.
      </p>

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
          accept=".pdf,.doc,.docx,image/jpeg,image/png"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <FiUpload size={28} className="mb-2 text-gray-400" />
        <p className="text-sm font-medium">Drag & drop documents here, or click to browse</p>
        <p className="mt-1 text-xs text-gray-400">PDF, DOC, DOCX, JPG, PNG · up to 10MB each</p>
      </div>

      {uploading && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <motion.div className="h-full bg-brand-600" initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
        </div>
      )}

      {documents.length > 0 && (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          {documents.map((doc) => (
            <li key={doc.url} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <FiFileText className="shrink-0 text-gray-400" />
                <span className="truncate">{doc.name}</span>
              </span>
              <span className="flex shrink-0 gap-2">
                <a href={doc.url} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-brand-600"><FiDownload size={15} /></a>
                <button type="button" onClick={() => removeDocument(doc.url)} className="text-gray-400 hover:text-red-500"><FiTrash2 size={15} /></button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
