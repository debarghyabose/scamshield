/*
  ScamShield API client — the only way the UI talks to the FastAPI backend.

  - Sends the signed-in user's Supabase access token as a Bearer token.
    The backend verifies it and derives the user id itself; the frontend
    never sends a user_id.
  - Retries once after refreshing the session if the token was rejected.
  - Turns every failure into an ApiError with a user-facing message.

  Base URL: VITE_API_BASE_URL (e.g. https://api.example.com). When empty,
  requests go to the same origin under /api, which the Vite dev server
  proxies to http://localhost:8000 (see vite.config.js).
*/
import { auth } from './firebase'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'ERROR' } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export const SESSION_EXPIRED_EVENT = 'scamshield:session-expired'

const MESSAGES = {
  offline: 'Network connection unavailable.',
  unreachable: 'Can’t reach the ScamShield server. Check your connection and try again.',
  timeout: 'The request timed out. Please try again.',
  expired: 'Session expired. Please sign in again.',
  auth: 'Authentication failed.',
}

async function currentToken() {
  const user = auth.currentUser
  if (!user) return null
  try {
    return await user.getIdToken()
  } catch {
    return null
  }
}

async function refreshedToken() {
  const user = auth.currentUser
  if (!user) return null
  try {
    return await user.getIdToken(true)
  } catch {
    return null
  }
}

async function send(path, { method, body, token, timeoutMs, signal }) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort('timeout'), timeoutMs)
  const onAbort = () => controller.abort('cancelled')
  signal?.addEventListener('abort', onAbort)
  try {
    const headers = {}
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    if (token) headers.Authorization = `Bearer ${token}`
    return await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      credentials: 'omit',
    })
  } catch (err) {
    if (controller.signal.aborted) {
      if (controller.signal.reason === 'cancelled') throw new ApiError('Request cancelled.', { code: 'CANCELLED' })
      throw new ApiError(MESSAGES.timeout, { code: 'TIMEOUT' })
    }
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false
    throw new ApiError(offline ? MESSAGES.offline : MESSAGES.unreachable, { code: offline ? 'OFFLINE' : 'NETWORK', cause: err })
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}

/**
 * @param {string} path
 * @param {{ method?: string, body?: any, auth?: 'none'|'optional'|'required', timeoutMs?: number,
 *           fallbackMessage?: string, signal?: AbortSignal }} options
 */
export async function request(path, { method = 'GET', body, auth = 'optional', timeoutMs = 15000, fallbackMessage, signal } = {}) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new ApiError(MESSAGES.offline, { code: 'OFFLINE' })
  }
  let token = auth === 'none' ? null : await currentToken()
  if (auth === 'required' && !token) {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
    throw new ApiError(MESSAGES.expired, { status: 401, code: 'SESSION_EXPIRED' })
  }

  let res = await send(path, { method, body, token, timeoutMs, signal })
  if (res.status === 401 && token) {
    token = await refreshedToken()
    if (token) res = await send(path, { method, body, token, timeoutMs, signal })
  }

  if (res.status === 204) return null
  const data = await res.json().catch(() => null)
  if (res.ok) return data

  const detail = typeof data?.detail === 'string' ? data.detail : null
  if (res.status === 401) {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
    throw new ApiError(detail || MESSAGES.expired, { status: 401, code: 'SESSION_EXPIRED' })
  }
  if (res.status === 403) throw new ApiError(detail || MESSAGES.auth, { status: 403, code: 'FORBIDDEN' })
  if (res.status === 404) throw new ApiError(detail || 'Not found.', { status: 404, code: 'NOT_FOUND' })
  if (res.status === 422 || res.status === 400) throw new ApiError(detail || fallbackMessage || 'Please check your input.', { status: res.status, code: 'VALIDATION' })
  if (res.status === 429) throw new ApiError(detail || 'Too many requests. Please wait a moment.', { status: 429, code: 'RATE_LIMITED' })
  throw new ApiError(fallbackMessage || detail || 'Something went wrong. Please try again.', { status: res.status, code: 'SERVER' })
}

const qs = (params) => {
  const s = new URLSearchParams()
  Object.entries(params || {}).forEach(([k, v]) => v !== undefined && v !== null && v !== '' && s.set(k, String(v)))
  const str = s.toString()
  return str ? `?${str}` : ''
}

export const api = {
  health: () => request('/api/health', { auth: 'none', timeoutMs: 5000 }),

  // Scans work signed-out too; when signed in the result is saved to history.
  scanMessage: ({ text, save = true }) =>
    request('/api/scan/message', { method: 'POST', body: { text, save }, fallbackMessage: 'Unable to analyze this message.' }),
  scanUrl: ({ url, save = true }) =>
    request('/api/scan/url', { method: 'POST', body: { url, save }, fallbackMessage: 'Unable to analyze this link.' }),
  scanTransaction: ({ save = true, ...payload }) =>
    request('/api/scan/transaction', { method: 'POST', body: { ...payload, save }, fallbackMessage: 'Unable to analyze this payment.' }),

  // Private history (requires sign-in)
  listScans: (params, opts) => request(`/api/scans${qs(params)}`, { auth: 'required', fallbackMessage: 'Unable to load your scan history.', ...opts }),
  getScan: (id, opts) => request(`/api/scans/${encodeURIComponent(id)}`, { auth: 'required', fallbackMessage: 'Unable to load this scan.', ...opts }),
  deleteScan: (id) => request(`/api/scans/${encodeURIComponent(id)}`, { method: 'DELETE', auth: 'required', fallbackMessage: 'Unable to delete this scan.' }),
  getStats: (opts) =>
    request(`/api/scans/stats${qs({ tz_offset_minutes: new Date().getTimezoneOffset() })}`, {
      auth: 'required',
      fallbackMessage: 'Unable to load your dashboard.',
      ...opts,
    }),

  // Profile
  getProfile: (opts) => request('/api/profile', { auth: 'required', fallbackMessage: 'Unable to load your profile.', ...opts }),
  updateProfile: (fields) => request('/api/profile', { method: 'PUT', body: fields, auth: 'required', fallbackMessage: 'Unable to save your profile.' }),

  // Reports
  submitReport: (report) =>
    request('/api/report', { method: 'POST', body: report, auth: 'required', fallbackMessage: 'Unable to submit your report.' }),
  listReports: (opts) => request('/api/reports?limit=5', { auth: 'required', fallbackMessage: 'Unable to load your reports.', ...opts }),
}
