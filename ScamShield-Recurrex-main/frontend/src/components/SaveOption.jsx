import { Link } from 'react-router-dom'
import { History } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

/** "Save to history" toggle for signed-in users; a sign-in hint for everyone else. */
export default function SaveOption({ save, onChange }) {
  const { isAuthenticated, initializing } = useAuth()
  if (initializing) return null
  if (!isAuthenticated) {
    return (
      <p className="flex items-start gap-2 text-[13px] leading-relaxed text-ink-500">
        <History size={15} className="mt-0.5 shrink-0" />
        <span>
          Scanning without an account — results aren’t saved.{' '}
          <Link to="/login" className="font-medium text-brand-700 hover:underline">
            Sign in
          </Link>{' '}
          to keep a private history.
        </span>
      </p>
    )
  }
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[13px] text-ink-700">
      <input type="checkbox" checked={save} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 shrink-0 accent-ink-900" />
      Save this result to my private scan history
    </label>
  )
}
