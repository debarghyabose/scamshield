import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PageLoader } from './ui'

/** Protected route: unauthenticated visitors are sent to /login and returned afterwards. */
export default function RequireAuth({ children }) {
  const { initializing, isAuthenticated, sessionExpired } = useAuth()
  const location = useLocation()
  if (initializing) return <PageLoader label="Checking your session" />
  if (!isAuthenticated) {
    return (
      <Navigate
        to={`/login${sessionExpired ? '?expired=1' : ''}`}
        replace
        state={{ from: { pathname: location.pathname, search: location.search, state: location.state } }}
      />
    )
  }
  return children
}
