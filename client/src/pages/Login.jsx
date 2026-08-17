import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { fadeUp } from '../motion/variants'
import CityGridBackground from '../components/CityGridBackground'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const urlWorkspace = searchParams.get('workspace')
  const [manualWorkspace, setManualWorkspace] = useState('')
  const [remember, setRemember] = useState(true)
  const [shake, setShake] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm()

  const needsWorkspaceField = !urlWorkspace
  const effectiveWorkspace = urlWorkspace || (needsWorkspaceField ? manualWorkspace.trim() || undefined : undefined)
  // Same shared login/backend for every role - only the copy adapts.
  // Nothing currently navigates here with a /agencies/:slug state.from
  // (the old role-choice entry screen that used to do that was removed -
  // anonymous visitors now browse an agency's public page directly, and
  // customer login is instead prompted at the point a protected action
  // needs it). Left in place rather than deleted: still correct, and
  // gives any future customer-specific entry point the same tailored
  // copy for free by simply setting this same state.from shape again.
  const isCustomerContext = Boolean(location.state?.from?.startsWith('/agencies/'))

  const onSubmit = async (values) => {
    try {
      const loggedInUser = await login(values, effectiveWorkspace, remember)
      toast.success('Welcome back!')
      const isAgencyStaff = loggedInUser?.role === 'agency_admin' || loggedInUser?.role === 'agent'
      navigate(location.state?.from || (isAgencyStaff ? '/dashboard' : '/'))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed')
      setShake(true)
      setTimeout(() => setShake(false), 500)
    }
  }

  const handleForgotPassword = () => {
    toast('Password reset isn\'t available yet — contact your agency admin or DreamHomes support.', { icon: 'ℹ️' })
  }

  return (
    <div className="relative flex min-h-[82vh] w-full items-center justify-center overflow-hidden px-4 py-12">
      <CityGridBackground />
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className={`relative z-10 w-full max-w-md rounded-2xl border border-gray-200 bg-white/95 p-8 shadow-xl backdrop-blur-sm dark:border-brand-900/60 dark:bg-gray-950/90 dark:shadow-[0_0_40px_-10px_rgba(52,211,153,0.25)] ${shake ? 'animate-shake' : ''}`}
      >
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">{urlWorkspace ? 'Agent Login' : 'Agency Login'}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {isCustomerContext ? 'Log in to browse listings, save favorites, and contact agents.' : 'Log in to manage your listings and leads.'}
        </p>
        {urlWorkspace && (
          <Badge tone="brand" className="mt-2">Workspace: {urlWorkspace}</Badge>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          {needsWorkspaceField && (
            <Input
              label="Agency workspace"
              value={manualWorkspace}
              onChange={(e) => setManualWorkspace(e.target.value)}
              placeholder="your-agency-slug"
            />
          )}
          {needsWorkspaceField && (
            <p className="-mt-3 text-xs text-gray-500 dark:text-gray-400">
              Find this in your agency's profile URL. Leave blank if you signed up on the default DreamHomes workspace.
            </p>
          )}

          <Input label="Email" type="email" error={errors.email?.message} {...register('email', { required: 'Email is required' })} />

          <Input
            label="Password"
            type="password"
            error={errors.password?.message}
            {...register('password', { required: 'Password is required' })}
          />

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="rounded accent-brand-600"
              />
              Remember me
            </label>
            <button type="button" onClick={handleForgotPassword} className="font-medium text-brand-600 hover:underline dark:text-brand-400">
              Forgot password?
            </button>
          </div>

          <Button type="submit" loading={isSubmitting} className="w-full">
            {isSubmitting ? 'Logging in...' : 'Log In'}
          </Button>
        </form>

        {urlWorkspace && (
          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Don&apos;t have an account?{' '}
            <Link to={`/signup?workspace=${urlWorkspace}`} state={location.state} className="font-medium text-brand-600 hover:underline dark:text-brand-400">
              Sign up
            </Link>
          </p>
        )}

        {!isCustomerContext && (
          <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
            <Button to="/pricing" variant="outline" className="w-full">
              Register as Agency User
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  )
}
