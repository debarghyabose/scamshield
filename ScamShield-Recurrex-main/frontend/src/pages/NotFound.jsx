import { Link } from 'react-router-dom'
import { Container } from '../components/ui'

export default function NotFound() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-start justify-center">
      <p className="font-mono text-sm text-ink-400">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em]">This page doesn’t exist</h1>
      <p className="mt-2 max-w-md text-[15px] text-ink-600">The link may be broken, or the page may have moved. If someone sent you here unexpectedly, be cautious.</p>
      <div className="mt-6 flex gap-2">
        <Link to="/" className="btn btn-primary">
          Go home
        </Link>
        <Link to="/scan/url" className="btn btn-secondary">
          Check a link
        </Link>
      </div>
    </Container>
  )
}
