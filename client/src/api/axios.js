import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({ baseURL })

export function getAccessToken() {
  return localStorage.getItem('accessToken')
}

export function getRefreshToken() {
  return localStorage.getItem('refreshToken')
}

export function setSession(accessToken, refreshToken) {
  localStorage.setItem('accessToken', accessToken)
  localStorage.setItem('refreshToken', refreshToken)
}

export function clearSession() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
}

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Multiple requests can 401 at once when the access token expires; share
// a single in-flight refresh call instead of firing one per request.
let refreshPromise = null

function performRefresh() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return Promise.reject(new Error('No refresh token available'))

  return axios
    .post(`${baseURL}/auth/refresh`, { refreshToken })
    .then(({ data }) => {
      setSession(data.accessToken, data.refreshToken)
      return data.accessToken
    })
}

// Exposed so non-axios callers (e.g. the hand-rolled SSE fetch() in
// aiStream.js, which can't go through these interceptors) can share the
// exact same in-flight refresh instead of duplicating the refresh dance.
export function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config: originalRequest, response } = error
    const isAuthEndpoint = originalRequest?.url?.startsWith('/auth/')

    if (response?.status === 401 && originalRequest && !originalRequest._retried && !isAuthEndpoint) {
      originalRequest._retried = true
      try {
        if (!refreshPromise) {
          refreshPromise = performRefresh().finally(() => {
            refreshPromise = null
          })
        }
        const newAccessToken = await refreshPromise
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return api(originalRequest)
      } catch {
        clearSession()
        window.location.href = '/login'
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }
)

export default api
