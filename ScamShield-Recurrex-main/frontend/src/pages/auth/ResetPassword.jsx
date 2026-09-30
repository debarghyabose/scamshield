import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { validatePassword } from '../../utils/validation'
import { AuthHeader, AuthNotConfigured, Field, FormAlert, PasswordInput, SubmitButton } from '../../components/AuthForm'
import { PageLoader } from '../../components/ui'

/** Readable error from Supabase's redirect (?error=…&error_description=… or #error=…). */
function linkError() {
  const q = new URLSearchParams(window.location.search)
  const h = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const code = q.get('error_code') || h.get('error_code')
  const desc = q.get('error_description') || h.get('error_description')
  if (!code && !desc && !q.get('error') && !h.get('error')) return ''
  if (code === 'otp_expired' || /expired/i.test(desc || '')) return 'This reset link has expired. Please request a new one.'
  return 'This reset link is invalid. Please request a new one.'
}

export default function ResetPassword() {
  const { configured, initializing, isAuthenticated, updatePassword } = useAuth()
  const navigate = useNavigate()
  const [urlError] = useState(linkError)
  const [waited, setWaited] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  // Give supabase-js a moment to exchange the ?code= from the email link for a session.
  useEffect(() => {
    const t = setTimeout(() => setWaited(true), 2500)
    return () => clearTimeout(t)
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    const errs = {
      password: validatePassword(password, { forSignup: true }),
      confirm: !confirm ? 'Confirm your new password.' : confirm !== password ? 'Passwords don’t match.' : '',
    }
    setErrors(errs)
    setFormError('')
    if (errs.password || errs.confirm) return
    setLoading(true)
    const { error } = await updatePassword(password)
    setLoading(false)
    if (error) return setFormError(error)
    setDone(true)
  }

  if (!configured) {
    return (
      <>
        <AuthHeader title="Choose a new password" />
        <AuthNotConfigured />
      </>
    )
  }

  if (!urlError && !isAuthenticated && (initializing || !waited)) return <PageLoader label="Verifying your reset link" />

  if (urlError || !isAuthenticated) {
    return (
      <>
        <AuthHeader title="Link not valid" />
        <FormAlert>{urlError || 'This reset link is invalid or has expired. Please request a new one.'}</FormAlert>
        <Link to="/forgot-password" className="btn btn-primary mt-6 h-12 w-full">
          Request a new link
        </Link>
      </>
    )
  }

  if (done) {
    return (
      <>
        <AuthHeader />
        <div className="card p-6">
          <CheckCircle2 size={28} className="text-safe-600" />
          <h1 className="mt-3 text-xl font-semibold">Password updated</h1>
          <p className="mt-1.5 text-[15px] text-ink-600">You’re signed in with your new password.</p>
          <button type="button" onClick={() => navigate('/dashboard', { replace: true })} className="btn btn-primary mt-6 h-12 w-full">
            Go to dashboard
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <AuthHeader title="Choose a new password" subtitle="Use at least 8 characters, with a letter and a number." />
      {formError && <FormAlert>{formError}</FormAlert>}
      <form onSubmit={submit} noValidate className="mt-4 space-y-4">
        <Field id="password" label="New password" error={errors.password}>
          <PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} autoComplete="new-password" />
        </Field>
        <Field id="confirm" label="Confirm new password" error={errors.confirm}>
          <PasswordInput id="confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} autoComplete="new-password" />
        </Field>
        <SubmitButton loading={loading} loadingText="Saving…">
          Update password
        </SubmitButton>
      </form>
    </>
  )
}
