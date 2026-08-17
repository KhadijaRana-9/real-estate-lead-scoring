import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import * as api from '../api/endpoints'
import { fadeUp } from '../motion/variants'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

export default function ApplyToAgency() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [agency, setAgency] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm()

  useEffect(() => {
    api.getAgencyProfile(slug)
      .then(({ data }) => setAgency(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [slug])

  const onSubmit = async (values) => {
    try {
      await api.applyToAgency({
        agencyId: agency._id,
        name: values.name,
        email: values.email,
        password: values.password,
        phone: values.phone || undefined,
        experienceYears: values.experienceYears ? Number(values.experienceYears) : undefined,
        message: values.message || undefined,
      })
      setSubmitted(true)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit application')
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <div className="h-64 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
      </div>
    )
  }

  if (error || !agency) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-bold">Agency not found</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">This agency doesn't exist or is no longer active.</p>
        <Link to="/agencies" className="mt-4 inline-block font-medium text-brand-600 hover:underline dark:text-brand-400">Browse agencies</Link>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md items-center px-4">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="w-full rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <h1 className="text-xl font-bold">Application submitted</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {agency.companyName} will review your application. You'll be able to log in with the email and password you provided once approved.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Button to={`/agencies/${slug}`} variant="outline">Back to agency</Button>
            <Button onClick={() => navigate('/login', { state: undefined })}>Go to login</Button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-10">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="w-full rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand-100 text-sm font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
            {agency.logo ? <img src={agency.logo} alt="" className="h-full w-full object-cover" /> : agency.companyName?.[0]}
          </div>
          <div>
            <h1 className="text-lg font-bold">Apply as an Agent</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Join {agency.companyName}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Full name"
            error={errors.name?.message}
            {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'At least 2 characters' } })}
          />

          <Input label="Email" type="email" error={errors.email?.message} {...register('email', { required: 'Email is required' })} />

          <div>
            <Input
              label="Password"
              type="password"
              error={errors.password?.message}
              {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'At least 8 characters' } })}
            />
            <p className="mt-1 text-xs text-gray-400">You'll use this to log in once your application is approved.</p>
          </div>

          <Input label="Phone (optional)" {...register('phone')} />

          <Input label="Years of experience (optional)" type="number" min="0" max="80" {...register('experienceYears')} />

          <Input
            label="Message to the agency (optional)"
            as="textarea"
            rows={3}
            maxLength={1000}
            placeholder="Tell them a bit about yourself..."
            {...register('message')}
          />

          <Button type="submit" loading={isSubmitting} className="w-full">
            {isSubmitting ? 'Submitting...' : 'Submit Application'}
          </Button>
        </form>
      </motion.div>
    </div>
  )
}
