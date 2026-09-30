import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { POST_AUTH_REDIRECT_KEY, useAuth } from '../../context/AuthContext'
import { AuthHeader, FormAlert } from '../../components/AuthForm'
import { PageLoader } from '../../components/ui'

/*
  Landing page for Google OAuth and email-confirmation redirects
  (configure <your site>/auth/callback as a Redirect URL in Supabase).
  supabase-js exchanges the ?code= for a session automatically (PKCE).
*/

function redirectError() {
  const q = new URLSearchParams(window.location.search)
  const h = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const error = q.get('error') || h.get('error')
  if (!error) return ''
  const desc = q.get('error_description') || h.get('error_description') || ''
  if (error === 'access_denied') return 'Google sign-in was cancelled.'
  if (/expired/i.test(desc)) return 'This link has expired. Please sign in again.'
  return 'Google authentication failed. Please try again.'
}

function takeRedirect() {
  try {
    const to = sessionStorage.getItem(POST_AUTH_REDIRECT_KEY)
    sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY)
    // Only allow same-site paths.
    if (to && to.startsWith('/') && !to.startsWith('//')) return to
  } catch {
    /* storage unavailable */
  }
  return '/dashboard'
}

export default function AuthCallback() {
  const { initializing, isAuthenticated, configured } = useAuth()
  const navigate = useNavigate()
  const [error] = useState(redirectError)
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    if (error) {
      navigate('/login', { replace: true, state: { oauthError: error } })
      return undefined
    }
    if (!initializing && isAuthenticated) {
      navigate(takeRedirect(), { replace: true })
      return undefined
    }
    const t = setTimeout(() => setTimedOut(true), 8000)
    return () => clearTimeout(t)
  }, [error, initializing, isAuthenticated, navigate])

  if (!configured || (timedOut && !isAuthenticated) || (!initializing && !isAuthenticated && !new URLSearchParams(window.location.search).get('code'))) {
    return (
      <>
        <AuthHeader title="Sign-in not completed" />
        <FormAlert>We couldn’t complete sign-in. The link may have expired or been opened in a different browser.</FormAlert>
        <Link to="/login" className="btn btn-primary mt-6 h-12 w-full">
          Back to sign in
        </Link>
      </>
    )
  }
  return <PageLoader label="Signing you in" />
}
