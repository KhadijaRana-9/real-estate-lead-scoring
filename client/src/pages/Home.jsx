import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  FiShield,
  FiTrendingUp,
  FiLayers,
  FiZap,
  FiHome,
  FiMapPin,
  FiUsers,
  FiBriefcase,
  FiGlobe,
  FiMessageCircle,
  FiBarChart2,
  FiCheckCircle,
  FiArrowRight,
  FiCreditCard,
} from 'react-icons/fi'
import { useEffect, useState } from 'react'
import * as api from '../api/endpoints'
import CountUpNumber from '../components/CountUpNumber'
import AmbientBackground from '../components/AmbientBackground'
import CursorGlow from '../components/CursorGlow'
import HeroCityBackground from '../components/HeroCityBackground'
import RainDropsOverlay from '../components/RainDropsOverlay'
import ScrollReveal from '../components/ScrollReveal'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { fadeUp, staggerContainer, staggerItem } from '../motion/variants'

const WHY_CHOOSE_US = [
  {
    icon: FiShield,
    title: 'Explainable Lead Scoring',
    body: 'Every lead score shows its full breakdown — budget match, urgency, interest, popularity. No black box, ever.',
  },
  {
    icon: FiLayers,
    title: 'Built for Multi-Agency Scale',
    body: 'Each agency operates in a fully isolated workspace — its own listings, leads, agents, and branding.',
  },
  {
    icon: FiTrendingUp,
    title: 'Itemized Price Estimates',
    body: 'City-calibrated pricing with a transparent, line-by-line breakdown — not a single unexplained number.',
  },
  {
    icon: FiZap,
    title: 'Built for Agents, Not Just Admins',
    body: 'Fast listing management, real-time lead visibility, and a dashboard that surfaces what matters today.',
  },
]

const FEATURES = [
  {
    icon: FiHome,
    title: 'Property Management',
    body: 'A guided listing wizard with categorized media, drafts, and a publish step — everything an agent needs to get a property live.',
  },
  {
    icon: FiUsers,
    title: 'Team & Agent Management',
    body: 'Invite agents directly or let them apply to your agency. You approve, assign roles, and manage your whole team from one place.',
  },
  {
    icon: FiMessageCircle,
    title: 'CRM & Lead Scoring',
    body: 'Every inquiry becomes a scored, explainable lead — budget match, urgency, and interest, broken down line by line.',
  },
  {
    icon: FiBarChart2,
    title: 'Analytics & Insights',
    body: 'Track listing performance, lead volume, and team activity with dashboards built for how agencies actually work.',
  },
  {
    icon: FiGlobe,
    title: 'Your Own Branded Website',
    body: 'Every agency gets its own public workspace and profile URL — showing only your listings, your agents, your brand.',
  },
  {
    icon: FiZap,
    title: 'AI Assistant Built In',
    body: 'An AI assistant is available across the platform to help agents and customers search, compare, and get answers faster.',
  },
]

const HOW_IT_WORKS = [
  { title: 'Choose a plan', body: 'Pick the plan that fits your agency and start a free trial or subscribe.', icon: FiCreditCard },
  { title: 'Set up your agency', body: 'Add your owner and agency details to create your workspace.', icon: FiHome },
  { title: 'Get approved', body: 'Our team reviews and verifies your agency before it goes live.', icon: FiCheckCircle },
  { title: 'Manage your business', body: 'Add agents, list properties, and manage leads from your own dashboard.', icon: FiBarChart2 },
]

export default function Home() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    let cancelled = false

    api
      .getAgencyPlatformStats()
      .then(({ data }) => {
        if (!cancelled) setStats(data)
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  const statItems = stats
    ? [
        { label: 'Agencies', value: stats.totalAgencies, icon: FiBriefcase, color: 'text-emerald-500 bg-emerald-500/10' },
        { label: 'Properties Listed', value: stats.totalProperties, icon: FiHome, suffix: '+', color: 'text-blue-500 bg-blue-500/10' },
        { label: 'Agents', value: stats.totalAgents, icon: FiUsers, color: 'text-violet-500 bg-violet-500/10' },
        { label: 'Cities Covered', value: stats.totalCities, icon: FiMapPin, color: 'text-amber-500 bg-amber-500/10' },
      ]
    : []

  return (
    <div className="relative">
      <AmbientBackground />
      <CursorGlow />

      <motion.section
        initial="hidden"
        animate="visible"
        variants={staggerContainer(0.12)}
        className="relative overflow-hidden px-4 py-24 text-center"
      >
        {/* Real photo base (same verified Unsplash shot as before) with
            a green/gold aurora color-grade, soft aurora glow, and an
            animated water-shimmer band - see HeroCityBackground.jsx and
            its .hero-* classes in index.css. Includes its own
            readability scrim, so nothing else is needed here. */}
        <HeroCityBackground />

        <motion.h1
          variants={staggerItem}
          className="relative font-heading text-4xl font-extrabold tracking-tight text-gray-900 sm:text-6xl dark:text-white"
        >
          One Platform. Your Brand.
          <br className="hidden sm:block" /> <span className="text-brand-600 dark:text-teal-300">Your Business.</span>
        </motion.h1>
        <motion.p variants={staggerItem} className="relative mx-auto mt-4 max-w-xl text-lg text-gray-600 dark:text-gray-300">
          DreamHomes gives real estate agencies a centralized workspace to manage properties, leads, teams, and customer relationships while using AI to work smarter.
        </motion.p>

        <motion.div variants={staggerItem} className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button to="/pricing" size="lg">
            Start Free Trial
          </Button>
          <Button to="/pricing" variant="outline" size="lg" className="bg-white/70 backdrop-blur dark:bg-white/10">
            Explore Plans
          </Button>
          <a
            href="#how-it-works"
            className="group inline-flex items-center gap-1.5 px-2 py-3 text-sm font-semibold text-gray-700 transition-colors hover:text-brand-600 dark:text-gray-200 dark:hover:text-teal-300"
          >
            See How It Works
            <FiArrowRight className="transition-transform duration-200 group-hover:translate-x-1" size={15} />
          </a>
        </motion.div>

        {stats && (
          <motion.div
            variants={staggerItem}
            className="relative mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-4 px-4 sm:grid-cols-4"
          >
            {statItems.map((item, i) => (
              <motion.div
                key={item.label}
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4 + i * 0.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
                whileHover={{ y: -4, scale: 1.03 }}
                className="rounded-2xl border border-gray-200 bg-white/80 p-4 text-left shadow-sm backdrop-blur transition-shadow hover:shadow-lg dark:border-white/10 dark:bg-white/5"
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.color}`}>
                  <item.icon size={17} />
                </span>
                <p className="mt-3 font-heading text-2xl font-extrabold text-gray-900 sm:text-3xl dark:text-white">
                  <CountUpNumber end={item.value} duration={1.4} />
                  {item.suffix || ''}
                </p>
                <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {item.label}
                </p>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.section>

      <ScrollReveal as="section" id="features" stagger className="bg-white px-4 py-16 sm:px-6 lg:px-8 dark:bg-gray-950">
        <div className="mx-auto max-w-7xl scroll-mt-20">
          <motion.div variants={staggerItem} className="mb-10 text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">Powerful Features</span>
            <h2 className="mt-2 font-heading text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">Everything You Need to Succeed</h2>
            <p className="mx-auto mt-2 max-w-xl text-gray-500 dark:text-gray-400">
              One platform for listings, your team, your leads, and your agency's own branded presence.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }, i) => (
              <Card key={title} interactive variants={staggerItem} className="group flex min-h-[168px] flex-col overflow-hidden">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110 ${
                    i % 2 === 0
                      ? 'bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300'
                      : 'bg-info-50 text-info-600 dark:bg-info-900/40 dark:text-info-300'
                  }`}
                >
                  <Icon size={20} />
                </span>
                <h3 className="mt-3 font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {body}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal as="section" id="how-it-works" stagger className="relative mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="relative z-10">
          <motion.div variants={staggerItem} className="mb-14 text-center">
            <h2 className="font-heading text-2xl font-bold sm:text-3xl">How It Works</h2>
            <p className="mx-auto mt-2 max-w-xl text-gray-500 dark:text-gray-400">
              From choosing a plan to running your business — four steps to get your agency live.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.title} className="relative h-full">
                <Card variants={staggerItem} interactive className="relative flex h-full flex-col">
                  <span className="font-heading text-xs font-bold uppercase tracking-widest text-brand-500 dark:text-brand-400">
                    Step 0{i + 1}
                  </span>
                  <span className="mt-2 font-heading text-3xl font-extrabold text-gray-900 dark:text-white">{i + 1}</span>
                  <span className="mt-4 flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                    <step.icon size={19} />
                  </span>
                  <h3 className="mt-4 font-semibold">{step.title}</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{step.body}</p>
                  <span className="mt-4 h-1 w-10 rounded-full bg-brand-500/60" />
                </Card>
                {/* connecting flow line between steps - desktop only, shows
                    progression from one card to the next. */}
                {i < HOW_IT_WORKS.length - 1 && (
                  <div
                    className="absolute right-[-14px] top-20 z-10 hidden w-7 -translate-y-1/2 border-t-2 border-dotted border-brand-300 lg:block dark:border-brand-700"
                    aria-hidden="true"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal as="section" stagger className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <motion.div variants={staggerItem} className="mb-10 text-center">
          <h2 className="font-heading text-2xl font-bold sm:text-3xl">Why Agencies Choose Us</h2>
          <p className="mx-auto mt-2 max-w-xl text-gray-500 dark:text-gray-400">
            Built around one idea: every number the system shows you should be explainable.
          </p>
        </motion.div>
        {/* relative wrapper scopes RainDropsOverlay to exactly this grid's
            bounding box - the four cards only, never the section's
            heading/subtitle above or any other part of the page. */}
        <div className="relative">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {WHY_CHOOSE_US.map(({ icon: Icon, title, body }) => (
              <Card key={title} interactive variants={staggerItem} className="group flex min-h-[168px] flex-col overflow-hidden">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-transform duration-200 group-hover:scale-110 dark:bg-brand-900/40 dark:text-brand-300">
                  <Icon size={20} />
                </span>
                <h3 className="mt-3 font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {body}
                </p>
              </Card>
            ))}
          </div>
          <RainDropsOverlay />
        </div>
      </ScrollReveal>

      <ScrollReveal as="section" className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <motion.div variants={fadeUp} className="rounded-3xl bg-gradient-to-br from-brand-600 to-brand-700 p-10 text-white shadow-xl sm:p-14">
          <h2 className="font-heading text-2xl font-bold sm:text-3xl">Ready to grow your real estate business?</h2>
          <p className="mx-auto mt-2 max-w-md text-brand-50">
            Choose a plan, set up your agency, and start managing listings and leads today.
          </p>
          <Link
            to="/pricing"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-brand-700 shadow-lg transition-transform duration-150 hover:scale-[1.03] hover:bg-gray-50 active:scale-[0.97]"
          >
            <FiCheckCircle /> Get Started
          </Link>
        </motion.div>
      </ScrollReveal>
    </div>
  )
}
