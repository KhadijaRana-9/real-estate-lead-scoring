import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiCheck, FiCreditCard, FiSmartphone, FiClock, FiHome, FiUsers, FiBriefcase, FiGift, FiAward } from 'react-icons/fi'
import { PAID_PLANS, PAYMENT_METHODS, money } from '../data/subscriptionPlans'
import ScrollReveal from '../components/ScrollReveal'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { staggerItem, cardHover } from '../motion/variants'

const ICONS = { card: FiCreditCard, mobile: FiSmartphone, clock: FiClock }
const POPULAR_PLAN_KEY = 'professional'

// Presentation-only copy for the plan cards below - deliberately kept out
// of subscriptionPlans.js (the shared price/limit source of truth also
// consumed by AgencyRegistrationWizard) since taglines/icons are specific
// to how this page sells the plans, not business data. Every plan lists
// the same PLAN_FEATURES because the app has no per-tier feature gating
// (see billing.constants.js) - price/limits are the only real
// differentiators, so that's what's emphasized instead of fabricating
// gated features.
const PLAN_ICONS = { trial: FiGift, starter: FiHome, professional: FiBriefcase, enterprise: FiAward }

const PLAN_TAGLINES = {
  trial: 'Explore the full platform before you commit',
  starter: 'Everything a small agency needs to get started',
  professional: 'For agencies ready to scale their team and listings',
  enterprise: 'For large agencies and teams with no limits',
}

const PLAN_CTAS = {
  trial: 'Start Free Trial',
  starter: 'Choose Starter',
  professional: 'Choose Professional',
  enterprise: 'Choose Enterprise',
}

const ICON_TONE = {
  trial: 'bg-warning-50 text-warning-600 dark:bg-warning-900/40 dark:text-warning-300',
  starter: 'bg-info-50 text-info-600 dark:bg-info-900/40 dark:text-info-300',
  professional: 'bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300',
  enterprise: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
}

const PLAN_FEATURES = [
  'Property listing & management',
  'CRM with explainable lead scoring',
  'Agent & team management',
  'Analytics dashboard',
  'Custom branding & workspace',
  'Built-in AI assistant',
]

const AUDIENCES = [
  {
    icon: FiHome,
    title: 'Customers',
    body: 'Search and inquire about properties directly on an agency\'s own DreamHomes-powered site - free, no account required to browse.',
  },
  {
    icon: FiUsers,
    title: 'Agents',
    body: 'Join your agency\'s workspace, manage your own listings, and track every lead with a transparent, explainable score - no black box.',
  },
  {
    icon: FiBriefcase,
    title: 'Agencies',
    body: 'Run your whole business on DreamHomes: your own branded workspace, your team, your CRM, and built-in AI tools - all under one plan.',
  },
]

// This is the real entry point for creating an agency/business workspace
// - selecting a plan here is what the (now 3-step, subscription-free)
// AgencyRegistrationWizard reads via ?plan=/&cycle= to pre-fill itself.
// There's no old "register first, choose a plan last" path left: landing
// on /register without a valid ?plan= redirects back here (see
// AgencyRegistrationWizard.jsx).
export default function Pricing() {
  const navigate = useNavigate()
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [selectedPlan, setSelectedPlan] = useState(null) // 'trial' | plan.key | null
  const [paymentMethod, setPaymentMethod] = useState('card')

  const isPaidPlanSelected = selectedPlan && selectedPlan !== 'trial'

  const handleContinue = () => {
    if (!selectedPlan) return
    const params = new URLSearchParams({ plan: selectedPlan })
    if (selectedPlan !== 'trial') {
      params.set('cycle', billingCycle)
      params.set('method', paymentMethod)
    }
    navigate(`/register?${params.toString()}`)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <ScrollReveal className="mx-auto max-w-2xl text-center">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">Simple, transparent pricing</h1>
        <p className="mt-3 text-gray-600 dark:text-gray-300">
          DreamHomes is the SaaS platform real estate agencies run their business on. Choose a plan to set up your agency's own
          workspace - team, listings, leads, and branding included.
        </p>
      </ScrollReveal>

      <ScrollReveal stagger className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
        {AUDIENCES.map(({ icon: Icon, title, body }) => (
          <Card key={title} interactive variants={staggerItem} className="group">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-transform duration-200 group-hover:scale-110 dark:bg-brand-900/40 dark:text-brand-300">
              <Icon size={20} />
            </span>
            <h3 className="mt-3 font-semibold text-gray-900 dark:text-gray-50">{title}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{body}</p>
          </Card>
        ))}
      </ScrollReveal>

      <div className="mt-16">
        <h2 className="text-center text-xl font-bold text-gray-900 dark:text-gray-50 sm:text-2xl">Choose the right plan for your agency</h2>
        <p className="mt-1.5 text-center text-sm text-gray-500 dark:text-gray-400">
          Start with what you need today - every plan can grow with you. Change plans any time.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Billing:</span>
          <div className="flex rounded-full border border-gray-200 p-1 text-xs dark:border-gray-800">
            {['monthly', 'yearly'].map((cycle) => (
              <button
                key={cycle}
                type="button"
                onClick={() => setBillingCycle(cycle)}
                className={`relative rounded-full px-4 py-1.5 font-medium capitalize transition-colors ${
                  billingCycle === cycle ? 'text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                {billingCycle === cycle && (
                  <motion.span layoutId="billing-cycle-pill" className="absolute inset-0 rounded-full bg-brand-600" transition={{ duration: 0.2 }} />
                )}
                <span className="relative inline-flex items-center gap-1.5">
                  {cycle}
                  {cycle === 'yearly' && (
                    <Badge tone="success" className="!px-1.5 !py-0 !text-[9px]">2 months free</Badge>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>

        <ScrollReveal stagger className="mt-6 grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <motion.button
            type="button"
            variants={staggerItem}
            whileHover={cardHover.hover}
            onClick={() => setSelectedPlan('trial')}
            className={`relative flex h-full flex-col rounded-2xl border p-6 text-left shadow-sm transition-[border-color,background-color,box-shadow] duration-200 hover:shadow-lg ${
              selectedPlan === 'trial'
                ? 'border-brand-500 bg-brand-50 shadow-md dark:border-brand-500 dark:bg-brand-950/40'
                : 'border-gray-200 hover:border-gray-300 dark:border-gray-800'
            }`}
          >
            <div className="flex items-start justify-between">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${ICON_TONE.trial}`}>
                <FiGift size={18} />
              </span>
              {selectedPlan === 'trial' && <FiCheck className="text-brand-600 dark:text-brand-400" size={18} />}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="font-semibold text-gray-900 dark:text-gray-50">Free Trial</span>
              <Badge tone="warning">7 DAYS</Badge>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{PLAN_TAGLINES.trial}</p>

            <p className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-50">
              Free<span className="text-xs font-normal text-gray-400 dark:text-gray-500"> for 7 days</span>
            </p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">No credit card required</p>

            <div className="mt-4 space-y-1 border-t border-gray-100 pt-3 text-xs font-medium text-gray-600 dark:border-gray-800 dark:text-gray-300">
              <p>No property or agent limits during trial</p>
            </div>

            <ul className="mt-4 flex-1 space-y-1.5">
              {PLAN_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                  <FiCheck className="mt-0.5 shrink-0 text-brand-500" size={13} />
                  {f}
                </li>
              ))}
            </ul>

            <span
              className={`mt-5 inline-flex w-full items-center justify-center rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                selectedPlan === 'trial'
                  ? 'bg-brand-600 text-white'
                  : 'border border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-200'
              }`}
            >
              {selectedPlan === 'trial' ? 'Selected' : PLAN_CTAS.trial}
            </span>
          </motion.button>

          {PAID_PLANS.map((plan) => {
            const selected = selectedPlan === plan.key
            const popular = plan.key === POPULAR_PLAN_KEY
            const price = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly
            const Icon = PLAN_ICONS[plan.key]
            return (
              <motion.button
                key={plan.key}
                type="button"
                variants={staggerItem}
                whileHover={cardHover.hover}
                onClick={() => setSelectedPlan(plan.key)}
                className={`relative flex h-full flex-col rounded-2xl border p-6 text-left shadow-sm transition-[border-color,background-color,box-shadow] duration-200 hover:shadow-lg ${
                  selected
                    ? 'border-brand-500 bg-brand-50 shadow-md dark:border-brand-500 dark:bg-brand-950/40'
                    : popular
                    ? 'border-2 border-brand-400 shadow-lg shadow-brand-500/10 dark:border-brand-600'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-800'
                }`}
              >
                {popular && (
                  <Badge tone="brand" className="absolute -top-3 left-1/2 -translate-x-1/2 shadow-sm">
                    Most Popular
                  </Badge>
                )}

                <div className="flex items-start justify-between">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${ICON_TONE[plan.key]}`}>
                    <Icon size={18} />
                  </span>
                  {selected && <FiCheck className="text-brand-600 dark:text-brand-400" size={18} />}
                </div>

                <span className="mt-3 font-semibold text-gray-900 dark:text-gray-50">{plan.label}</span>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{PLAN_TAGLINES[plan.key]}</p>

                <p className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-50">
                  {money(price)}
                  <span className="text-xs font-normal text-gray-400 dark:text-gray-500">/{billingCycle === 'yearly' ? 'yr' : 'mo'}</span>
                </p>

                <div className="mt-4 space-y-1 border-t border-gray-100 pt-3 text-xs font-medium text-gray-600 dark:border-gray-800 dark:text-gray-300">
                  <p>{plan.maxProperties ? `Up to ${plan.maxProperties} properties` : 'Unlimited properties'}</p>
                  <p>{plan.maxAgents ? `Up to ${plan.maxAgents} agents` : 'Unlimited agents'}</p>
                </div>

                <ul className="mt-4 flex-1 space-y-1.5">
                  {PLAN_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                      <FiCheck className="mt-0.5 shrink-0 text-brand-500" size={13} />
                      {f}
                    </li>
                  ))}
                </ul>

                <span
                  className={`mt-5 inline-flex w-full items-center justify-center rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                    selected || popular
                      ? 'bg-brand-600 text-white'
                      : 'border border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-200'
                  }`}
                >
                  {selected ? 'Selected' : PLAN_CTAS[plan.key]}
                </span>
              </motion.button>
            )
          })}
        </ScrollReveal>

        {isPaidPlanSelected && (
          <ScrollReveal className="mx-auto mt-8 max-w-3xl">
            <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-50">Payment method</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {PAYMENT_METHODS.map((m) => {
                const Icon = ICONS[m.iconKey]
                const selected = paymentMethod === m.key
                return (
                  <button
                    key={m.key}
                    type="button"
                    disabled={!m.available}
                    onClick={() => setPaymentMethod(m.key)}
                    title={m.available ? undefined : 'Coming soon'}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
                      !m.available
                        ? 'cursor-not-allowed border-gray-200 text-gray-400 dark:border-gray-800 dark:text-gray-600'
                        : selected
                        ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-950/40 dark:text-brand-300'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-800 dark:text-gray-300'
                    }`}
                  >
                    <Icon size={18} />
                    {m.label}
                    {!m.available && <Badge tone="neutral" className="!px-1.5 !py-0.5 !text-[9px]">Coming soon</Badge>}
                  </button>
                )
              })}
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              You'll complete secure payment via Stripe's checkout page as the final step of setting up your agency - DreamHomes never
              sees or stores your card number.
            </p>
          </ScrollReveal>
        )}

        <div className="mt-8 flex justify-center">
          <Button size="lg" onClick={handleContinue} disabled={!selectedPlan}>
            {selectedPlan ? 'Continue to Registration' : 'Select a plan to continue'}
          </Button>
        </div>

        <div className="mx-auto mt-6 flex max-w-3xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-gray-500 dark:text-gray-400">
          {['No setup fees', 'Upgrade anytime as you grow', 'Secure checkout via Stripe', 'Monthly or yearly billing'].map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5">
              <FiCheck className="text-brand-500" size={13} />
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
