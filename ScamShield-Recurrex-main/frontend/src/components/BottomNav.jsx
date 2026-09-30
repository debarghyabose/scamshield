import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BOTTOM_NAV } from '../routes'

/**
 * Mobile / tablet bottom navigation (hidden on desktop, where the sidebar is used).
 * 64px tall targets, respects the iPhone home-indicator safe area.
 */
export default function BottomNav() {
  const { pathname } = useLocation()
  return (
    <nav
      aria-label="Primary"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-ink-200 bg-surface/92 backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-4">
        {BOTTOM_NAV.map((item) => {
          const active = item.match(pathname)
          const Icon = item.icon
          const isScan = item.label === 'Scan'
          return (
            <li key={item.label}>
              <Link
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={`relative flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                  active ? 'text-ink-900' : 'text-ink-500 active:text-ink-800'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="bottom-nav-pill"
                    className="absolute top-1.5 h-8 w-14 rounded-full bg-ink-100"
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                  />
                )}
                <span
                  className={`relative flex h-8 w-14 items-center justify-center ${isScan && !active ? 'text-brand-600' : ''}`}
                >
                  <Icon size={21} strokeWidth={active ? 2.1 : 1.8} aria-hidden="true" />
                </span>
                <span className="relative">{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
