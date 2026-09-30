import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, Eye, EyeOff, Info, Settings2 } from 'lucide-react'
import { LogoMark } from './Logo'
import { Spinner } from './ui'

/* Building blocks shared by the login, signup and password pages. */

export function AuthHeader({ title, subtitle }) {
  return (
    <div className="mb-8">
      <Link to="/" className="inline-flex items-center gap-2.5 rounded-md lg:hidden" aria-label="ScamShield home">
        <LogoMark className="h-9 w-9" />
      </Link>
      <p className="mt-5 font-mono text-[13px] font-medium tracking-[0.28em] text-ink-900 lg:mt-0">SCAMSHIELD</p>
      <p className="mt-1 text-sm text-ink-500">Your digital safety layer.</p>
      {title && <h1 className="mt-7 text-[26px] leading-tight font-semibold tracking-[-0.02em] text-ink-900">{title}</h1>}
      {subtitle && <p className="mt-1.5 text-[15px] leading-relaxed text-ink-600">{subtitle}</p>}
    </div>
  )
}

export function Field({ id, label, error, hint, children, trailing }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-ink-800">
          {label}
        </label>
        {trailing}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="field-error" role="alert">
          <AlertCircle size={13} /> {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="field-hint">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

export function PasswordInput({ id, value, onChange, error, autoComplete, onBlur }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        spellCheck={false}
        autoCapitalize="off"
        className="input h-12 pr-12 text-base sm:text-[15px]"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute top-1/2 right-1 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-ink-500 hover:bg-ink-100 hover:text-ink-900"
        aria-label={show ? 'Hide password' : 'Show password'}
        aria-pressed={show}
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  )
}

export function FormAlert({ tone = 'error', children }) {
  const styles = {
    error: ['border-danger-100 bg-danger-50 text-danger-700', AlertCircle],
    success: ['border-safe-100 bg-safe-50 text-safe-700', CheckCircle2],
    info: ['border-brand-100 bg-brand-50 text-brand-800', Info],
  }[tone]
  const Icon = styles[1]
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-[13px] leading-relaxed ${styles[0]}`}
    >
      <Icon size={16} className="mt-px shrink-0" />
      <div>{children}</div>
    </motion.div>
  )
}

export function SubmitButton({ loading, children, loadingText }) {
  return (
    <button type="submit" disabled={loading} className="btn btn-primary h-12 w-full text-[15px]">
      {loading && <Spinner />}
      {loading ? loadingText : children}
    </button>
  )
}

function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

export function GoogleButton({ onClick, loading, label = 'Continue with Google' }) {
  return (
    <button type="button" onClick={onClick} disabled={loading} className="btn btn-secondary h-12 w-full text-[15px]">
      {loading ? <Spinner /> : <GoogleG />}
      {loading ? 'Redirecting to Google…' : label}
    </button>
  )
}

export function OrDivider() {
  return (
    <div className="my-6 flex items-center gap-3 text-xs text-ink-400" role="separator">
      <span className="h-px flex-1 bg-ink-200" />
      or
      <span className="h-px flex-1 bg-ink-200" />
    </div>
  )
}

/** Shown instead of a (fake) form when Supabase keys are missing. */
export function AuthNotConfigured() {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-ink-900">
        <Settings2 size={17} /> Sign-in isn’t configured yet
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-600">
        Add <code className="rounded bg-ink-100 px-1 font-mono text-[12px]">VITE_SUPABASE_URL</code> and{' '}
        <code className="rounded bg-ink-100 px-1 font-mono text-[12px]">VITE_SUPABASE_ANON_KEY</code> to{' '}
        <code className="rounded bg-ink-100 px-1 font-mono text-[12px]">frontend/.env</code>, then restart the dev server. See the README for
        the full Supabase setup.
      </p>
      <p className="mt-3 text-[13px] text-ink-600">
        You can still{' '}
        <Link to="/scan/message" className="font-medium text-brand-700 hover:underline">
          run scans without an account
        </Link>
        .
      </p>
    </div>
  )
}
