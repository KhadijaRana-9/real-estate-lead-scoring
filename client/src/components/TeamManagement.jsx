import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { FiMail, FiUserPlus, FiUserX, FiCheck, FiX, FiClock, FiCopy, FiInbox } from 'react-icons/fi'
import * as api from '../api/endpoints'
import EmptyState from './EmptyState'
import Input from './ui/Input'
import Button from './ui/Button'
import Badge from './ui/Badge'
import Alert from './ui/Alert'
import { formatDate } from '../utils/format'
import { staggerContainer, staggerItem } from '../motion/variants'

const cardCls = 'rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900'

function SectionHeader({ title, count }) {
  return (
    <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
      <h3 className="text-sm font-semibold">{title}</h3>
      {count !== undefined && <Badge tone="neutral">{count}</Badge>}
    </div>
  )
}

function InlineEmpty({ children }) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-4 py-8 text-center">
      <FiInbox className="text-gray-300 dark:text-gray-700" size={20} />
      <p className="text-sm text-gray-400">{children}</p>
    </div>
  )
}

function InviteForm({ onInvited, disabled, limitMessage }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('agent')
  const [saving, setSaving] = useState(false)
  // Shown when email delivery isn't configured (no SMTP_* env vars) - the
  // backend still creates a real, valid invite link, it just can't
  // deliver it. Without this, that link was previously discarded
  // entirely and the admin had no way to reach the invitee.
  const [manualInviteUrl, setManualInviteUrl] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setManualInviteUrl(null)
    try {
      const { data } = await api.inviteAgent({ email, role })
      if (data.emailSent) {
        toast.success('Invitation sent')
      } else {
        toast('Invite created — email delivery isn\'t configured. Copy the link below to share it manually.', { icon: 'ℹ️', duration: 6000 })
        setManualInviteUrl(data.inviteUrl)
      }
      setEmail('')
      onInvited()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send invite')
    } finally {
      setSaving(false)
    }
  }

  const copyInviteUrl = async () => {
    try {
      await navigator.clipboard.writeText(manualInviteUrl)
      toast.success('Link copied')
    } catch {
      toast.error('Could not copy - select and copy the link manually')
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-end">
        <Input
          label="Invite by email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="agent@example.com"
          className="flex-1"
        />
        <Input label="Role" as="select" value={role} onChange={(e) => setRole(e.target.value)} className="w-full sm:w-40">
          <option value="agent">Agent</option>
          <option value="agency_admin">Agency Admin</option>
        </Input>
        <Button type="submit" loading={saving} disabled={disabled} title={disabled ? limitMessage : undefined}>
          <FiUserPlus size={14} /> {saving ? 'Sending...' : 'Send Invite'}
        </Button>
      </form>

      {manualInviteUrl && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mx-4 mb-4">
          <Alert tone="warning" title="Email delivery isn't configured — share this link manually:">
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 break-all rounded bg-white px-2 py-1 text-warning-900 dark:bg-gray-900 dark:text-warning-200">{manualInviteUrl}</code>
              <Button type="button" onClick={copyInviteUrl} variant="outline" size="sm" className="shrink-0">
                <FiCopy size={12} /> Copy
              </Button>
            </div>
          </Alert>
        </motion.div>
      )}
    </div>
  )
}

export default function TeamManagement() {
  const [invites, setInvites] = useState(null)
  const [applications, setApplications] = useState(null)
  const [members, setMembers] = useState(null)
  const [usage, setUsage] = useState(null)
  const [error, setError] = useState(false)

  const loadAll = useCallback(() => {
    setError(false)
    Promise.all([api.getAgencyInvites(), api.getAgencyApplications(), api.getTeamMembers(), api.getSubscription()])
      .then(([invitesRes, applicationsRes, membersRes, subRes]) => {
        setInvites(invitesRes.data)
        setApplications(applicationsRes.data)
        setMembers(membersRes.data)
        setUsage(subRes.data)
      })
      .catch(() => setError(true))
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const handleRevoke = async (id) => {
    if (!window.confirm('Revoke this invitation?')) return
    try {
      await api.revokeAgentInvite(id)
      toast.success('Invitation revoked')
      loadAll()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not revoke invite')
    }
  }

  const handleApprove = async (id) => {
    try {
      await api.approveAgencyApplication(id)
      toast.success('Application approved - agent can now log in')
      loadAll()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not approve application')
    }
  }

  const handleReject = async (id) => {
    const reason = window.prompt('Reason for rejection (optional):') || ''
    try {
      await api.rejectAgencyApplication(id, reason)
      toast.success('Application rejected')
      loadAll()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not reject application')
    }
  }

  const handleRemove = async (id, name) => {
    if (!window.confirm(`Remove ${name} from the team? This cannot be undone.`)) return
    try {
      await api.removeTeamMember(id)
      toast.success('Team member removed')
      loadAll()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not remove team member')
    }
  }

  if (error) {
    return (
      <EmptyState
        title="Couldn't load team"
        message="Please check your connection and try again."
        action={<Button onClick={loadAll}>Retry</Button>}
      />
    )
  }

  if (!invites || !applications || !members || !usage) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    )
  }

  const pendingApplications = applications.filter((a) => a.status === 'pending')
  const rejectedApplications = applications.filter((a) => a.status === 'rejected')
  // res.json() serializes Infinity (trial/enterprise's real maxAgents
  // value, see billing.constants.js) as null over the wire - checking
  // `!== Infinity` here always passed false and permanently locked out
  // every trial/enterprise agency's invites. AttachmentRenderer.jsx
  // already handles this same wire quirk correctly elsewhere with a
  // `=== null` check - matching that here.
  const atAgentLimit = usage.limits.maxAgents !== null && usage.usage.agents >= usage.limits.maxAgents
  const limitMessage = atAgentLimit
    ? `Your ${usage.plan} plan allows up to ${usage.limits.maxAgents} agents. Upgrade your subscription to invite more.`
    : undefined

  return (
    <motion.div initial="hidden" animate="visible" variants={staggerContainer(0.08)} className="space-y-6">
      {atAgentLimit && (
        <motion.div variants={staggerItem}>
          <Alert tone="warning">
            You've reached your plan's agent limit ({usage.usage.agents}/{usage.limits.maxAgents}). Upgrade your subscription to invite or
            approve more agents.
          </Alert>
        </motion.div>
      )}

      <motion.div variants={staggerItem} className={cardCls}>
        <SectionHeader title="Invite an Agent" />
        <InviteForm onInvited={loadAll} disabled={atAgentLimit} limitMessage={limitMessage} />
      </motion.div>

      <motion.div variants={staggerItem} className={cardCls}>
        <SectionHeader title="Pending Invitations" count={invites.length} />
        {invites.length === 0 ? (
          <InlineEmpty>No pending invitations.</InlineEmpty>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {invites.map((inv) => (
              <div key={inv._id} className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                    <FiMail size={13} className="shrink-0 text-gray-400" /> {inv.email}
                  </p>
                  <p className="text-xs text-gray-400">
                    {inv.role === 'agency_admin' ? 'Agency Admin' : 'Agent'} · invited {formatDate(inv.createdAt)} · expires {formatDate(inv.expiresAt)}
                  </p>
                </div>
                <Button onClick={() => handleRevoke(inv._id)} variant="ghost" size="sm" className="shrink-0 !text-danger-600 dark:!text-danger-400">
                  Revoke
                </Button>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      <motion.div variants={staggerItem} className={cardCls}>
        <SectionHeader title="Pending Applications" count={pendingApplications.length} />
        {pendingApplications.length === 0 ? (
          <InlineEmpty>No pending applications.</InlineEmpty>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {pendingApplications.map((app) => (
              <div
                key={app._id}
                className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between dark:hover:bg-gray-800/60"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{app.name}</p>
                  <p className="text-xs text-gray-400">
                    {app.email}{app.phone ? ` · ${app.phone}` : ''}{app.experienceYears != null ? ` · ${app.experienceYears} yrs experience` : ''} · applied {formatDate(app.createdAt)}
                  </p>
                  {app.message && <p className="mt-1 max-w-md text-xs italic text-gray-500 dark:text-gray-400">"{app.message}"</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button onClick={() => handleApprove(app._id)} variant="success" size="sm">
                    <FiCheck size={12} /> Approve
                  </Button>
                  <Button onClick={() => handleReject(app._id)} variant="outline" size="sm" className="!border-danger-300 !text-danger-600 hover:!bg-danger-50 dark:!border-danger-900 dark:!text-danger-400">
                    <FiX size={12} /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      <motion.div variants={staggerItem} className={cardCls}>
        <SectionHeader title="Active Team" count={members.length} />
        {members.length === 0 ? (
          <InlineEmpty>No team members yet.</InlineEmpty>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {members.map((m) => (
              <div key={m._id} className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                    {m.name[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{m.name}</p>
                    <p className="truncate text-xs text-gray-400">{m.email}{m.phone ? ` · ${m.phone}` : ''}</p>
                  </div>
                  <Badge tone={m.role === 'agency_admin' ? 'brand' : 'neutral'} className="shrink-0">
                    {m.role === 'agency_admin' ? 'Admin' : 'Agent'}
                  </Badge>
                </div>
                {m.role !== 'agency_admin' && (
                  <Button onClick={() => handleRemove(m._id, m.name)} variant="ghost" size="sm" className="shrink-0 !text-danger-600 dark:!text-danger-400">
                    <FiUserX size={12} /> Remove
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {rejectedApplications.length > 0 && (
        <motion.div variants={staggerItem} className={cardCls}>
          <SectionHeader title="Rejected Applications" count={rejectedApplications.length} />
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {rejectedApplications.map((app) => (
              <div key={app._id} className="flex items-center justify-between gap-3 px-4 py-3 opacity-70">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{app.name}</p>
                  <p className="truncate text-xs text-gray-400">{app.email}{app.rejectionReason ? ` · ${app.rejectionReason}` : ''}</p>
                </div>
                <span className="flex shrink-0 items-center gap-1 text-xs text-gray-400">
                  <FiClock size={11} /> {formatDate(app.reviewedAt)}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
