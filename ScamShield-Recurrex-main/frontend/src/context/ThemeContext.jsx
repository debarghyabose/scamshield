import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

/*
  Light / dark / system theme.
  The choice is applied instantly and remembered on this device (localStorage);
  signed-in users also have it saved to their profile so it follows them.
*/
const ThemeContext = createContext(null)
const KEY = 'scamshield.theme'
const META_COLORS = { light: '#ffffff', dark: '#0c1320' }

function readStored() {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'light'
  } catch {
    return 'light'
  }
}

const systemDark = () => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStored)
  const [osDark, setOsDark] = useState(systemDark)
  const resolved = theme === 'system' ? (osDark ? 'dark' : 'light') : theme

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setOsDark(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', resolved === 'dark')
    root.style.colorScheme = resolved
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META_COLORS[resolved])
  }, [resolved])

  const setTheme = useCallback((next) => {
    setThemeState(next)
    try {
      localStorage.setItem(KEY, next)
    } catch {
      /* storage unavailable */
    }
  }, [])

  const value = useMemo(() => ({ theme, resolved, setTheme }), [theme, resolved, setTheme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
