import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Loader2, OctagonAlert, RotateCcw, X } from 'lucide-react'

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
        <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.02em] text-ink-900 sm:text-[32px]">{title}</h1>
        {description && <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  )
}

export function Container({ children, className = '' }) {
  return <div className={`mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 ${className}`}>{children}</div>
}

const STATUS_STYLE = {
  SAFE: { cls: 'bg-safe-50 text-safe-700 border-safe-100', icon: CheckCircle2, label: 'Safe' },
  SUSPICIOUS: { cls: 'bg-warn-50 text-warn-700 border-warn-100', icon: AlertTriangle, label: 'Suspicious' },
  DANGEROUS: { cls: 'bg-danger-50 text-danger-700 border-danger-100', icon: OctagonAlert, label: 'Dangerous' },
}

export function StatusBadge({ level, size = 'sm' }) {
  const s = STATUS_STYLE[level] || STATUS_STYLE.SAFE
  const Icon = s.icon
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${s.cls} ${
        size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'
      }`}
    >
      <Icon size={size === 'lg' ? 16 : 13} strokeWidth={2} aria-hidden="true" />
      {s.label}
    </span>
  )
}

export function DemoNotice({ children, className = '' }) {
  return (
    <div className={`flex items-start gap-2.5 rounded-lg border border-warn-100 bg-warn-50 px-3.5 py-2.5 text-[13px] leading-relaxed text-warn-700 ${className}`}>
      <span className="mt-[3px] rounded bg-warn-100 px-1.5 py-px font-mono text-[10px] font-medium tracking-wide">DEMO</span>
      <span>{children}</span>
    </div>
  )
}

export function SegmentedControl({ options, value, onChange, label, size = 'md', wrap = false }) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`max-w-full rounded-lg border border-ink-200 bg-ink-50 p-0.5 ${wrap ? 'flex flex-wrap justify-center sm:inline-flex' : 'inline-flex overflow-x-auto'}`}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`relative rounded-md font-medium whitespace-nowrap transition-colors ${
              size === 'sm' ? 'min-h-9 px-2.5 py-1 text-xs sm:min-h-0' : 'min-h-10 px-3 py-1.5 text-[13px] sm:min-h-0'
            } ${active ? 'text-ink-900' : 'text-ink-500 hover:text-ink-800'}`}
          >
            {active && (
              <motion.span
                layoutId={`seg-${label}`}
                className="absolute inset-0 rounded-md border border-ink-200 bg-surface shadow-sm"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {o.dot && <span className={`h-1.5 w-1.5 rounded-full ${o.dot}`} />}
              {o.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function Modal({ open, onClose, title, children, labelledBy = 'modal-title' }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className="relative max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-surface sm:rounded-2xl"
            style={{ boxShadow: 'var(--shadow-pop)' }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-150 bg-surface px-5 py-4">
              <h2 id={labelledBy} className="text-base font-semibold">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                autoFocus
                className="flex h-9 w-9 items-center justify-center rounded-md text-ink-500 hover:bg-ink-100 hover:text-ink-900"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="rounded-xl border border-dashed border-ink-300 bg-ink-50/50 px-6 py-10 text-center">
      {Icon && (
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg border border-ink-200 bg-surface text-ink-500">
          <Icon size={18} strokeWidth={1.75} />
        </span>
      )}
      <p className="mt-3 text-sm font-medium text-ink-800">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-ink-500">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({ title = 'Scan couldn’t be completed', message, onRetry, action }) {
  const text = typeof message === 'string' ? message : message?.message || 'Something went wrong.'
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      role="alert"
      className="flex flex-col gap-4 rounded-xl border border-danger-100 bg-danger-50 p-5 sm:flex-row sm:items-center"
    >
      <OctagonAlert size={22} className="shrink-0 text-danger-600" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-danger-700">{title}</p>
        <p className="mt-0.5 text-[13px] text-danger-700/90">{text}</p>
      </div>
      {action}
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn btn-secondary">
          <RotateCcw size={15} /> Try again
        </button>
      )}
    </motion.div>
  )
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-ink-100 ${className}`} aria-hidden="true" />
}

export function Spinner({ size = 16, className = '' }) {
  return <Loader2 size={size} className={`animate-spin ${className}`} aria-hidden="true" />
}

/** Full-area loading placeholder used while lazy pages or the session load. */
export function PageLoader({ label = 'Loading' }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-live="polite">
      <span className="flex items-center gap-2 text-sm text-ink-500">
        <Spinner /> {label}…
      </span>
    </div>
  )
}
