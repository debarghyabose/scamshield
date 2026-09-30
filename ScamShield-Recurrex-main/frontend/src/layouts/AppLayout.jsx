import { Suspense, useCallback, useEffect, useState } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import BottomNav from '../components/BottomNav'
import { PageLoader } from '../components/ui'

const COLLAPSE_KEY = 'scamshield.sidebarCollapsed'

/**
 * Main application shell.
 *  - Desktop (≥1024px): collapsible left sidebar + top bar.
 *  - Tablet / phone: compact top bar with hamburger drawer + bottom navigation.
 */
export default function AppLayout() {
  const location = useLocation()
  const outlet = useOutlet()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1'
    } catch {
      return false
    }
  })

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1')
      } catch {
        /* storage unavailable */
      }
      return !c
    })
  }, [])
  const closeMobile = useCallback(() => setMobileOpen(false), [])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  return (
    <div className="flex min-h-dvh bg-surface">
      <a href="#main" className="sr-only z-[60] rounded-md bg-ink-900 px-3 py-2 text-sm text-surface focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Skip to content
      </a>
      <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} mobileOpen={mobileOpen} onCloseMobile={closeMobile} />
      <div className="pb-bottom-nav flex min-w-0 flex-1 flex-col">
        <Navbar onOpenMenu={() => setMobileOpen(true)} />
        <main id="main" className="flex-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <Suspense fallback={<PageLoader />}>{outlet}</Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
        <Footer />
      </div>
      <BottomNav />
    </div>
  )
}
