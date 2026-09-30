import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppState } from '../context/AppState'
import { LEVEL_TO_SHIELD } from '../utils/format'
import { usePrefersReducedMotion } from './useMediaQuery'

// Keep the scanning state on screen long enough for the shield/beam animation
// to read as a scan, even when the API answers in a few milliseconds.
const MIN_SCAN_MS = 1100

/**
 * Shared scan flow: idle → scanning → done | error.
 * The API saves the result to the user's history when they're signed in.
 */
export function useScan(apiCall, type) {
  const { recordScan } = useAppState()
  const reduced = usePrefersReducedMotion()
  const [phase, setPhase] = useState('idle')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const alive = useRef(true)
  const runId = useRef(0)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const run = useCallback(
    async (payload) => {
      const id = ++runId.current
      setPhase('scanning')
      setError(null)
      setResult(null)
      const started = performance.now()
      try {
        const r = await apiCall(payload)
        const wait = (reduced ? 300 : MIN_SCAN_MS) - (performance.now() - started)
        if (wait > 0) await new Promise((res) => setTimeout(res, wait))
        if (!alive.current || id !== runId.current) return
        setResult(r)
        setPhase('done')
        recordScan(type, r)
      } catch (e) {
        if (!alive.current || id !== runId.current) return
        setError(e)
        setPhase('error')
      }
    },
    [apiCall, recordScan, type, reduced],
  )

  const reset = useCallback(() => {
    runId.current++
    setPhase('idle')
    setResult(null)
    setError(null)
  }, [])

  const shieldStatus = phase === 'scanning' ? 'scanning' : phase === 'done' && result ? LEVEL_TO_SHIELD[result.risk_level] : 'idle'

  return { phase, result, error, run, reset, shieldStatus }
}
