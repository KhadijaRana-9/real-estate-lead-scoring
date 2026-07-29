import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiSearch } from 'react-icons/fi'

export default function SearchBar() {
  const [city, setCity] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    navigate(city ? `/listings?city=${encodeURIComponent(city)}` : '/listings')
  }

  return (
    <motion.form
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-2xl items-center gap-2 rounded-2xl border border-white/20 bg-white/95 p-2 shadow-xl backdrop-blur transition-shadow focus-within:shadow-teal-400/30"
    >
      <FiSearch className="ml-2 text-gray-400" size={20} />
      <input
        value={city}
        onChange={(e) => setCity(e.target.value)}
        placeholder="Search by city, locality, or project..."
        className="flex-1 bg-transparent px-2 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400"
      />
      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        type="submit"
        className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-600/30 hover:bg-brand-700 hover:shadow-lg hover:shadow-brand-600/40"
      >
        Search
      </motion.button>
    </motion.form>
  )
}
