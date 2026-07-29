import api from './axios'

export const signup = (data) => api.post('/auth/signup', data)
export const login = (data) => api.post('/auth/login', data)
export const logout = (data) => api.post('/auth/logout', data)

export const getProperties = (params) => api.get('/properties', { params })
export const getMyProperties = () => api.get('/properties/mine')
export const getProperty = (id) => api.get(`/properties/${id}`)
export const createProperty = (data) => api.post('/properties', data)
export const createDraftProperty = (data) => api.post('/properties/drafts', data)
export const updateProperty = (id, data) => api.put(`/properties/${id}`, data)
export const publishProperty = (id) => api.patch(`/properties/${id}/publish`)
export const deleteProperty = (id) => api.delete(`/properties/${id}`)
export const estimatePrice = (data) => api.post('/properties/estimate-price', data)

export const getUploadAvailability = () => api.get('/uploads/availability')
export const uploadImages = (files, onProgress) => {
  const formData = new FormData()
  files.forEach((file) => formData.append('images', file))
  return api.post('/uploads/images', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress,
  })
}
export const uploadDocuments = (files, onProgress) => {
  const formData = new FormData()
  files.forEach((file) => formData.append('documents', file))
  return api.post('/uploads/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress,
  })
}

export const propertyAssist = (action, property) => api.post('/ai/property-assist', { action, property })

export const createInquiry = (data) => api.post('/inquiries', data)
export const getInquiries = () => api.get('/inquiries')

export const getDashboardSummary = () => api.get('/dashboard/summary')
export const getPublicStats = () => api.get('/dashboard/public-stats')

export const getAiConversations = () => api.get('/ai/conversations')
export const getAiConversation = (id) => api.get(`/ai/conversations/${id}`)
export const updateAiConversation = (id, data) => api.patch(`/ai/conversations/${id}`, data)
export const deleteAiConversation = (id) => api.delete(`/ai/conversations/${id}`)

export const platformLogin = (data) => api.post('/platform/login', data)
export const getPlatformAgencies = (params) => api.get('/platform/agencies', { params })
export const createPlatformAgency = (data) => api.post('/platform/agencies', data)
export const suspendAgency = (id) => api.patch(`/platform/agencies/${id}/suspend`)
export const reactivateAgency = (id) => api.patch(`/platform/agencies/${id}/reactivate`)
export const deletePlatformAgency = (id) => api.delete(`/platform/agencies/${id}`)
export const getPlatformDashboardSummary = () => api.get('/platform/dashboard/summary')
