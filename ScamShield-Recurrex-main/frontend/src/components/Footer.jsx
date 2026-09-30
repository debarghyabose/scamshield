import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-ink-200">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-xs text-ink-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>© {new Date().getFullYear()} ScamShield. Results are rule-based risk indicators, not financial or legal advice.</p>
        <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Legal">
          <Link to="/privacy" className="py-1 hover:text-ink-900">Privacy policy</Link>
          <Link to="/terms" className="py-1 hover:text-ink-900">Terms &amp; conditions</Link>
          <a href="https://cybercrime.gov.in" target="_blank" rel="noreferrer noopener" className="py-1 hover:text-ink-900">
            Report cybercrime ↗
          </a>
        </nav>
      </div>
    </footer>
  )
}
