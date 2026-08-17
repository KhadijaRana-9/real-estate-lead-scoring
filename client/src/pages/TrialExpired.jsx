import { useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { FiClock } from 'react-icons/fi'
import * as api from '../api/endpoints'
import Button from '../components/ui/Button'
import { fadeUp, cardHover } from '../motion/variants'

const PLANS = [
  { key: 'starter', label: 'Starter', priceMonthly: 4999, priceYearly: 49999 },
  { key: 'professional', label: 'Professional', priceMonthly: 14999, priceYearly: 149999 },
  { key: 'enterprise', label: 'Enterprise', priceMonthly: 39999, priceYearly: 399999 },
]

// Reached via axios.js's response interceptor redirecting here on any
// 402 (see resolveTenant.js's trial-expiry check) - every other feature
// route is blocked at that point, so this page's only job is getting the
// agency to a real Stripe checkout, not the full Billing management UI
// (invoices/payment methods - still not built, see the session's known
// gaps) which isn't needed just to unblock a trial-expired agency.
export default function TrialExpired() {
  const [plan, setPlan] = useState('starter')
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [loading, setLoading] = useState(false)

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      const { data } = await api.requestUpgrade({ plan, billingCycle })
      if (!data.configured) {
        toast.error(data.message || 'Payment processing is not configured yet.')
        return
      }
      window.location.href = data.checkoutUrl
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start checkout')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeUp} className="mx-auto max-w-2xl px-4 py-16 text-center">
      <FiClock className="mx-auto text-5xl text-warning-500" />
      <h1 className="mt-4 text-2xl font-bold">Your Free Trial Has Ended</h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Choose a plan to keep using your dashboard, properties, and everything else.
      </p>

      <div className="mt-6 flex justify-center">
        <div className="flex rounded-lg border border-gray-200 p-0.5 text-xs dark:border-gray-800">
          {['monthly', 'yearly'].map((cycle) => (
            <button
              key={cycle}
              onClick={() => setBillingCycle(cycle)}
              className={`rounded-md px-4 py-1.5 font-medium capitalize transition-colors ${billingCycle === cycle ? 'bg-brand-600 text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
            >
              {cycle} {cycle === 'yearly' && <span className="text-success-500">(2 months free)</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {PLANS.map((p) => {
          const price = billingCycle === 'yearly' ? p.priceYearly : p.priceMonthly
          const selected = plan === p.key
          return (
            <motion.button
              key={p.key}
              whileHover={cardHover.hover}
              onClick={() => setPlan(p.key)}
              className={`rounded-2xl border p-4 text-left shadow-sm transition-colors hover:shadow-md ${
                selected ? 'border-brand-500 bg-brand-50 dark:border-brand-500 dark:bg-brand-950/40' : 'border-gray-200 dark:border-gray-800'
              }`}
            >
              <span className="font-semibold">{p.label}</span>
              <p className="mt-1 text-lg font-bold">
                PKR {price.toLocaleString('en-PK')}
                <span className="text-xs font-normal text-gray-400">/{billingCycle === 'yearly' ? 'yr' : 'mo'}</span>
              </p>
            </motion.button>
          )
        })}
      </div>

      <Button onClick={handleUpgrade} loading={loading} className="mt-8">
        {loading ? 'Redirecting to checkout...' : 'Continue to Payment'}
      </Button>
    </motion.div>
  )
}
