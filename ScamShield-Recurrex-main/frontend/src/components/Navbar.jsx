import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, Menu } from 'lucide-react'
import { useAppState } from '../context/AppState'
import { pageTitle } from '../routes'
import { timeAgo } from '../utils/format'
import { displayName, useAuth } from '../context/AuthContext'
import Avatar from './Avatar'
import { LogoMark } from './Logo'

function Notifications() {
  const { notifications, markAllRead } = useAppState()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const unread = notifications.filter((n) => n.unread).length

  useEffect(() => {
    if (!open) return
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-11 w-11 items-center justify-center rounded-lg text-ink-600 hover:bg-ink-100 hover:text-ink-900"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell size={19} strokeWidth={1.75} />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 font-mono text-[10px] leading-none font-medium text-white ring-2 ring-surface">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Notifications"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="fixed right-2 left-2 z-40 mt-2 sm:absolute sm:right-0 sm:left-auto sm:w-[360px] origin-top-right overflow-hidden rounded-xl border border-ink-200 bg-surface"
            style={{ boxShadow: 'var(--shadow-pop)' }}
          >
            <div className="flex items-center justify-between border-b border-ink-150 px-4 py-3">
              <span className="text-sm font-semibold">Notifications</span>
              <button type="button" onClick={markAllRead} disabled={!unread} className="text-xs font-medium text-brand-600 hover:text-brand-800 disabled:text-ink-400">
                Mark all as read
              </button>
            </div>
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-[13px] leading-relaxed text-ink-500">
                No notifications yet. Results of scans you run appear here during this session.
              </p>
            ) : (
              <ul className="max-h-[360px] overflow-y-auto">
                {notifications.slice(0, 12).map((n) => {
                  const inner = (
                    <>
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.unread ? 'bg-brand-500' : 'bg-transparent'}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink-900">{n.title}</p>
                        <p className="mt-0.5 text-[13px] leading-snug text-ink-600">{n.body}</p>
                        <p className="mt-1 font-mono text-[11px] text-ink-400">{timeAgo(n.created_at)}</p>
                      </div>
                    </>
                  )
                  return (
                    <li key={n.id} className="border-b border-ink-100 last:border-0">
                      {n.href ? (
                        <Link to={n.href} onClick={() => setOpen(false)} className="flex gap-3 px-4 py-3 hover:bg-ink-50">
                          {inner}
                        </Link>
                      ) : (
                        <div className="flex gap-3 px-4 py-3">{inner}</div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Navbar({ onOpenMenu }) {
  const { pathname } = useLocation()
  const [section, title] = pageTitle(pathname)
  const { isAuthenticated, initializing, user, profile } = useAuth()

  return (
    <header className="pt-safe sticky top-0 z-30 border-b border-ink-200 bg-surface/85 backdrop-blur-md">
      <div className="flex h-14 items-center gap-2 px-2 sm:h-16 sm:gap-3 sm:px-6">
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink-700 hover:bg-ink-100 lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={21} strokeWidth={1.75} />
        </button>
        <Link to="/" className="-ml-1 flex h-11 w-9 shrink-0 items-center justify-center rounded-md lg:hidden" aria-label="ScamShield home">
          <LogoMark className="h-7 w-7" />
        </Link>
        <div className="flex min-w-0 items-center gap-2 text-sm">
          {section && <span className="hidden text-ink-500 sm:inline">{section}</span>}
          {section && <span className="hidden text-ink-300 sm:inline">/</span>}
          <span className="truncate text-[15px] font-medium text-ink-900 sm:text-sm">{title}</span>
        </div>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Notifications />
          {!initializing && !isAuthenticated && (
            <Link to="/login" className="btn btn-primary h-10 min-h-10 px-3.5">
              Sign in
            </Link>
          )}
          {isAuthenticated && (
            <Link to="/profile" className="flex h-11 w-11 items-center justify-center rounded-full lg:hidden" aria-label="Your profile">
              <Avatar src={profile?.avatar_url} name={displayName(profile, user)} email={user?.email} />
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
