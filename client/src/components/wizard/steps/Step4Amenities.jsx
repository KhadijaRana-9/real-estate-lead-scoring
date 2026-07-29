import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  FiDroplet, FiActivity, FiHome, FiBookOpen, FiPlusSquare, FiArrowUp, FiTruck, FiSun,
  FiShield, FiVideo, FiZap, FiWifi, FiUsers, FiSmartphone, FiHeart, FiX,
} from 'react-icons/fi'
import { staggerContainer, staggerItem } from '../../../motion/variants'

const AMENITIES = [
  { label: 'Swimming Pool', icon: FiDroplet },
  { label: 'Gym', icon: FiActivity },
  { label: 'Mosque', icon: FiHome },
  { label: 'School', icon: FiBookOpen },
  { label: 'Hospital', icon: FiPlusSquare },
  { label: 'Lift', icon: FiArrowUp },
  { label: 'Parking', icon: FiTruck },
  { label: 'Garden', icon: FiSun },
  { label: 'Security', icon: FiShield },
  { label: 'CCTV', icon: FiVideo },
  { label: 'Electricity Backup', icon: FiZap },
  { label: 'Internet', icon: FiWifi },
  { label: "Kids Area", icon: FiUsers },
  { label: 'Smart Home', icon: FiSmartphone },
  { label: 'Pet Friendly', icon: FiHeart },
]

export default function Step4Amenities({ property, onChange }) {
  const [customInput, setCustomInput] = useState('')
  const selected = property.amenities || []

  const toggle = (label) => {
    onChange({
      ...property,
      amenities: selected.includes(label) ? selected.filter((a) => a !== label) : [...selected, label],
    })
  }

  const addCustom = () => {
    const trimmed = customInput.trim()
    if (!trimmed || selected.includes(trimmed)) return
    onChange({ ...property, amenities: [...selected, trimmed] })
    setCustomInput('')
  }

  const customAmenities = selected.filter((a) => !AMENITIES.some((am) => am.label === a))

  return (
    <div className="space-y-6">
      <motion.div initial="hidden" animate="visible" variants={staggerContainer(0.02)} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {AMENITIES.map(({ label, icon: Icon }) => {
          const active = selected.includes(label)
          return (
            <motion.button
              key={label}
              type="button"
              variants={staggerItem}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => toggle(label)}
              className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center text-xs font-medium transition-colors ${
                active
                  ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-800 dark:text-gray-300'
              }`}
            >
              <Icon size={20} />
              {label}
            </motion.button>
          )
        })}
      </motion.div>

      <div>
        <label className="mb-2 block text-sm font-medium">Custom Amenities</label>
        <div className="flex gap-2">
          <input
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
            placeholder="e.g. Rooftop terrace"
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
          <button type="button" onClick={addCustom} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            Add
          </button>
        </div>
        {customAmenities.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {customAmenities.map((a) => (
              <span key={a} className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs dark:bg-gray-800">
                {a}
                <button type="button" onClick={() => toggle(a)}><FiX size={12} /></button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
