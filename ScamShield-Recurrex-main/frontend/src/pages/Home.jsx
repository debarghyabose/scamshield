import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, CreditCard, History, Link2, Lock, MessageSquareText, ShieldAlert } from 'lucide-react'
import Shield3D from '../components/Shield3D'
import ScanCard from '../components/ScanCard'
import ScanRow from '../components/ScanRow'
import { Container, EmptyState, ErrorState, SegmentedControl, Skeleton } from '../components/ui'
import { useAppState } from '../context/AppState'
import { useAuth } from '../context/AuthContext'
import { useApi } from '../hooks/useApi'
import { api } from '../services/api'

const PREVIEW_STATES = [
  { value: 'idle', label: 'Idle', dot: 'bg-brand-500' },
  { value: 'scanning', label: 'Scanning', dot: 'bg-cyan-accent' },
  { value: 'safe', label: 'Safe', dot: 'bg-safe-500' },
  { value: 'suspicious', label: 'Suspicious', dot: 'bg-warn-500' },
  { value: 'dangerous', label: 'Dangerous', dot: 'bg-danger-500' },
]

const MODULES = [
  {
    to: '/scan/message',
    icon: MessageSquareText,
    title: 'Scan Message',
    description: 'Detect scam messages, phishing attempts, suspicious requests, and impersonation.',
    cta: 'Scan Message',
    meta: 'SMS · WhatsApp',
  },
  {
    to: '/scan/url',
    icon: Link2,
    title: 'Scan URL',
    description: 'Analyze suspicious links and identify potentially malicious domains.',
    cta: 'Check URL',
    meta: 'Links · Domains',
  },
  {
    to: '/scan/payment',
    icon: CreditCard,
    title: 'Payment Risk',
    description: 'Analyze transaction patterns and identify unusual payment activity.',
    cta: 'Analyze Payment',
    meta: 'UPI · Cards',
  },
]

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
})

function RecentScans() {
  const { isAuthenticated, initializing } = useAuth()
  const { dataVersion } = useAppState()
  const { data, status, error, retry } = useApi((signal) => api.listScans({ limit: 5 }, { signal }), [dataVersion], { enabled: isAuthenticated })

  if (initializing) return <Skeleton className="mt-4 h-40" />
  if (!isAuthenticated) {
    return (
      <div className="mt-4">
        <EmptyState
          icon={History}
          title="Keep a private history of your scans"
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link to="/signup" className="btn btn-primary">Create free account</Link>
              <Link to="/login" className="btn btn-secondary">Sign in</Link>
            </div>
          }
        >
          Sign in to save results, revisit old scans and see your personal threat dashboard.
        </EmptyState>
      </div>
    )
  }
  if (status === 'loading') return <div className="mt-4 space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
  if (status === 'error' && !data) return <div className="mt-4"><ErrorState title="Couldn’t load recent scans" message={error} onRetry={retry} /></div>
  if (!data?.items?.length) {
    return (
      <div className="mt-4">
        <EmptyState icon={History} title="No scans yet" action={<Link to="/scan/message" className="btn btn-primary">Run your first scan</Link>}>
          Your scans will appear here once you run one.
        </EmptyState>
      </div>
    )
  }
  return (
    <ul className="mt-2 divide-y divide-ink-150">
      {data.items.map((s) => (
        <ScanRow key={s.id} scan={s} compact />
      ))}
    </ul>
  )
}

function HeroStats() {
  const { isAuthenticated } = useAuth()
  const { dataVersion } = useAppState()
  const { data } = useApi((signal) => api.getStats({ signal }), [dataVersion], { enabled: isAuthenticated })
  const items =
    isAuthenticated && data
      ? [
          [String(data.total), 'your scans'],
          [String(data.by_level.DANGEROUS), 'flagged dangerous'],
          [String(data.last_7_days), 'in the last 7 days'],
        ]
      : [
          ['3', 'scan types'],
          ['0–100', 'explained risk index'],
          ['1930', 'cyber-fraud helpline'],
        ]
  return (
    <motion.dl {...fadeUp(0.25)} className="mt-8 grid max-w-md grid-cols-3 gap-4 border-t border-ink-200 pt-6 sm:mt-10">
      {items.map(([k, v]) => (
        <div key={v}>
          <dt className="sr-only">{v}</dt>
          <dd className="font-mono text-xl font-medium text-ink-900 tabular">{k}</dd>
          <dd className="mt-0.5 text-xs text-ink-500">{v}</dd>
        </div>
      ))}
    </motion.dl>
  )
}

export default function Home() {
  const [preview, setPreview] = useState('idle')
  const { isAuthenticated } = useAuth()

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-ink-150">
        <div
          className="bg-grid pointer-events-none absolute inset-0"
          style={{ maskImage: 'radial-gradient(ellipse 55% 70% at 72% 50%, #000 30%, transparent 75%)', WebkitMaskImage: 'radial-gradient(ellipse 55% 70% at 72% 50%, #000 30%, transparent 75%)' }}
        />
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-2 px-4 pt-8 sm:gap-4 sm:px-6 sm:pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-6 lg:px-8 lg:pt-6">
          <div className="max-w-xl py-2 lg:py-16">
            <motion.div {...fadeUp(0)} className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-surface px-3 py-1 text-xs text-ink-600">
              <span className="h-1.5 w-1.5 rounded-full bg-safe-500" />
              Messages, links and UPI payments — checked in seconds
            </motion.div>
            <motion.h1 {...fadeUp(0.05)} className="mt-5 text-[40px] leading-[1.02] font-semibold tracking-[-0.035em] text-ink-900 sm:text-[56px] lg:text-[62px]">
              Detect Scams.
              <br />
              <span className="text-ink-400">Stay Protected.</span>
            </motion.h1>
            <motion.p {...fadeUp(0.1)} className="mt-5 max-w-md text-[17px] leading-relaxed text-ink-600">
              Explainable protection against suspicious messages, malicious links, and risky digital payments.
            </motion.p>
            <motion.div {...fadeUp(0.15)} className="mt-8 grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:items-center">
              <Link to="/scan/message" className="btn btn-primary h-12 px-5 text-[15px]">
                Start Scanning <ArrowRight size={16} />
              </Link>
              {isAuthenticated ? (
                <Link to="/dashboard" className="btn btn-secondary h-12 px-5 text-[15px]">
                  View dashboard
                </Link>
              ) : (
                <Link to="/signup" className="btn btn-secondary h-12 px-5 text-[15px]">
                  Create free account
                </Link>
              )}
            </motion.div>
            <motion.p {...fadeUp(0.2)} className="mt-5 flex items-center gap-2 text-sm text-ink-500">
              <Lock size={14} /> Your safety. Your control.
            </motion.p>

            <HeroStats />
          </div>

          <div className="relative">
            <div className="relative h-[300px] sm:h-[420px] lg:h-[540px]">
              <Shield3D status={preview} />
            </div>
            <div className="absolute top-3 left-0 font-mono text-[10px] tracking-wider text-ink-400 sm:top-6">
              LIVE SHIELD — CLICK TO SPIN
            </div>
            <div className="relative flex justify-center pb-8 lg:pb-10">
              <SegmentedControl label="Preview shield state" size="sm" wrap options={PREVIEW_STATES} value={preview} onChange={setPreview} />
            </div>
          </div>
        </div>
      </section>

      {/* Modules */}
      <Container className="pt-12">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="eyebrow mb-2">Scanners</div>
            <h2 className="text-2xl font-semibold tracking-[-0.02em]">What do you want to check?</h2>
          </div>
          <p className="max-w-sm text-sm text-ink-500">Each result explains which signals were found, so you can decide for yourself.</p>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {MODULES.map((m, i) => (
            <ScanCard key={m.to} {...m} index={i} />
          ))}
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
          <section className="card p-5 sm:p-6" aria-labelledby="recent-heading">
            <div className="flex items-center justify-between">
              <h2 id="recent-heading" className="text-base font-semibold">Recent scans</h2>
              {isAuthenticated && (
                <Link to="/history" className="inline-flex min-h-10 items-center text-sm font-medium text-brand-600 hover:text-brand-800">
                  View all
                </Link>
              )}
            </div>
            <RecentScans />
          </section>

          <section className="card flex flex-col p-5 sm:p-6" aria-labelledby="tip-heading">
            <div className="flex items-center gap-2">
              <ShieldAlert size={18} className="text-brand-600" />
              <span className="eyebrow">Safety tip</span>
            </div>
            <h2 id="tip-heading" className="mt-3 text-lg font-semibold tracking-[-0.01em]">You never need a PIN to receive money.</h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-600">
              If someone sends a UPI collect request or QR code and says it’s a refund or prize, approving it will send money out of your account — not in.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/learn" className="btn btn-secondary">
                More safety tips
              </Link>
              <Link to="/report" className="btn btn-ghost">
                Report a scam
              </Link>
            </div>
          </section>
        </div>
      </Container>
    </>
  )
}
