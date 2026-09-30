import { useEffect, useRef } from 'react'
import Shield3D from './Shield3D'

const STATUS_LINE = {
  idle: { dot: 'bg-brand-500', text: 'Ready to scan' },
  scanning: { dot: 'bg-cyan-accent animate-pulse', text: 'Scanning…' },
  safe: { dot: 'bg-safe-500', text: 'Safe — no major signals' },
  suspicious: { dot: 'bg-warn-500', text: 'Suspicious — verify first' },
  dangerous: { dot: 'bg-danger-500', text: 'Dangerous — do not engage' },
}

/**
 * Scanner page layout.
 * Desktop: form + result on the left, sticky live shield on the right.
 * Mobile: everything stacked vertically, with the shield above the form.
 */
export default function ScannerLayout({ status, children, aside }) {
  const line = STATUS_LINE[status]
  const asideRef = useRef(null)
  const prev = useRef(status)

  // Phones/tablets: when a scan starts, bring the shield (above the form) into view
  // so the scanning animation is visible.
  useEffect(() => {
    if (status === 'scanning' && prev.current !== 'scanning' && window.innerWidth < 1024 && asideRef.current) {
      const top = asideRef.current.getBoundingClientRect().top + window.scrollY - 72
      if (top < window.scrollY) {
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' })
      }
    }
    prev.current = status
  }, [status])
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
      <div className="order-2 min-w-0 space-y-6 lg:order-1">{children}</div>
      <aside ref={asideRef} className="order-1 lg:order-2">
        <div className="card overflow-hidden lg:sticky lg:top-24">
          <div className="bg-grid relative h-[210px] bg-ink-50/60 sm:h-[280px] lg:h-[340px]">
            <Shield3D status={status} compact />
          </div>
          <div className="flex items-center gap-2 border-t border-ink-150 px-4 py-3 text-sm">
            <span className={`h-2 w-2 rounded-full ${line.dot}`} />
            <span className="font-medium text-ink-800">{line.text}</span>
          </div>
          {aside && <div className="hidden border-t border-ink-150 px-4 py-4 lg:block">{aside}</div>}
        </div>
      </aside>
    </div>
  )
}

export function CheckList({ title = 'What this scan checks', items }) {
  return (
    <div>
      <h3 className="eyebrow">{title}</h3>
      <ul className="mt-2.5 space-y-1.5">
        {items.map((i) => (
          <li key={i} className="flex gap-2 text-[13px] leading-snug text-ink-600">
            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink-400" />
            {i}
          </li>
        ))}
      </ul>
    </div>
  )
}
