import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { FiShield } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { fadeUp } from '../../motion/variants'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'

export default function PlatformLogin() {
  const { platformLogin } = useAuth()
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm()

  const onSubmit = async (values) => {
    try {
      await platformLogin(values)
      toast.success('Welcome, Platform Admin')
      navigate('/platform')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed')
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="w-full rounded-2xl border border-gray-200 bg-white p-8 shadow-xl dark:border-gray-800 dark:bg-gray-950"
      >
        <div className="mb-2 flex items-center gap-2">
          <FiShield className="text-indigo-600 dark:text-indigo-400" size={22} />
          <span className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Platform Console</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Super Admin Login</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Restricted to platform operators. Not a tenant login.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <Input label="Email" type="email" error={errors.email?.message} {...register('email', { required: 'Email is required' })} />
          <Input
            label="Password"
            type="password"
            error={errors.password?.message}
            {...register('password', { required: 'Password is required' })}
          />

          <Button type="submit" loading={isSubmitting} className="w-full">
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </motion.div>
    </div>
  )
}
