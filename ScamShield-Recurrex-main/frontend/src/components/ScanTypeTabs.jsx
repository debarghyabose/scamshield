import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CreditCard, Link2, MessageSquareText } from 'lucide-react'

const TABS = [
  { to: '/scan/message', label: 'Message', icon: MessageSquareText },
  { to: '/scan/url', label: 'URL', icon: Link2 },
  { to: '/scan/payment', label: 'Payment', icon: CreditCard },
]

/** Switch between the three scanners. Full-width, thumb-friendly on phones. */
export default function ScanTypeTabs() {
  return (
    <nav aria-label="Scan type" className="grid grid-cols-3 gap-1 rounded-xl border border-ink-200 bg-ink-50 p-1 sm:inline-grid sm:w-auto">
      {TABS.map((t) => {
        const Icon = t.icon
        return (
          <NavLink
            key={t.to}
            to={t.to}
            replace
            className={({ isActive }) =>
              `relative flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors ${
                isActive ? 'text-ink-900' : 'text-ink-500 hover:text-ink-800'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="scan-type-tab"
                    className="absolute inset-0 rounded-lg border border-ink-200 bg-surface shadow-sm"
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                  />
                )}
                <Icon size={16} strokeWidth={1.9} className="relative" aria-hidden="true" />
                <span className="relative">{t.label}</span>
              </>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}
