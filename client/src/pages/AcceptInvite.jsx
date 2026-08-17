import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { fadeUp } from '../motion/variants'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

export default function AcceptInvite() {
  const { acceptInvite } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [failed, setFailed] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm()

  const onSubmit = async (values) => {
    try {
      await acceptInvite({ token, name: values.name, password: values.password })
      toast.success('Welcome to the team!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not accept this invite')
      setFailed(true)
    }
  }

  if (!token) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="w-full rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <h1 className="text-xl font-bold">Invalid invite link</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">This link is missing its invite token. Ask the agency to resend your invitation.</p>
          <Link to="/login" className="mt-4 inline-block font-medium text-brand-600 hover:underline dark:text-brand-400">Go to login</Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="w-full rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900"
      >
        <h1 className="text-2xl font-bold">Accept your invitation</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Set your name and password to join the team.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <Input
            label="Full name"
            error={errors.name?.message}
            {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'At least 2 characters' } })}
          />

          <Input
            label="Password"
            type="password"
            error={errors.password?.message}
            {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'At least 8 characters' } })}
          />

          <Button type="submit" loading={isSubmitting} className="w-full">
            {isSubmitting ? 'Joining...' : 'Accept & Join'}
          </Button>
        </form>

        {failed && (
          <p className="mt-4 text-center text-xs text-gray-400">
            This link may have expired or already been used. Ask the agency admin to send a new invite.
          </p>
        )}
      </motion.div>
    </div>
  )
}
