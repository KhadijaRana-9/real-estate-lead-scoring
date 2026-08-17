import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import * as api from '../../api/endpoints'
import RegistrationProgressBar from './RegistrationProgressBar'
import Step1BasicInfo, { step1Errors } from './steps/Step1BasicInfo'
import Step2OwnerInfo, { step2Errors } from './steps/Step2OwnerInfo'
import Step3Verification, { step3Errors } from './steps/Step3Verification'
import { PAID_PLANS, money } from '../../data/subscriptionPlans'
import Button from '../ui/Button'

// Owner -> Agency -> Verification, in that order (matches the required
// business flow: subscription is chosen BEFORE this wizard even starts,
// on Pricing.jsx - this wizard no longer asks for it at all).
const STEP_COMPONENTS = [Step2OwnerInfo, Step1BasicInfo, Step3Verification]
const STEP_VALIDATORS = [step2Errors, step1Errors, step3Errors]

const VALID_PLAN_KEYS = ['trial', ...PAID_PLANS.map((p) => p.key)]

const EMPTY_REGISTRATION = {
  companyName: '', slug: '', description: '', establishedYear: '', website: '', address: '', city: '', country: '', logo: null,
  ownerName: '', ownerEmail: '', ownerPhone: '', ownerCnic: '', password: '', confirmPassword: '', profilePicture: null,
  registrationCertificate: null, businessLicense: null, cnicDocument: null, officeProof: null,
  subscriptionPlan: '',
  billingCycle: 'monthly',
}

function planSummary(planKey, billingCycle) {
  if (planKey === 'trial') return { label: 'Free Trial', price: 'Free for 7 days' }
  const plan = PAID_PLANS.find((p) => p.key === planKey)
  if (!plan) return null
  const price = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly
  return { label: plan.label, price: `${money(price)}/${billingCycle === 'yearly' ? 'yr' : 'mo'}` }
}

// Every step's data lives here, in memory, across the whole flow (files
// included as real File objects) - no draft is persisted server-side
// until the final submit, unlike PropertyWizard's per-step autosave,
// because no authenticated session exists yet for an anonymous
// applicant to save a draft against (see agencyRegistration.service.js).
//
// subscriptionPlan/billingCycle are seeded once, on mount, from the
// ?plan=/&cycle= query params Pricing.jsx navigates here with - there is
// no in-wizard way to choose or change them (see the "Your Plan" summary
// bar below, which only links back to /pricing). Landing here with no
// valid ?plan= redirects straight to /pricing - this wizard cannot be
// completed without a plan already chosen, which is what actually closes
// off the old "register first, pick a plan last" path.
export default function AgencyRegistrationWizard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const planParam = searchParams.get('plan')
  const cycleParam = searchParams.get('cycle') === 'yearly' ? 'yearly' : 'monthly'
  const planIsValid = VALID_PLAN_KEYS.includes(planParam)

  const [step, setStep] = useState(1)
  const [data, setData] = useState(() => ({
    ...EMPTY_REGISTRATION,
    subscriptionPlan: planIsValid ? planParam : '',
    billingCycle: cycleParam,
  }))
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!planIsValid) {
      toast.error('Please choose a plan first.')
      navigate('/pricing', { replace: true })
    }
    // Only needs to run once, on mount - changing the URL after landing
    // here (e.g. via browser back/forward) isn't a supported mid-wizard
    // plan change, matching the "no in-wizard way to change plan" design.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!planIsValid) return null

  const StepComponent = STEP_COMPONENTS[step - 1]
  const isLastStep = step === STEP_COMPONENTS.length
  const summary = planSummary(data.subscriptionPlan, data.billingCycle)

  const goNext = () => {
    const errors = STEP_VALIDATORS[step - 1](data)
    if (errors.length > 0) {
      toast.error(errors[0])
      return
    }
    setStep((s) => Math.min(s + 1, STEP_COMPONENTS.length))
  }

  const goBack = () => setStep((s) => Math.max(s - 1, 1))

  const handleSubmit = async () => {
    // The final step's own validator was never run before submit (unlike
    // every other step, which goNext validates) - a user could reach here
    // having skipped required verification documents entirely. Mirrors
    // goNext's exact check.
    const errors = STEP_VALIDATORS[step - 1](data)
    if (errors.length > 0) {
      toast.error(errors[0])
      return
    }
    setSubmitting(true)
    try {
      const formData = new FormData()
      Object.entries(data).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') return
        formData.append(key, value)
      })

      const { data: result } = await api.registerAgency(formData)

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl
        return
      }

      toast.success('Registration submitted!')
      navigate(`/register/pending?agencyId=${result.agencyId}&slug=${result.slug}`)
    } catch (err) {
      const message = err.response?.data?.errors?.[0]?.message || err.response?.data?.message || 'Could not submit registration'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative z-10 mx-auto max-w-2xl px-4 py-10 sm:px-6">
      {/* Same floating-card treatment as Login/Signup - a solid/blurred
          background so the card stays fully readable over the city-grid
          backdrop AgencyRegister.jsx renders behind this page. */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white/95 shadow-xl backdrop-blur-sm dark:border-brand-900/60 dark:bg-gray-950/90 dark:shadow-[0_0_40px_-10px_rgba(52,211,153,0.25)]">
        <div className="px-4 pb-2 pt-6 text-center sm:px-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Register Your Agency</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started with DreamHomes in a few steps.</p>
        </div>

        {summary && (
          <div className="mx-4 mb-2 flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm dark:border-brand-900 dark:bg-brand-950/40 sm:mx-6">
            <span className="text-brand-800 dark:text-brand-300">
              Your plan: <strong>{summary.label}</strong> ({summary.price})
            </span>
            <Link to="/pricing" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
              Change plan
            </Link>
          </div>
        )}

        <RegistrationProgressBar currentStep={step} />

        <div className="p-4 sm:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
            >
              <StepComponent data={data} onChange={setData} />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-800 sm:px-6">
          <Button onClick={goBack} disabled={step === 1} variant="outline">
            Back
          </Button>
          {isLastStep ? (
            <Button onClick={handleSubmit} loading={submitting}>
              {submitting ? 'Submitting...' : 'Submit Registration'}
            </Button>
          ) : (
            <Button onClick={goNext}>Next</Button>
          )}
        </div>
      </div>
    </div>
  )
}
