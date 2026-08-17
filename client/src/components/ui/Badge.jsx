const TONES = {
  success: { pill: 'bg-success-100 text-success-700 dark:bg-success-900/40 dark:text-success-300', dot: 'bg-success-500' },
  warning: { pill: 'bg-warning-100 text-warning-700 dark:bg-warning-900/40 dark:text-warning-300', dot: 'bg-warning-500' },
  danger: { pill: 'bg-danger-100 text-danger-700 dark:bg-danger-900/40 dark:text-danger-300', dot: 'bg-danger-500' },
  info: { pill: 'bg-info-100 text-info-700 dark:bg-info-900/40 dark:text-info-300', dot: 'bg-info-500' },
  brand: { pill: 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300', dot: 'bg-brand-500' },
  neutral: { pill: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', dot: 'bg-gray-400' },
}

// The one place status/plan/role pills should come from - replaces the
// ~10 independent inline color maps scattered across AgencyManagement,
// AgencyProfileSettings, LeadScoreBreakdown, TeamManagement,
// PlatformDashboard, RegistrationPending etc. `tone` is the semantic
// meaning (success/warning/danger/info/brand/neutral); pass the actual
// label text as children so callers keep control of copy/capitalization.
export default function Badge({ tone = 'neutral', dot = false, pulse = false, className = '', children }) {
  const t = TONES[tone] || TONES.neutral
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${t.pill} ${className}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${t.dot} ${pulse ? 'animate-pulse' : ''}`} />}
      {children}
    </span>
  )
}
