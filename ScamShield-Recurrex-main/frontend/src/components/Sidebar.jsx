import { useEffect } from 'react'
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { LogIn, LogOut, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import Logo from './Logo'
import Avatar from './Avatar'
import { NAV_GROUPS } from '../routes'
import { displayName, useAuth } from '../context/AuthContext'

function NavItem({ item, collapsed, onNavigate, mobile }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      onClick={onNavigate}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded-lg px-3 text-sm transition-colors duration-150 ${mobile ? 'h-11' : 'h-10'} ${
          isActive ? 'bg-ink-100 font-medium text-ink-900' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
        } ${collapsed ? 'justify-center px-0' : ''}`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId={mobile ? 'nav-indicator-mobile' : 'nav-indicator'}
              className="absolute top-2 bottom-2 left-0 w-[3px] rounded-full bg-brand-600"
              transition={{ type: 'spring', stiffness: 500, damping: 40 }}
            />
          )}
          <Icon size={18} strokeWidth={1.75} className={isActive ? 'text-ink-900' : 'text-ink-500 group-hover:text-ink-800'} />
          {!collapsed && <span>{item.label}</span>}
          {collapsed && (
            <span className="pointer-events-none absolute left-full z-50 ml-3 rounded-md bg-ink-900 px-2 py-1 text-xs whitespace-nowrap text-surface opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              {item.label}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}

function AccountFooter({ collapsed, onNavigate }) {
  const { isAuthenticated, user, profile, signOut, initializing } = useAuth()
  const navigate = useNavigate()
  const name = displayName(profile, user)

  const logout = async () => {
    await signOut()
    onNavigate?.()
    navigate('/login', { replace: true })
  }

  if (initializing) return <div className="h-12 animate-pulse rounded-lg bg-ink-100" />

  if (!isAuthenticated) {
    return collapsed ? (
      <Link to="/login" onClick={onNavigate} className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg text-ink-600 hover:bg-ink-100" aria-label="Sign in">
        <LogIn size={18} strokeWidth={1.75} />
      </Link>
    ) : (
      <div className="space-y-2">
        <p className="px-1 text-xs leading-relaxed text-ink-500">Sign in to save your scan history and reports.</p>
        <div className="grid grid-cols-2 gap-2">
          <Link to="/login" onClick={onNavigate} className="btn btn-secondary">
            Sign in
          </Link>
          <Link to="/signup" onClick={onNavigate} className="btn btn-primary">
            Sign up
          </Link>
        </div>
      </div>
    )
  }

  if (collapsed) {
    return (
      <Link to="/profile" onClick={onNavigate} className="mx-auto flex h-10 w-10 items-center justify-center rounded-full" aria-label="Profile">
        <Avatar src={profile?.avatar_url} name={name} email={user?.email} />
      </Link>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Link to="/profile" onClick={onNavigate} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 hover:bg-ink-50">
        <Avatar src={profile?.avatar_url} name={name} email={user?.email} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ink-900">{name}</span>
          <span className="block truncate text-xs text-ink-500">{user?.email}</span>
        </span>
      </Link>
      <button
        type="button"
        onClick={logout}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-900"
        aria-label="Log out"
        title="Log out"
      >
        <LogOut size={17} strokeWidth={1.75} />
      </button>
    </div>
  )
}

function SidebarBody({ collapsed, onToggle, onNavigate, mobile }) {
  return (
    <div className="flex h-full flex-col">
      <div className={`flex h-16 shrink-0 items-center border-b border-ink-150 ${collapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
        <Link to="/" onClick={onNavigate} aria-label="ScamShield home" className="rounded-md">
          <Logo collapsed={collapsed} />
        </Link>
        {!collapsed && (
          <button
            type="button"
            onClick={onToggle}
            className="flex h-10 w-10 items-center justify-center rounded-md text-ink-500 hover:bg-ink-100 hover:text-ink-900"
            aria-label={mobile ? 'Close menu' : 'Collapse sidebar'}
          >
            {mobile ? <X size={20} /> : <PanelLeftClose size={18} strokeWidth={1.75} />}
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-4" aria-label="Main">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-5' : ''}>
            {group.label && !collapsed && <div className="eyebrow mb-1.5 px-3">{group.label}</div>}
            {group.label && collapsed && <div className="mx-auto mb-2 h-px w-6 bg-ink-200" />}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItem key={item.to} item={item} collapsed={collapsed} onNavigate={onNavigate} mobile={mobile} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className={`shrink-0 border-t border-ink-150 p-3 ${mobile ? 'pb-safe' : ''}`}>
        <AccountFooter collapsed={collapsed} onNavigate={onNavigate} />
        {!collapsed && (
          <div className="mt-3 flex gap-4 px-2 text-xs text-ink-500">
            <Link to="/privacy" onClick={onNavigate} className="py-1 hover:text-ink-900">Privacy</Link>
            <Link to="/terms" onClick={onNavigate} className="py-1 hover:text-ink-900">Terms</Link>
          </div>
        )}
        {collapsed && (
          <button
            type="button"
            onClick={onToggle}
            className="mx-auto mt-2 flex h-10 w-10 items-center justify-center rounded-md text-ink-500 hover:bg-ink-100 hover:text-ink-900"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen size={18} strokeWidth={1.75} />
          </button>
        )}
      </div>
    </div>
  )
}

export default function Sidebar({ collapsed, onToggleCollapsed, mobileOpen, onCloseMobile }) {
  const location = useLocation()

  useEffect(() => {
    onCloseMobile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e) => e.key === 'Escape' && onCloseMobile()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [mobileOpen, onCloseMobile])

  return (
    <>
      {/* Desktop */}
      <aside
        className="sticky top-0 hidden h-dvh shrink-0 border-r border-ink-200 bg-surface transition-[width] duration-300 ease-[var(--ease-out-quint)] lg:block"
        style={{ width: collapsed ? 72 : 256 }}
      >
        <SidebarBody collapsed={collapsed} onToggle={onToggleCollapsed} />
      </aside>

      {/* Mobile / tablet drawer (hamburger) */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
            <motion.div
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
            />
            <motion.aside
              className="pt-safe absolute inset-y-0 left-0 w-[296px] max-w-[86vw] bg-surface shadow-2xl"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            >
              <SidebarBody collapsed={false} onToggle={onCloseMobile} onNavigate={onCloseMobile} mobile />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
