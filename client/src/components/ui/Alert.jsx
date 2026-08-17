import { FiInfo, FiAlertTriangle, FiAlertCircle, FiCheckCircle } from 'react-icons/fi'

const TONES = {
  info: { box: 'border-info-100 bg-info-50 text-info-800 dark:border-info-900 dark:bg-info-900/30 dark:text-info-200', icon: FiInfo },
  warning: {
    box: 'border-warning-100 bg-warning-50 text-warning-800 dark:border-warning-900 dark:bg-warning-900/30 dark:text-warning-200',
    icon: FiAlertTriangle,
  },
  danger: {
    box: 'border-danger-100 bg-danger-50 text-danger-800 dark:border-danger-900 dark:bg-danger-900/30 dark:text-danger-200',
    icon: FiAlertCircle,
  },
  success: {
    box: 'border-success-100 bg-success-50 text-success-800 dark:border-success-900 dark:bg-success-900/30 dark:text-success-200',
    icon: FiCheckCircle,
  },
}

// The recurring amber/red inline-banner idiom (pending/suspended
// notices, agent-limit warnings, manual-invite-link fallback boxes),
// consolidated into one component instead of each file re-typing its
// own border/bg/text triplet.
export default function Alert({ tone = 'info', title, children, className = '' }) {
  const t = TONES[tone] || TONES.info
  const Icon = t.icon
  return (
    <div className={`flex gap-2.5 rounded-lg border p-3 text-sm ${t.box} ${className}`}>
      <Icon className="mt-0.5 shrink-0" size={16} />
      <div>
        {title && <p className="font-medium">{title}</p>}
        <div className={title ? 'mt-0.5 text-xs opacity-90' : ''}>{children}</div>
      </div>
    </div>
  )
}
