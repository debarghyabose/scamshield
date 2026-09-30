import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PageLoader } from './ui'

/** Login / signup pages: once a session exists, continue to where the user was going (default /dashboard). */
export default function GuestOnly({ children }) {
  const { initializing, isAuthenticated } = useAuth()
  const location = useLocation()
  if (initializing) return <PageLoader label="Checking your session" />
  if (isAuthenticated) {
    const from = location.state?.from
    const to = from ? `${from.pathname}${from.search || ''}` : '/dashboard'
    return <Navigate to={to} replace state={from?.state} />
  }
  return children
}
