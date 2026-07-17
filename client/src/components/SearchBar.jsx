import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiSearch } from 'react-icons/fi'

export default function SearchBar() {
  const [city, setCity] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    navigate(city ? `/listings?city=${encodeURIComponent(city)}` : '/listings')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-2xl items-center gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-800 dark:bg-gray-900"
    >
      <FiSearch className="ml-2 text-gray-400" size={20} />
      <input
        value={city}
        onChange={(e) => setCity(e.target.value)}
        placeholder="Search by city, e.g. Faisalabad, Islamabad..."
        className="flex-1 bg-transparent px-2 py-2 text-sm outline-none"
      />
      <button
        type="submit"
        className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
      >
        Search
      </button>
    </form>
  )
}
