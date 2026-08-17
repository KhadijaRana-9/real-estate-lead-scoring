import Input from '../../ui/Input'
import { compressImageFile } from '../../../utils/imageCompress'

const labelClass = 'mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400'
const fileInputClass =
  'text-sm text-gray-600 dark:text-gray-300 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-gray-700 hover:file:bg-gray-200 dark:file:bg-gray-800 dark:file:text-gray-200 dark:hover:file:bg-gray-700'

export default function Step2OwnerInfo({ data, onChange }) {
  const set = (field) => (e) => onChange({ ...data, [field]: e.target.value })
  const setFile = (field) => async (e) => {
    const raw = e.target.files?.[0] || null
    const file = raw ? await compressImageFile(raw) : null
    onChange({ ...data, [field]: file })
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50">Owner Information</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">You'll be the agency admin who manages this workspace.</p>

      <Input name="ownerName" label="Owner Name *" value={data.ownerName} onChange={set('ownerName')} placeholder="Your full name" />

      <Input name="ownerEmail" label="Email *" type="email" value={data.ownerEmail} onChange={set('ownerEmail')} placeholder="you@example.com" />

      <div className="grid grid-cols-2 gap-4">
        <Input name="ownerPhone" label="Phone" value={data.ownerPhone} onChange={set('ownerPhone')} placeholder="0300-1234567" />
        <Input name="ownerCnic" label="CNIC" value={data.ownerCnic} onChange={set('ownerCnic')} placeholder="12345-1234567-1" />
      </div>

      <div>
        <label className={labelClass} htmlFor="profilePicture">Profile Picture</label>
        <input id="profilePicture" type="file" accept="image/*" onChange={setFile('profilePicture')} className={fileInputClass} />
      </div>

      <Input name="password" label="Password *" type="password" value={data.password} onChange={set('password')} placeholder="At least 8 characters" />

      <Input
        name="confirmPassword"
        label="Confirm Password *"
        type="password"
        value={data.confirmPassword}
        onChange={set('confirmPassword')}
        placeholder="Repeat password"
      />
    </div>
  )
}

export function step2Errors(data) {
  const errors = []
  if (!data.ownerName?.trim()) errors.push('Owner name is required')
  if (!/^\S+@\S+\.\S+$/.test(data.ownerEmail || '')) errors.push('A valid owner email is required')
  if (!data.password || data.password.length < 8) errors.push('Password must be at least 8 characters')
  if (data.password !== data.confirmPassword) errors.push('Passwords do not match')
  return errors
}
