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
export const compareProperties = (ids) => api.get('/properties/compare', { params: { ids: ids.join(',') } })
export const getRecommendedProperties = (id) => api.get(`/properties/${id}/recommendations`)

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
export const uploadVideos = (files, onProgress) => {
  const formData = new FormData()
  files.forEach((file) => formData.append('videos', file))
  return api.post('/uploads/videos', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress,
  })
}

// Categorized property media (Media Manager) - see property.model.js
// MEDIA_CATEGORIES for the 19 room categories.
export const addMediaImages = (propertyId, category, items) => api.post(`/properties/${propertyId}/media/images`, { category, items })
export const addMediaVideos = (propertyId, category, items) => api.post(`/properties/${propertyId}/media/videos`, { category, items })
export const updateMediaImage = (propertyId, mediaId, data) => api.patch(`/properties/${propertyId}/media/images/${mediaId}`, data)
export const updateMediaVideo = (propertyId, mediaId, data) => api.patch(`/properties/${propertyId}/media/videos/${mediaId}`, data)
export const deleteMediaImage = (propertyId, mediaId) => api.delete(`/properties/${propertyId}/media/images/${mediaId}`)
export const deleteMediaVideo = (propertyId, mediaId) => api.delete(`/properties/${propertyId}/media/videos/${mediaId}`)
export const reorderMediaImages = (propertyId, category, orderedIds) => api.patch(`/properties/${propertyId}/media/images/reorder`, { category, orderedIds })
export const reorderMediaVideos = (propertyId, category, orderedIds) => api.patch(`/properties/${propertyId}/media/videos/reorder`, { category, orderedIds })
export const setCoverImage = (propertyId, mediaId) => api.patch(`/properties/${propertyId}/media/images/${mediaId}/cover`)

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
export const setAgencyVerified = (id, verified) => api.patch(`/platform/agencies/${id}/verified`, { verified })
export const setAgencyFeatured = (id, featured) => api.patch(`/platform/agencies/${id}/featured`, { featured })

// Public marketplace - cross-tenant, no workspace param, works for
// anonymous visitors exactly like the rest of the public site.
export const getAgencyDirectory = (params) => api.get('/agencies', { params })
export const getAgencyHomepageSections = () => api.get('/agencies/sections')
export const getAgencyPlatformStats = () => api.get('/agencies/platform-stats')
export const getAgencyAutocomplete = (q) => api.get('/agencies/autocomplete', { params: { q } })
export const compareAgencies = (slugs) => api.get('/agencies/compare', { params: { slugs: slugs.join(',') } })
export const getAgencyProfile = (slug) => api.get(`/agencies/${slug}`)
export const getAgencyReviews = (slug, params) => api.get(`/agencies/${slug}/reviews`, { params })
export const submitAgencyReview = (slug, data) => api.post(`/agencies/${slug}/reviews`, data)
export const deleteAgencyReview = (slug) => api.delete(`/agencies/${slug}/reviews`)
export const toggleReviewHelpful = (reviewId) => api.post(`/agencies/reviews/${reviewId}/helpful`)
export const replyToReview = (reviewId, text) => api.post(`/agencies/reviews/${reviewId}/reply`, { text })
export const followAgency = (slug) => api.post(`/agencies/${slug}/follow`)
export const unfollowAgency = (slug) => api.delete(`/agencies/${slug}/follow`)

export const getAgencyProfileSettings = () => api.get('/agency/profile')
export const updateAgencyProfileSettings = (data) => api.patch('/agency/profile', data)
