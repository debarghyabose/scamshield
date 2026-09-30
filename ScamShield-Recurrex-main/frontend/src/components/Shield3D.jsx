import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import ErrorBoundary from './ErrorBoundary'
import ShieldFallback from '../three/ShieldFallback'
import { useWebGLTier } from '../hooks/useWebGL'
import { usePrefersReducedMotion } from '../hooks/useMediaQuery'

// Three.js is loaded on demand so the rest of the app stays fast.
const ShieldScene = lazy(() => import('../three/ShieldScene'))

const STATUS_TEXT = {
  idle: 'Ready',
  scanning: 'Scanning',
  safe: 'Safe',
  suspicious: 'Suspicious',
  dangerous: 'Dangerous',
}

/**
 * Interactive 3D shield. Falls back to an SVG shield when WebGL is missing,
 * fails, or is still loading.
 *
 * status: 'idle' | 'scanning' | 'safe' | 'suspicious' | 'dangerous'
 */
export default function Shield3D({ status = 'idle', compact = false, className = '' }) {
  const tier = useWebGLTier()
  const reduced = usePrefersReducedMotion()
  const ref = useRef(null)
  const [onScreen, setOnScreen] = useState(true)

  // Pause rendering when the shield is scrolled out of view.
  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { rootMargin: '80px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const fallback = <ShieldFallback status={status} />

  return (
    <div ref={ref} className={`relative h-full w-full ${className}`} role="img" aria-label={`Security shield. Status: ${STATUS_TEXT[status]}`}>
      {tier === 'none' ? (
        fallback
      ) : (
        <ErrorBoundary fallback={fallback}>
          <Suspense fallback={<ShieldFallback status={status} loading />}>
            <ShieldScene status={status} tier={tier} reduced={reduced} compact={compact} active={onScreen} />
          </Suspense>
        </ErrorBoundary>
      )}
      <span className="sr-only" aria-live="polite">
        Shield status: {STATUS_TEXT[status]}
      </span>
    </div>
  )
}
