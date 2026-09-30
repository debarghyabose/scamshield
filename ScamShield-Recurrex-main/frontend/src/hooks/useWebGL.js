import { useMemo } from 'react'

/**
 * Picks how much 3D the device should render:
 *   'full'   — desktop/laptop: glass transmission, shadows, 170 particles
 *   'medium' — tablets / mid-range: no glass transmission, fewer particles
 *   'lite'   — phones: small DPR, 50 particles, no shadows
 *   'none'   — no WebGL, data-saver, very low-end hardware → SVG shield
 * Force a tier for testing with ?3d=full|medium|lite|off.
 */
export function useWebGLTier() {
  return useMemo(() => {
    if (typeof window === 'undefined') return 'none'
    const forced = new URLSearchParams(window.location.search).get('3d')
    if (forced === 'off') return 'none'
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
      if (!gl) return 'none'
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    } catch {
      return 'none'
    }
    if (forced === 'full' || forced === 'medium' || forced === 'lite') return forced

    const cores = navigator.hardwareConcurrency || 4
    const memory = navigator.deviceMemory || 4 // GB, Chromium only
    const saveData = navigator.connection?.saveData === true
    if (saveData || cores <= 2 || memory < 2) return 'none'

    const width = window.innerWidth
    const coarse = window.matchMedia('(pointer: coarse)').matches
    if (width < 640 || memory <= 2 || cores < 4) return 'lite'
    if (width < 1024 || coarse || memory <= 4) return 'medium'
    return 'full'
  }, [])
}
