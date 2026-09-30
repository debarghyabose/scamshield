import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bell, Camera, Check, Globe, KeyRound, LogOut, Monitor, Moon, Sun, UserRound } from 'lucide-react'
import Avatar from '../components/Avatar'
import { PasswordInput } from '../components/AuthForm'
import { Container, ErrorState, PageHeader, Spinner } from '../components/ui'
import { displayName, useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { formatDate } from '../utils/format'
import { validatePassword } from '../utils/validation'

const THEMES = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]
const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी (Hindi)' },
  { value: 'bn', label: 'বাংলা (Bengali)' },
]

function Section({ icon: Icon, title, description, children }) {
  return (
    <section className="flex flex-col gap-4 py-5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ink-200 bg-ink-50 text-ink-600">
          <Icon size={17} strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
          {description && <p className="mt-0.5 text-[13px] leading-relaxed text-ink-500">{description}</p>}
        </div>
      </div>
      <div className="shrink-0 sm:pl-4">{children}</div>
    </section>
  )
}

function Switch({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors disabled:opacity-50 ${checked ? 'bg-brand-600' : 'bg-ink-300'}`}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 600, damping: 35 }}
        className={`inline-block h-6 w-6 rounded-full bg-white shadow ${checked ? 'ml-7' : 'ml-1'}`}
      />
    </button>
  )
}

function useSaveFlag() {
  const [state, setState] = useState({ status: 'idle', error: '' })
  const timer = useRef()
  useEffect(() => () => clearTimeout(timer.current), [])
  const run = async (fn) => {
    setState({ status: 'saving', error: '' })
    try {
      await fn()
      setState({ status: 'saved', error: '' })
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setState({ status: 'idle', error: '' }), 1800)
      return true
    } catch (e) {
      setState({ status: 'error', error: e.message || 'Couldn’t save. Please try again.' })
      return false
    }
  }
  return [state, run]
}

function SaveHint({ state }) {
  if (state.status === 'saving') return <span className="flex items-center gap-1 text-xs text-ink-500"><Spinner size={12} /> Saving…</span>
  if (state.status === 'saved') return <span className="flex items-center gap-1 text-xs text-safe-700"><Check size={13} /> Saved</span>
  if (state.status === 'error') return <span className="text-xs text-danger-600" role="alert">{state.error}</span>
  return null
}

function ChangePassword() {
  const { updatePassword } = useAuth()
  const [open, setOpen] = useState(false)
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [state, setState] = useState('idle')

  const submit = async (e) => {
    e.preventDefault()
    const err = validatePassword(pw, { forSignup: true }) || (pw !== confirm ? 'Passwords don’t match.' : '')
    setError(err)
    if (err) return
    setState('saving')
    const { error: apiError } = await updatePassword(pw)
    if (apiError) {
      setError(apiError)
      setState('idle')
      return
    }
    setState('done')
    setPw('')
    setConfirm('')
  }

  if (!open) {
    return (
      <button type="button" className="btn btn-secondary w-full sm:w-auto" onClick={() => setOpen(true)}>
        Change password
      </button>
    )
  }
  return (
    <form onSubmit={submit} noValidate className="w-full space-y-3 sm:w-72">
      <label className="sr-only" htmlFor="new-password">New password</label>
      <PasswordInput id="new-password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" error={error} />
      <label className="sr-only" htmlFor="confirm-password">Confirm new password</label>
      <PasswordInput id="confirm-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
      {error && <p className="field-error" role="alert">{error}</p>}
      {state === 'done' && <p className="flex items-center gap-1 text-xs text-safe-700"><Check size={13} /> Password updated</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn btn-ghost" onClick={() => { setOpen(false); setError(''); setState('idle') }}>
          Close
        </button>
        <button type="submit" className="btn btn-primary" disabled={state === 'saving'}>
          {state === 'saving' && <Spinner />} Update
        </button>
      </div>
    </form>
  )
}

export default function Profile() {
  const { user, profile, profileStatus, reloadProfile, updateProfile, uploadAvatar, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const [name, setName] = useState(profile?.full_name || '')
  const [nameError, setNameError] = useState('')
  const [nameState, saveName] = useSaveFlag()
  const [avatarState, saveAvatar] = useSaveFlag()
  const [settingsState, saveSettings] = useSaveFlag()
  const [loggingOut, setLoggingOut] = useState(false)
  const backendDown = profileStatus === 'error'
  const provider = profile?.provider || user?.app_metadata?.provider

  useEffect(() => setName(profile?.full_name || ''), [profile?.full_name])

  const submitName = async (e) => {
    e.preventDefault()
    const v = name.trim()
    if (!v) return setNameError('Enter your name.')
    if (v.length > 120) return setNameError('Name is too long.')
    setNameError('')
    await saveName(() => updateProfile({ full_name: v }))
  }

  const pickAvatar = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) await saveAvatar(() => uploadAvatar(file))
  }

  const changeTheme = (value) => {
    setTheme(value) // applies instantly on this device
    saveSettings(() => updateProfile({ theme: value }))
  }

  const logout = async () => {
    setLoggingOut(true)
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <Container className="max-w-3xl">
      <PageHeader eyebrow="Account" title="Profile" />

      {backendDown && (
        <div className="mt-6">
          <ErrorState
            title="Profile service unavailable"
            message="Showing details from your sign-in. Changes can’t be saved until the ScamShield server is reachable."
            onRetry={reloadProfile}
          />
        </div>
      )}

      {/* Identity */}
      <section className="card mt-6 p-5 sm:p-6" aria-label="Your details">
        <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:text-left">
          <div className="relative">
            <Avatar src={profile?.avatar_url} name={displayName(profile, user)} email={user?.email} size="xl" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={backendDown || avatarState.status === 'saving'}
              className="absolute -right-1 -bottom-1 flex h-10 w-10 items-center justify-center rounded-full border-2 border-surface bg-ink-900 text-surface shadow disabled:opacity-60"
              aria-label="Change profile picture"
            >
              {avatarState.status === 'saving' ? <Spinner size={15} /> : <Camera size={16} />}
            </button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={pickAvatar} tabIndex={-1} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-semibold tracking-[-0.01em] text-ink-900">{displayName(profile, user)}</p>
            <p className="mt-0.5 truncate text-sm text-ink-600">{user?.email}</p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs text-ink-500 sm:justify-start">
              {(profile?.created_at || user?.created_at) && <span>Member since {formatDate(profile?.created_at || user?.created_at)}</span>}
              {provider && (
                <span className="rounded-full border border-ink-200 px-2 py-0.5 font-medium text-ink-600">
                  {provider === 'google' ? 'Google account' : 'Email & password'}
                </span>
              )}
            </div>
            <div className="mt-2 min-h-4"><SaveHint state={avatarState} /></div>
          </div>
        </div>

        <form onSubmit={submitName} noValidate className="mt-6 border-t border-ink-150 pt-5">
          <label htmlFor="full_name" className="field-label">Full name</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="full_name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (nameError) setNameError('')
              }}
              autoComplete="name"
              maxLength={120}
              aria-invalid={!!nameError}
              className="input h-12 flex-1 text-base sm:text-[15px]"
            />
            <button
              type="submit"
              className="btn btn-primary h-12 px-5"
              disabled={backendDown || nameState.status === 'saving' || name.trim() === (profile?.full_name || '')}
            >
              Save name
            </button>
          </div>
          {nameError ? <p className="field-error" role="alert">{nameError}</p> : <div className="mt-1.5 min-h-4"><SaveHint state={nameState} /></div>}
        </form>
      </section>

      {/* Settings */}
      <section className="card mt-4 p-5 sm:p-6" aria-labelledby="settings-heading">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="settings-heading" className="text-base font-semibold">Settings</h2>
          <SaveHint state={settingsState} />
        </div>
        <div className="divide-y divide-ink-150">
          <Section icon={Moon} title="Dark mode" description="Choose a theme, or follow your device setting.">
            <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-1 rounded-lg border border-ink-200 bg-ink-50 p-1">
              {THEMES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={theme === value}
                  onClick={() => changeTheme(value)}
                  className={`flex h-10 items-center justify-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-colors ${
                    theme === value ? 'bg-surface text-ink-900 shadow-sm ring-1 ring-ink-200' : 'text-ink-500 hover:text-ink-800'
                  }`}
                >
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>
          </Section>

          <Section icon={Bell} title="Notifications" description="Show in-app notifications for your scan results. ScamShield doesn’t send push or email notifications.">
            <Switch
              label="In-app notifications"
              checked={profile?.notifications_enabled !== false}
              disabled={backendDown || settingsState.status === 'saving'}
              onChange={(v) => saveSettings(() => updateProfile({ notifications_enabled: v }))}
            />
          </Section>

          <Section
            icon={Globe}
            title="Language"
            description={
              profile?.language && profile.language !== 'en'
                ? 'Saved. The interface is currently available in English only — translations are planned.'
                : 'Your preferred language. The interface is currently available in English only.'
            }
          >
            <select
              aria-label="Language"
              value={profile?.language || 'en'}
              disabled={backendDown}
              onChange={(e) => saveSettings(() => updateProfile({ language: e.target.value }))}
              className="input h-11 w-full appearance-auto sm:w-48"
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </Section>

          {provider !== 'google' && (
            <Section icon={KeyRound} title="Password" description="Update the password you use to sign in.">
              <ChangePassword />
            </Section>
          )}

          <Section icon={UserRound} title="Sign out" description="Sign out of ScamShield on this device.">
            <button type="button" onClick={logout} disabled={loggingOut} className="btn btn-secondary w-full text-danger-600 sm:w-auto">
              {loggingOut ? <Spinner /> : <LogOut size={16} />} Logout
            </button>
          </Section>
        </div>
      </section>
    </Container>
  )
}
