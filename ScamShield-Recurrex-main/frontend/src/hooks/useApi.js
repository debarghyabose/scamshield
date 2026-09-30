import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Loads data from the API with loading / success / error states and a retry.
 * `fetcher` receives an AbortSignal. Re-runs when `deps` change.
 */
export function useApi(fetcher, deps = [], { enabled = true } = {}) {
  const [state, setState] = useState({ status: enabled ? 'loading' : 'idle', data: null, error: null })
  const [nonce, setNonce] = useState(0)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  useEffect(() => {
    if (!enabled) return undefined
    const controller = new AbortController()
    setState((s) => ({ ...s, status: s.data ? 'refreshing' : 'loading', error: null }))
    fetcherRef
      .current(controller.signal)
      .then((data) => !controller.signal.aborted && setState({ status: 'success', data, error: null }))
      .catch((error) => {
        if (controller.signal.aborted || error?.code === 'CANCELLED') return
        setState((s) => ({ status: 'error', data: s.data, error }))
      })
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce, enabled])

  const retry = useCallback(() => setNonce((n) => n + 1), [])
  return { ...state, loading: state.status === 'loading', retry, setData: (data) => setState((s) => ({ ...s, data })) }
}
