import { useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { FiStar, FiCheckCircle } from 'react-icons/fi'
import * as api from '../../api/endpoints'
import { useAuth } from '../../context/AuthContext'
import { formatDate } from '../../utils/format'

// Mirrors AgencyProfile.jsx's StarPicker/ReviewForm/ReviewCard pattern,
// scoped to a property instead of an agency - kept deliberately simpler
// (no photos/helpful-votes/agency replies) since only star rating +
// written feedback was asked for here.
function StarPicker({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} stars`}>
          <FiStar size={22} className={n <= value ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'} />
        </button>
      ))}
    </div>
  )
}

function ReviewForm({ propertyId, onSubmitted }) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!rating) {
      toast.error('Please select a star rating')
      return
    }
    setSaving(true)
    try {
      await api.submitPropertyReview(propertyId, { rating, comment })
      toast.success('Review submitted')
      setRating(0)
      setComment('')
      onSubmitted()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit review')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
      <p className="text-sm font-medium">Rate this property</p>
      <StarPicker value={rating} onChange={setRating} />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        placeholder="Share your experience with this property..."
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 dark:border-gray-700 dark:bg-gray-800"
      />
      <button type="submit" disabled={saving} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
        {saving ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  )
}

function ReviewCard({ review }) {
  return (
    <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          {review.author.name}
          {review.verifiedInquiry && (
            <span className="flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <FiCheckCircle size={9} /> Verified
            </span>
          )}
        </p>
        <span className="flex items-center gap-0.5 text-xs text-amber-500">
          <FiStar className="fill-amber-400" size={12} /> {review.rating}
        </span>
      </div>
      {review.comment && <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{review.comment}</p>}
      <p className="mt-1 text-[11px] text-gray-400">{formatDate(review.createdAt)}</p>
    </div>
  )
}

// Real average/count - exported so PropertyDetail's header can show a
// compact star badge without duplicating the fetch (see usage below).
export function RatingBadge({ average, count }) {
  if (!count) return null
  return (
    <span className="flex items-center gap-1 text-sm font-medium text-gray-600 dark:text-gray-300">
      <FiStar className="fill-amber-400 text-amber-400" size={14} /> {average} <span className="text-gray-400">({count})</span>
    </span>
  )
}

export default function PropertyReviews({ propertyId }) {
  const { user } = useAuth()
  const [reviews, setReviews] = useState(null)
  const [summary, setSummary] = useState({ average: 0, count: 0 })

  const fetchReviews = useCallback(() => {
    api.getPropertyReviews(propertyId, { sort: 'newest' }).then(({ data }) => {
      setReviews(data.items)
      const total = data.items.reduce((sum, r) => sum + r.rating, 0)
      setSummary({ average: data.items.length ? Math.round((total / data.items.length) * 10) / 10 : 0, count: data.pagination.total })
    }).catch(() => setReviews([]))
  }, [propertyId])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  if (reviews === null) {
    return <div className="h-32 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-900" />
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold">Ratings &amp; Reviews</h2>
        <RatingBadge average={summary.average} count={summary.count} />
      </div>

      {user?.role === 'customer' && <ReviewForm propertyId={propertyId} onSubmitted={fetchReviews} />}

      {reviews.length === 0 ? (
        <p className="text-sm text-gray-400">No reviews yet - be the first to share your experience.</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => <ReviewCard key={r._id} review={r} />)}
        </div>
      )}
    </section>
  )
}
