import api from './axios'

export const signup = (data) => api.post('/auth/signup', data)
export const login = (data) => api.post('/auth/login', data)

export const getProperties = (params) => api.get('/properties', { params })
export const getMyProperties = () => api.get('/properties/mine')
export const getProperty = (id) => api.get(`/properties/${id}`)
export const createProperty = (data) => api.post('/properties', data)
export const updateProperty = (id, data) => api.put(`/properties/${id}`, data)
export const deleteProperty = (id) => api.delete(`/properties/${id}`)
export const estimatePrice = (data) => api.post('/properties/estimate-price', data)

export const createInquiry = (data) => api.post('/inquiries', data)
export const getInquiries = () => api.get('/inquiries')

export const getDashboardSummary = () => api.get('/dashboard/summary')
export const getPublicStats = () => api.get('/dashboard/public-stats')
