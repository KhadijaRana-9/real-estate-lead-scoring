import api from './axios'

// workspace resolves the tenant on this single-domain deployment (see
// resolveTenant.js's resolution order) - without it, every login/signup
// silently falls back to DEFAULT_AGENCY_SLUG, so a newly-registered
// agency's own users could never actually log into their own workspace.
export const signup = (data, workspace) => api.post('/auth/signup', data, { params: workspace ? { workspace } : undefined })
export const login = (data, workspace) => api.post('/auth/login', data, { params: workspace ? { workspace } : undefined })
export const logout = (data) => api.post('/auth/logout', data)

// FormData (multipart) - text fields + up to 6 named files in one
// request, see server/src/features/agencyRegistration.
export const registerAgency = (formData) => api.post('/agency-registrations', formData)
export const getRegistrationStatus = (agencyId) => api.get(`/agency-registrations/${agencyId}/status`)

export const getProperties = (params) => api.get('/properties', { params })
export const getMyProperties = () => api.get('/properties/mine')
export const getProperty = (id, workspace) => api.get(`/properties/${id}`, { params: workspace ? { workspace } : undefined })
export const createProperty = (data) => api.post('/properties', data)
export const createDraftProperty = (data) => api.post('/properties/drafts', data)
export const updateProperty = (id, data) => api.put(`/properties/${id}`, data)
export const publishProperty = (id) => api.patch(`/properties/${id}/publish`)
export const deleteProperty = (id) => api.delete(`/properties/${id}`)
export const estimatePrice = (data) => api.post('/properties/estimate-price', data)
export const compareProperties = (ids) => api.get('/properties/compare', { params: { ids: ids.join(',') } })
export const getRecommendedProperties = (id, workspace) => api.get(`/properties/${id}/recommendations`, { params: workspace ? { workspace } : undefined })

export const getFavoriteProperties = () => api.get('/properties/favorites/mine')
export const addFavoriteProperty = (id) => api.post(`/properties/${id}/favorite`)
export const removeFavoriteProperty = (id) => api.delete(`/properties/${id}/favorite`)

// Property ratings & reviews - mirrors the agency review endpoints above.
export const getPropertyReviews = (id, params) => api.get(`/properties/${id}/reviews`, { params })
export const submitPropertyReview = (id, data) => api.post(`/properties/${id}/reviews`, data)
export const deletePropertyReview = (id) => api.delete(`/properties/${id}/reviews`)
export const getTopRatedProperties = (params) => api.get('/properties/top-rated', { params })

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

export const createInquiry = (data, workspace) => api.post('/inquiries', data, { params: workspace ? { workspace } : undefined })
export const getInquiries = () => api.get('/inquiries')

export const getDashboardSummary = () => api.get('/dashboard/summary')
export const getPublicStats = () => api.get('/dashboard/public-stats')

export const getAiConversations = () => api.get('/ai/conversations')
export const getAiConversation = (id) => api.get(`/ai/conversations/${id}`)
export const updateAiConversation = (id, data) => api.patch(`/ai/conversations/${id}`, data)
export const deleteAiConversation = (id) => api.delete(`/ai/conversations/${id}`)

export const getSubscription = () => api.get('/billing/subscription')
export const requestUpgrade = (data) => api.post('/billing/upgrade', data)

export const platformLogin = (data) => api.post('/platform/login', data)
export const getPlatformAgencies = (params) => api.get('/platform/agencies', { params })
export const createPlatformAgency = (data) => api.post('/platform/agencies', data)
export const suspendAgency = (id) => api.patch(`/platform/agencies/${id}/suspend`)
export const reactivateAgency = (id) => api.patch(`/platform/agencies/${id}/reactivate`)
export const approveAgency = (id) => api.patch(`/platform/agencies/${id}/approve`)
export const rejectAgency = (id, reason) => api.patch(`/platform/agencies/${id}/reject`, { reason })
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
export const getAgencyBranding = () => api.get('/agency/branding')
export const updateAgencyBranding = (data) => api.patch('/agency/branding', data)

// Agency -> agent invite flow (agency_admin invites a specific email).
export const inviteAgent = (data) => api.post('/agency/invites', data)
export const getAgencyInvites = () => api.get('/agency/invites')
export const revokeAgentInvite = (id) => api.delete(`/agency/invites/${id}`)
// Public - consumed from the emailed link, no session yet.
export const acceptAgentInvite = (data) => api.post('/agency/invites/accept', data)

// Agent -> agency apply flow (agent proactively applies, agency reviews).
// Public - the applicant has no session yet.
export const applyToAgency = (data) => api.post('/agency/applications', data)
export const getAgencyApplications = (status) => api.get('/agency/applications', { params: status ? { status } : undefined })
export const approveAgencyApplication = (id) => api.post(`/agency/applications/${id}/approve`)
export const rejectAgencyApplication = (id, reason) => api.post(`/agency/applications/${id}/reject`, { reason })

export const getTeamMembers = () => api.get('/agency/team')
export const removeTeamMember = (id) => api.delete(`/agency/team/${id}`)

// Market Insights - real, live aggregations over actual listing data
// (see server/src/features/market). No workspace param - cross-tenant,
// like the rest of the public marketplace surface.
export const getMarketPriceTrend = (params) => api.get('/market/price-trend', { params })
export const getMarketCityInsight = (city) => api.get(`/market/city/${encodeURIComponent(city)}`)
