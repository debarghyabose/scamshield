// Status colours are reserved for risk levels and always paired with a label.
export const LEVEL_COLORS = {
  SAFE: '#0f9f6e',
  SUSPICIOUS: '#d98b06',
  DANGEROUS: '#d92d3a',
}
export const LEVEL_ORDER = ['SAFE', 'SUSPICIOUS', 'DANGEROUS']
export const LEVEL_LABELS = { SAFE: 'Safe', SUSPICIOUS: 'Suspicious', DANGEROUS: 'Dangerous' }
export const GRID = 'var(--color-ink-150)'
export const AXIS_TEXT = 'var(--color-ink-500)'

/** Path for a bar with only its top corners rounded. */
export function topRoundedRect(x, y, w, h, r = 4) {
  if (h <= 0) return ''
  const rr = Math.min(r, w / 2, h)
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`
}

export function niceMax(v) {
  if (v <= 5) return 5
  const step = Math.pow(10, Math.floor(Math.log10(v)))
  const n = v / step
  const nice = n <= 2 ? 2 : n <= 5 ? 5 : 10
  return nice * step
}
