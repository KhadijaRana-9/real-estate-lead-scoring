import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({ baseURL })

// "Remember me": checked (default) keeps today's exact behavior
// (localStorage, survives closing the browser). Unchecked uses
// sessionStorage instead (cleared when the tab/browser closes) - purely
// a client-side cache-location choice, it changes nothing about the JWT
// access/refresh architecture itself (expiry, rotation, reuse detection
// all happen exactly as before). Reads check both so a session started
// either way keeps working through every existing call site unchanged.
export function getAccessToken() {
  return localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
}

export function getRefreshToken() {
  return localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken')
}

export function setSession(accessToken, refreshToken, remember = true) {
  const store = remember ? localStorage : sessionStorage
  const other = remember ? sessionStorage : localStorage
  store.setItem('accessToken', accessToken)
  store.setItem('refreshToken', refreshToken)
  other.removeItem('accessToken')
  other.removeItem('refreshToken')
}

export function clearSession() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
  sessionStorage.removeItem('accessToken')
  sessionStorage.removeItem('refreshToken')
  sessionStorage.removeItem('user')
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
  // Preserve whichever storage the session is already using - a refresh
  // must never silently move a "remember me off" session into
  // localStorage (or vice versa).
  const remember = Boolean(localStorage.getItem('refreshToken'))

  return axios
    .post(`${baseURL}/auth/refresh`, { refreshToken })
    .then(({ data }) => {
      setSession(data.accessToken, data.refreshToken, remember)
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
    // /platform/login is a pre-session endpoint exactly like /auth/login -
    // it must never be caught by the refresh-then-redirect flow below.
    // Without this, an unrelated 401 from a stale token in another tab
    // (or a leftover session) while sitting on /platform/login triggers a
    // failed refresh attempt and hard-redirects to /login, hijacking the
    // Super Admin login away before it can even complete.
    const isAuthEndpoint = originalRequest?.url?.startsWith('/auth/') || originalRequest?.url === '/platform/login'

    // resolveTenant.js's trial-expiry gate - every feature route 402s
    // once trialEndsAt passes, except /billing and /auth (still allowed,
    // so this same request already reached the backend and got a real
    // answer for those). Redirect straight to checkout selection rather
    // than surfacing a generic error toast, since there is no other way
    // to un-block a trial-expired agency.
    if (response?.status === 402 && window.location.pathname !== '/trial-expired') {
      window.location.href = '/trial-expired'
      return Promise.reject(error)
    }

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
        // A Super Admin's expired session must re-authenticate at the
        // platform console's own login, not the tenant one - they have no
        // agencyId and the regular /login form can't authenticate them.
        const isPlatformArea = window.location.pathname.startsWith('/platform')
        window.location.href = isPlatformArea ? '/platform/login' : '/login'
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }
)

export default api
