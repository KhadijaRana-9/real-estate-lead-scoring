import { FiCheckCircle, FiAlertTriangle } from 'react-icons/fi'
import Alert from '../../ui/Alert'

const DOCS = [
  { field: 'registrationCertificate', label: 'Registration Certificate' },
  { field: 'businessLicense', label: 'Business License' },
  { field: 'cnicDocument', label: 'CNIC (copy)' },
  { field: 'officeProof', label: 'Office Proof' },
]

// The hosting platform caps the ENTIRE registration request (all 6 files
// combined) well below what each file's own server-side limit alone would
// allow - checked and rejected here, per file, before submit, rather than
// letting a real-world scan/photo blow the combined request past that
// ceiling and fail with a generic, unhelpful error after the fact.
const MAX_DOC_BYTES = 1 * 1024 * 1024

const fileInputClass =
  'text-sm text-gray-600 dark:text-gray-300 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-gray-700 hover:file:bg-gray-200 dark:file:bg-gray-800 dark:file:text-gray-200 dark:hover:file:bg-gray-700'

export default function Step3Verification({ data, onChange }) {
  const setFile = (field) => (e) => onChange({ ...data, [field]: e.target.files?.[0] || null })

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50">Verification</h2>
      <Alert tone="info">A super_admin reviews these before your agency goes live - PDF, DOC, DOCX, JPG, or PNG, up to 1MB each.</Alert>

      {DOCS.map(({ field, label }) => {
        const file = data[field]
        const tooLarge = file && file.size > MAX_DOC_BYTES
        return (
          <div
            key={field}
            className={`rounded-xl border p-3 transition-colors ${
              tooLarge
                ? 'border-danger-200 bg-danger-50/40 dark:border-danger-900 dark:bg-danger-900/10'
                : file
                  ? 'border-success-200 bg-success-50/40 dark:border-success-900 dark:bg-success-900/10'
                  : 'border-gray-200 dark:border-gray-800'
            }`}
          >
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">{label} *</label>
            <input type="file" accept=".pdf,.doc,.docx,image/jpeg,image/png" onChange={setFile(field)} className={fileInputClass} />
            {file && !tooLarge && (
              <p className="mt-1 flex items-center gap-1 text-xs text-success-700 dark:text-success-400">
                <FiCheckCircle size={12} /> {file.name}
              </p>
            )}
            {tooLarge && (
              <p className="mt-1 flex items-center gap-1 text-xs text-danger-700 dark:text-danger-400">
                <FiAlertTriangle size={12} /> {file.name} is too large ({(file.size / 1024 / 1024).toFixed(1)}MB) - please use a file under 1MB.
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function step3Errors(data) {
  const errors = []
  for (const { field, label } of DOCS) {
    const file = data[field]
    if (!file) errors.push(`${label} is required`)
    else if (file.size > MAX_DOC_BYTES) errors.push(`${label} must be under 1MB`)
  }
  return errors
}
