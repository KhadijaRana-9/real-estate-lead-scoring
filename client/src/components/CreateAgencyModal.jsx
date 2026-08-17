import { useForm } from 'react-hook-form'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { FiX } from 'react-icons/fi'
import * as api from '../api/endpoints'
import Input from './ui/Input'
import Button from './ui/Button'
import { EASE } from '../motion/variants'

const PLANS = ['trial', 'starter', 'professional', 'enterprise']

export default function CreateAgencyModal({ onClose, onCreated }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { subscriptionPlan: 'starter' } })

  const onSubmit = async (values) => {
    try {
      await api.createPlatformAgency(values)
      toast.success('Agency created')
      onCreated()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create agency')
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 8 }}
          transition={{ duration: 0.2, ease: EASE }}
          className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Create Agency</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <FiX size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              placeholder="Company Name"
              error={errors.companyName?.message}
              {...register('companyName', { required: 'Company name is required' })}
            />

            <Input
              placeholder="workspace-slug"
              error={errors.slug?.message}
              {...register('slug', { required: 'Slug is required', pattern: { value: /^[a-z0-9-]+$/, message: 'Lowercase letters, numbers, and hyphens only' } })}
            />

            <Input
              type="email"
              placeholder="Contact Email"
              error={errors.contactEmail?.message}
              {...register('contactEmail', { required: 'Contact email is required' })}
            />

            <Input as="select" className="capitalize" {...register('subscriptionPlan')}>
              {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
            </Input>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" onClick={onClose} variant="outline">Cancel</Button>
              <Button type="submit" loading={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Agency'}
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
