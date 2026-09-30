import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, MailCheck } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { validateEmail } from '../../utils/validation'
import { AuthHeader, AuthNotConfigured, Field, FormAlert, SubmitButton } from '../../components/AuthForm'

export default function ForgotPassword() {
  const { configured, sendPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    const err = validateEmail(email)
    setError(err)
    setFormError('')
    if (err) return
    setLoading(true)
    const { error: apiError } = await sendPasswordReset(email)
    setLoading(false)
    if (apiError) return setFormError(apiError)
    setSent(true)
  }

  return (
    <>
      <AuthHeader title="Reset your password" subtitle="Enter your account email and we’ll send you a reset link." />
      {!configured ? (
        <AuthNotConfigured />
      ) : sent ? (
        <div className="card p-6">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <MailCheck size={22} />
          </span>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-700">
            If an account exists for <strong className="font-medium text-ink-900">{email.trim()}</strong>, a reset link is on its way. Open it in
            this browser to choose a new password.
          </p>
          <Link to="/login" className="btn btn-secondary mt-6 w-full">
            Back to sign in
          </Link>
        </div>
      ) : (
        <>
          {formError && <FormAlert>{formError}</FormAlert>}
          <form onSubmit={submit} noValidate className="mt-4 space-y-4">
            <Field id="email" label="Email" error={error}>
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
                  if (error) setError('')
                }}
                aria-invalid={!!error}
                className="input h-12 text-base sm:text-[15px]"
                placeholder="you@example.com"
              />
            </Field>
            <SubmitButton loading={loading} loadingText="Sending…">
              Send reset link
            </SubmitButton>
          </form>
          <Link to="/login" className="mt-6 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-ink-900">
            <ArrowLeft size={15} /> Back to sign in
          </Link>
        </>
      )}
    </>
  )
}
