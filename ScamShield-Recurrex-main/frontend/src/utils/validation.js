/*
  Client-side input validation for instant feedback.
  The backend validates everything again — this is only for UX.
*/

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_RE = /^\+?[\d\s()-]{8,16}$/

export const PASSWORD_MIN = 8

export function validateEmail(value) {
  const v = value.trim()
  if (!v) return 'Enter your email address.'
  if (v.length > 254 || !EMAIL_RE.test(v)) return 'Invalid email address.'
  return ''
}

export function validatePassword(value, { forSignup = false } = {}) {
  if (!value) return 'Enter your password.'
  if (!forSignup) return ''
  if (value.length < PASSWORD_MIN) return `Password too short — use at least ${PASSWORD_MIN} characters.`
  if (value.length > 72) return 'Password is too long (maximum 72 characters).'
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return 'Use at least one letter and one number.'
  return ''
}

/** 0–4 rough strength meter for the signup form (not a security guarantee). */
export function passwordStrength(value) {
  if (!value) return 0
  let s = 0
  if (value.length >= PASSWORD_MIN) s++
  if (value.length >= 12) s++
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) s++
  if (/\d/.test(value) && /[^A-Za-z0-9]/.test(value)) s++
  return s
}

export function isPhone(value) {
  return PHONE_RE.test(value.trim())
}

/** Checks that input looks like an http(s) URL without ever fetching it. */
export function parseUrl(input) {
  const raw = input.trim()
  if (!raw) return { ok: false, error: 'Enter a URL to check.' }
  if (/\s/.test(raw)) return { ok: false, error: 'URLs can’t contain spaces.' }
  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw)
  if (hasScheme && !/^https?:\/\//i.test(raw)) {
    return { ok: false, error: 'Only http:// and https:// links can be checked.' }
  }
  try {
    const url = new URL(hasScheme ? raw : `http://${raw}`)
    const host = url.hostname.toLowerCase()
    const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host)
    if (!isIp && !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) && !host.startsWith('xn--') && !host.includes('.xn--')) {
      return { ok: false, error: 'That doesn’t look like a valid domain (e.g. example.com).' }
    }
    return { ok: true, host }
  } catch {
    return { ok: false, error: 'That doesn’t look like a valid URL.' }
  }
}
