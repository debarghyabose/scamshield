export const LEVELS = {
  SAFE: { label: 'Safe', tone: 'safe' },
  SUSPICIOUS: { label: 'Suspicious', tone: 'warn' },
  DANGEROUS: { label: 'Dangerous', tone: 'danger' },
}

export const LEVEL_TO_SHIELD = { SAFE: 'safe', SUSPICIOUS: 'suspicious', DANGEROUS: 'dangerous' }

export function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 45) return 'just now'
  if (diff < 3600) return `${Math.round(diff / 60)} min ago`
  if (diff < 86400) return `${Math.round(diff / 3600)} h ago`
  const days = Math.round(diff / 86400)
  return days === 1 ? 'yesterday' : `${days} days ago`
}

export function formatDateTime(iso) {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function truncate(s, n = 80) {
  if (!s) return ''
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function formatShortDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function initials(name, email) {
  const src = (name || email || '?').trim()
  const parts = src.split(/[\s@._-]+/).filter(Boolean)
  return ((parts[0]?.[0] || '?') + (parts.length > 1 ? parts[1][0] : '')).toUpperCase()
}

/**
 * Scrolls a freshly rendered result into view. On phones/tablets we pause
 * briefly first so the shield's result animation (above the form) is seen.
 */
export function revealResult(ref) {
  const small = window.innerWidth < 1024
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  setTimeout(() => ref.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }), small ? 700 : 0)
}
