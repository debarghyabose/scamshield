import { Suspense } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { Check } from 'lucide-react'
import Logo from '../components/Logo'
import Shield3D from '../components/Shield3D'
import { PageLoader } from '../components/ui'
import { useMediaQuery } from '../hooks/useMediaQuery'

const POINTS = [
  'Check messages, links and payment requests in seconds',
  'See exactly which warning signs were found',
  'Keep a private history only you can see',
]

/** Sign-in / sign-up shell: brand panel with the 3D shield on desktop, focused form on mobile. */
export default function AuthLayout() {
  const desktop = useMediaQuery('(min-width: 1024px)')
  return (
    <div className="min-h-dvh bg-surface lg:grid lg:grid-cols-2">
      <aside className="relative hidden flex-col overflow-hidden border-r border-ink-200 bg-ink-50 lg:flex">
        <div
          className="bg-grid pointer-events-none absolute inset-0"
          style={{ maskImage: 'radial-gradient(ellipse 70% 60% at 50% 55%, #000 30%, transparent 80%)', WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 55%, #000 30%, transparent 80%)' }}
        />
        <div className="relative px-10 pt-8">
          <Link to="/" aria-label="ScamShield home" className="inline-block rounded-md">
            <Logo />
          </Link>
        </div>
        <div className="relative min-h-0 flex-1">{desktop && <Shield3D status="idle" />}</div>
        <div className="relative px-10 pb-10">
          <p className="text-2xl font-semibold tracking-[-0.02em] text-ink-900">Your digital safety layer.</p>
          <ul className="mt-4 space-y-2">
            {POINTS.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-sm text-ink-600">
                <Check size={16} className="mt-0.5 shrink-0 text-safe-600" /> {p}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main id="main" className="pt-safe pb-safe flex min-h-dvh flex-col px-5 sm:px-8">
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </div>
        <footer className="mx-auto flex w-full max-w-[400px] flex-wrap justify-center gap-x-5 gap-y-2 pb-6 text-xs text-ink-500">
          <Link to="/" className="py-1 hover:text-ink-900">Home</Link>
          <Link to="/learn" className="py-1 hover:text-ink-900">Learn safety</Link>
          <Link to="/privacy" className="py-1 hover:text-ink-900">Privacy</Link>
          <Link to="/terms" className="py-1 hover:text-ink-900">Terms</Link>
        </footer>
      </main>
    </div>
  )
}
