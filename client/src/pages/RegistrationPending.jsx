import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiClock, FiCheckCircle, FiXCircle } from 'react-icons/fi'
import * as api from '../api/endpoints'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { fadeUp } from '../motion/variants'

const POLL_INTERVAL_MS = 8000

// Reached either directly after a no-Stripe-configured submit, or as
// Stripe Checkout's success_url redirect target (see
// agencyRegistration.service.js's successUrl) - either way, payment
// (when it happened) and admin approval are two separate gates.
//
// Polls the public registration-status endpoint (agencyRegistration.
// routes.js's GET /:agencyId/status) so an applicant who leaves this tab
// open actually finds out when they've been approved, instead of a
// static "Pending Approval" badge that never changes even after a
// super_admin approves them minutes later - the real bug this page used
// to have (no automatic session issuing happens here, since that would
// mean skipping real authentication - approval instead surfaces
// immediately with a clear one-click path to log in for real).
export default function RegistrationPending() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const agencyId = params.get('agencyId')
  const slug = params.get('slug')
  const cancelled = params.get('payment') === 'cancelled'

  const [status, setStatus] = useState('pending')
  const [rejectionReason, setRejectionReason] = useState('')
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!agencyId) return undefined

    const poll = () => {
      api
        .getRegistrationStatus(agencyId)
        .then(({ data }) => {
          setStatus(data.status)
          setRejectionReason(data.rejectionReason || '')
          if (data.status !== 'pending' && intervalRef.current) {
            clearInterval(intervalRef.current)
          }
        })
        .catch(() => {})
    }

    poll()
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS)
    return () => clearInterval(intervalRef.current)
  }, [agencyId])

  if (status === 'active') {
    return (
      <motion.div initial="hidden" animate="visible" variants={fadeUp} className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
        <FiCheckCircle className="text-5xl text-success-500" />
        <h1 className="mt-4 text-2xl font-bold">Congratulations - You're Approved!</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Your agency has been reviewed and approved. Log in to open your Agency Portal.
        </p>
        <Button onClick={() => navigate(`/login?workspace=${slug}`)} className="mt-8">
          Log In to Your Dashboard
        </Button>
      </motion.div>
    )
  }

  if (status === 'rejected') {
    return (
      <motion.div initial="hidden" animate="visible" variants={fadeUp} className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
        <FiXCircle className="text-5xl text-danger-500" />
        <h1 className="mt-4 text-2xl font-bold">Registration Not Approved</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {rejectionReason || 'Your registration was reviewed and could not be approved.'}
        </p>
        <Link to="/" className="mt-8 text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">
          Back to home
        </Link>
      </motion.div>
    )
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeUp} className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
      {cancelled ? (
        <>
          <FiClock className="text-5xl text-warning-500" />
          <h1 className="mt-4 text-2xl font-bold">Payment Not Completed</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Your registration was saved, but payment wasn't completed. It's still pending admin review - you can complete payment later once approved.
          </p>
        </>
      ) : (
        <>
          <FiClock className="text-5xl text-warning-500" />
          <h1 className="mt-4 text-2xl font-bold">Registration Submitted</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Thanks for registering{slug ? ` (workspace: ${slug})` : ''}. Our team is reviewing your documents - this page updates
            automatically the moment you're approved.
          </p>
        </>
      )}
      <Badge tone="warning" dot pulse className="mt-4">Pending Approval</Badge>
      <Link to="/" className="mt-8 text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">
        Back to home
      </Link>
    </motion.div>
  )
}
