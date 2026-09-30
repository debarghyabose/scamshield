import { useEffect, useState } from 'react'
import { animate } from 'framer-motion'
import { usePrefersReducedMotion } from './useMediaQuery'

/** Animates a number from 0 to `value`. Returns the current integer. */
export function useCountUp(value, { duration = 1.1, delay = 0 } = {}) {
  const reduced = usePrefersReducedMotion()
  const [display, setDisplay] = useState(reduced ? value : 0)
  useEffect(() => {
    if (reduced) {
      setDisplay(value)
      return
    }
    const controls = animate(0, value, {
      duration,
      delay,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    })
    return () => controls.stop()
  }, [value, duration, delay, reduced])
  return display
}
