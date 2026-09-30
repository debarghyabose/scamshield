import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { passwordStrength, validateEmail, validatePassword } from '../../utils/validation'
import { AuthHeader, AuthNotConfigured, Field, FormAlert, GoogleButton, OrDivider, PasswordInput, SubmitButton } from '../../components/AuthForm'

const STRENGTH = [
  { label: 'Too short', cls: 'bg-danger-500' },
  { label: 'Weak', cls: 'bg-danger-500' },
  { label: 'Fair', cls: 'bg-warn-500' },
  { label: 'Good', cls: 'bg-safe-500' },
  { label: 'Strong', cls: 'bg-safe-600' },
]

function validate(v) {
  const e = {}
  const name = v.fullName.trim()
  if (!name) e.fullName = 'Enter your full name.'
  else if (name.length > 120) e.fullName = 'Name is too long.'
  e.email = validateEmail(v.email)
  e.password = validatePassword(v.password, { forSignup: true })
  if (!v.confirm) e.confirm = 'Confirm your password.'
  else if (v.confirm !== v.password) e.confirm = 'Passwords don’t match.'
  Object.keys(e).forEach((k) => !e[k] && delete e[k])
  return e
}

export default function Signup() {
  const { configured, signUpWithEmail, signInWithGoogle } = useAuth()
  const location = useLocation()
  const from = location.state?.from
  const [values, setValues] = useState({ fullName: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [sentTo, setSentTo] = useState('')
  const strength = passwordStrength(values.password)

  const set = (k) => (e) => {
    setValues((v) => ({ ...v, [k]: e.target.value }))
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }))
  }

  const submit = async (e) => {
    e.preventDefault()
    const errs = validate(values)
    setErrors(errs)
    setFormError('')
    if (Object.keys(errs).length) {
      document.getElementById(Object.keys(errs)[0])?.focus()
      return
    }
    setLoading(true)
    const { error, needsConfirmation } = await signUpWithEmail(values)
    setLoading(false)
    if (error) return setFormError(error)
    if (needsConfirmation) setSentTo(values.email.trim())
    // Otherwise a session now exists and <GuestOnly> continues to /dashboard.
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

  if (sentTo) {
    return (
      <>
        <AuthHeader />
        <div className="card p-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <MailCheck size={24} />
          </span>
          <h1 className="mt-4 text-xl font-semibold tracking-[-0.01em]">Confirm your email</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-600">
            We sent a confirmation link to <strong className="font-medium text-ink-900">{sentTo}</strong>. Open it on this device to finish
            creating your account.
          </p>
          <p className="mt-3 text-[13px] text-ink-500">Didn’t get it? Check spam, or wait a minute and sign up again.</p>
          <Link to="/login" className="btn btn-secondary mt-6 w-full">
            Back to sign in
          </Link>
        </div>
      </>
    )
  }

  return (
    <>
      <AuthHeader title="Create your account" subtitle="Save your scans, track threats and report scams." />
      {!configured ? (
        <AuthNotConfigured />
      ) : (
        <>
          {formError && <FormAlert>{formError}</FormAlert>}
          <form onSubmit={submit} noValidate className="mt-4 space-y-4">
            <Field id="fullName" label="Full name" error={errors.fullName}>
              <input id="fullName" autoComplete="name" value={values.fullName} onChange={set('fullName')} aria-invalid={!!errors.fullName} className="input h-12 text-base sm:text-[15px]" />
            </Field>
            <Field id="email" label="Email" error={errors.email}>
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="off"
                spellCheck={false}
                value={values.email}
                onChange={set('email')}
                aria-invalid={!!errors.email}
                className="input h-12 text-base sm:text-[15px]"
                placeholder="you@example.com"
              />
            </Field>
            <Field id="password" label="Password" error={errors.password} hint="At least 8 characters, with a letter and a number.">
              <PasswordInput id="password" value={values.password} onChange={set('password')} error={errors.password} autoComplete="new-password" />
              {values.password && (
                <div className="mt-2 flex items-center gap-2" aria-live="polite">
                  <div className="flex flex-1 gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <span key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= strength ? STRENGTH[strength].cls : 'bg-ink-150'}`} />
                    ))}
                  </div>
                  <span className="w-12 text-right text-[11px] text-ink-500">{STRENGTH[strength].label}</span>
                </div>
              )}
            </Field>
            <Field id="confirm" label="Confirm password" error={errors.confirm}>
              <PasswordInput id="confirm" value={values.confirm} onChange={set('confirm')} error={errors.confirm} autoComplete="new-password" />
            </Field>
            <SubmitButton loading={loading} loadingText="Creating account…">
              Create Account
            </SubmitButton>
            <p className="text-center text-xs leading-relaxed text-ink-500">
              By creating an account you agree to the{' '}
              <Link to="/terms" className="underline underline-offset-2 hover:text-ink-800">Terms</Link> and{' '}
              <Link to="/privacy" className="underline underline-offset-2 hover:text-ink-800">Privacy policy</Link>.
            </p>
          </form>

          <OrDivider />
          <GoogleButton onClick={google} loading={googleLoading} />

          <p className="mt-8 text-center text-sm text-ink-600">
            Already have an account?{' '}
            <Link to="/login" state={location.state} className="font-medium text-brand-700 hover:underline">
              Sign in
            </Link>
          </p>
        </>
      )}
    </>
  )
}
