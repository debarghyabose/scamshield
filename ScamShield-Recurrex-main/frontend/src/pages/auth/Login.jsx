import { useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { validateEmail } from '../../utils/validation'
import { AuthHeader, AuthNotConfigured, Field, FormAlert, GoogleButton, OrDivider, PasswordInput, SubmitButton } from '../../components/AuthForm'

export default function Login() {
  const { configured, signInWithEmail, signInWithGoogle } = useAuth()
  const location = useLocation()
  const [params] = useSearchParams()
  const from = location.state?.from
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(location.state?.oauthError || '')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const expired = params.get('expired') === '1'

  const submit = async (e) => {
    e.preventDefault()
    const errs = { email: validateEmail(email), password: password ? '' : 'Enter your password.' }
    setErrors(errs)
    setFormError('')
    if (errs.email || errs.password) return
    setLoading(true)
    const { error } = await signInWithEmail(email, password)
    setLoading(false)
    if (error) setFormError(error)
    // On success the session changes and <GuestOnly> redirects (to /dashboard by default).
  }

  const google = async () => {
    setFormError('')
    setGoogleLoading(true)
    const { error } = await signInWithGoogle(from ? `${from.pathname}${from.search || ''}` : '/dashboard')
    if (error) {
      setGoogleLoading(false)
      setFormError(error === 'Authentication failed. Please try again.' ? 'Google authentication failed. Please try again.' : error)
    }
  }

  return (
    <>
      <AuthHeader title="Welcome back" subtitle="Sign in to see your dashboard and scan history." />
      {!configured ? (
        <AuthNotConfigured />
      ) : (
        <>
          <div className="space-y-4">
            {expired && !formError && <FormAlert tone="info">Your session expired. Please sign in again.</FormAlert>}
            {location.state?.notice && !formError && <FormAlert tone="success">{location.state.notice}</FormAlert>}
            {formError && <FormAlert>{formError}</FormAlert>}
          </div>

          <form onSubmit={submit} noValidate className="mt-4 space-y-4">
            <Field id="email" label="Email" error={errors.email}>
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="off"
                spellCheck={false}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (errors.email) setErrors((x) => ({ ...x, email: '' }))
                }}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
                className="input h-12 text-base sm:text-[15px]"
                placeholder="you@example.com"
              />
            </Field>
            <Field
              id="password"
              label="Password"
              error={errors.password}
              trailing={
                <Link to="/forgot-password" className="text-[13px] font-medium text-brand-700 hover:underline">
                  Forgot password?
                </Link>
              }
            >
              <PasswordInput
                id="password"
                value={password}
                autoComplete="current-password"
                error={errors.password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (errors.password) setErrors((x) => ({ ...x, password: '' }))
                }}
              />
            </Field>
            <SubmitButton loading={loading} loadingText="Signing in…">
              Continue with Email
            </SubmitButton>
          </form>

          <OrDivider />
          <GoogleButton onClick={google} loading={googleLoading} />

          <p className="mt-8 text-center text-sm text-ink-600">
            New to ScamShield?{' '}
            <Link to="/signup" state={location.state} className="font-medium text-brand-700 hover:underline">
              Create account
            </Link>
          </p>
        </>
      )}
    </>
  )
}
