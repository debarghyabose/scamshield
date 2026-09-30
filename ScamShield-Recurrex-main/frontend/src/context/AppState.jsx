import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import { LEVEL_LABEL, SCAN_TYPE_LABEL } from '../utils/constants'

/*
  Cross-page UI state:
  - dataVersion: bumped after a scan is saved or a report is sent, so the
    dashboard / history refetch from the API.
  - notifications: in-app notices for scans run in this browser session
    (not push or email). Respects the user's Notifications setting.
*/
const AppStateContext = createContext(null)

export function AppStateProvider({ children }) {
  const { profile, user } = useAuth()
  const notificationsEnabled = profile?.notifications_enabled !== false
  const [notifications, setNotifications] = useState([])
  const [dataVersion, setDataVersion] = useState(0)

  // Clear session notices when the account changes.
  useEffect(() => setNotifications([]), [user?.id])

  const invalidate = useCallback(() => setDataVersion((v) => v + 1), [])

  const recordScan = useCallback(
    (type, result) => {
      if (result.saved) invalidate()
      if (!notificationsEnabled) return
      setNotifications((prev) =>
        [
          {
            id: `scan-${result.id || Date.now()}`,
            title: `${SCAN_TYPE_LABEL[type]} scan: ${LEVEL_LABEL[result.risk_level]}`,
            body: `Risk score ${result.risk_score}/100${result.category ? ` · ${result.category}` : ''}${result.saved ? ' · saved to history' : ''}`,
            href: result.saved && result.id ? `/history/${result.id}` : null,
            created_at: new Date().toISOString(),
            unread: true,
          },
          ...prev,
        ].slice(0, 20),
      )
    },
    [invalidate, notificationsEnabled],
  )

  const markAllRead = useCallback(() => setNotifications((prev) => prev.map((n) => ({ ...n, unread: false }))), [])

  const value = useMemo(
    () => ({ notifications: notificationsEnabled ? notifications : [], notificationsEnabled, recordScan, markAllRead, dataVersion, invalidate }),
    [notifications, notificationsEnabled, recordScan, markAllRead, dataVersion, invalidate],
  )
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used inside <AppStateProvider>')
  return ctx
}
