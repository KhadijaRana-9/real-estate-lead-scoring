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

export default function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const workspace = searchParams.get('workspace')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm()

  const onSubmit = async (values) => {
    try {
      await signup(values, workspace)
      toast.success('Account created!')
      navigate(location.state?.from || '/')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Signup failed')
    }
  }

  return (
    <div className="relative flex min-h-[82vh] w-full items-center justify-center overflow-hidden px-4 py-12">
      <CityGridBackground />
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="relative z-10 w-full max-w-md rounded-2xl border border-gray-200 bg-white/95 p-8 shadow-xl backdrop-blur-sm dark:border-brand-900/60 dark:bg-gray-950/90 dark:shadow-[0_0_40px_-10px_rgba(52,211,153,0.25)]"
      >
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Create your account</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Join DreamHomes as a customer.</p>
        {workspace && <Badge tone="brand" className="mt-2">Workspace: {workspace}</Badge>}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <Input label="Full name" error={errors.name?.message} {...register('name', { required: 'Name is required' })} />

          <Input label="Email" type="email" error={errors.email?.message} {...register('email', { required: 'Email is required' })} />

          <Input
            label="Password"
            type="password"
            error={errors.password?.message}
            {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'At least 8 characters' } })}
          />

          <Button type="submit" loading={isSubmitting} className="w-full">
            {isSubmitting ? 'Creating account...' : 'Sign Up'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
            Log in
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
          Want to list properties?{' '}
          <Link
            to={workspace ? `/agencies/${workspace}/apply` : '/agencies'}
            className="font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            Register as Agent User
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
