import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Flag,
  History,
  Link2,
  MessageSquareText,
  OctagonAlert,
  ScanSearch,
} from 'lucide-react'
import { Container, EmptyState, ErrorState, SegmentedControl, Skeleton } from '../components/ui'
import ScanRow from '../components/ScanRow'
import ScansOverTime from '../components/charts/ScansOverTime'
import RiskHistogram from '../components/charts/RiskHistogram'
import CategoryBars from '../components/charts/CategoryBars'
import { LEVEL_COLORS, LEVEL_LABELS, LEVEL_ORDER } from '../components/charts/chartTheme'
import { useAppState } from '../context/AppState'
import { displayName, useAuth } from '../context/AuthContext'
import { useApi } from '../hooks/useApi'
import { useCountUp } from '../hooks/useCountUp'
import { api } from '../services/api'

const QUICK_ACTIONS = [
  { to: '/scan/message', label: 'Scan Message', icon: MessageSquareText },
  { to: '/scan/url', label: 'Scan URL', icon: Link2 },
  { to: '/scan/payment', label: 'Check Payment', icon: CreditCard },
  { to: '/report', label: 'Report Scam', icon: Flag },
]

function Kpi({ label, value, sub, icon: Icon, tone, index }) {
  const shown = useCountUp(value, { delay: index * 0.05 })
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      className="card p-4 sm:p-5"
    >
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-ink-600">{label}</span>
        <Icon size={16} className={tone} aria-hidden="true" />
      </div>
      <div className="mt-3 font-mono text-[28px] leading-none font-medium tracking-tight text-ink-900 tabular">{shown}</div>
      {sub && <div className="mt-2 text-xs text-ink-500">{sub}</div>}
    </motion.div>
  )
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-600">
      {LEVEL_ORDER.map((l) => (
        <span key={l} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: LEVEL_COLORS[l] }} />
          {LEVEL_LABELS[l]}
        </span>
      ))}
    </div>
  )
}

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

function DashboardSkeleton() {
  return (
    <div className="mt-6 space-y-4" aria-hidden="true">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[108px]" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  )
}

export default function Dashboard() {
  const { profile, user } = useAuth()
  const { dataVersion } = useAppState()
  const stats = useApi((signal) => api.getStats({ signal }), [dataVersion])
  const recent = useApi((signal) => api.listScans({ limit: 6 }, { signal }), [dataVersion])
  const [view, setView] = useState('chart')

  const s = stats.data
  const total = s?.total || 0
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0)
  const daily = useMemo(
    () =>
      (s?.daily || []).map((d) => {
        const date = new Date(`${d.date}T00:00:00`)
        return {
          ...d,
          key: d.date,
          short: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
          label: date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
        }
      }),
    [s],
  )
  const delta = s ? s.last_7_days - s.previous_7_days : 0

  return (
    <Container>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow mb-2">{greeting()}</p>
          <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.02em] text-ink-900 sm:text-[32px]">
            Hello, {displayName(profile, user)}
          </h1>
          <p className="mt-1.5 text-[15px] text-ink-600">Your digital safety overview</p>
        </div>
        <Link to="/scan/message" className="btn btn-primary hidden sm:inline-flex">
          <ScanSearch size={16} /> New scan
        </Link>
      </div>

      {/* Quick actions */}
      <nav aria-label="Quick actions" className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {QUICK_ACTIONS.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="group card flex min-h-14 items-center gap-3 px-3.5 py-3 transition-colors hover:border-ink-300 hover:bg-ink-50 sm:px-4"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ink-200 bg-ink-50 text-ink-700 group-hover:border-brand-100 group-hover:bg-brand-50 group-hover:text-brand-700">
              <Icon size={17} strokeWidth={1.8} />
            </span>
            <span className="text-[13px] leading-tight font-medium text-ink-900 sm:text-sm">{label}</span>
          </Link>
        ))}
      </nav>

      {stats.status === 'loading' && <DashboardSkeleton />}
      {stats.status === 'error' && !s && (
        <div className="mt-6">
          <ErrorState title="Couldn’t load your dashboard" message={stats.error} onRetry={stats.retry} />
        </div>
      )}

      {s && total === 0 && (
        <div className="mt-6">
          <EmptyState icon={Activity} title="No scans yet" action={<Link to="/scan/message" className="btn btn-primary">Run your first scan</Link>}>
            Once you scan a message, link or payment while signed in, your personal statistics appear here.
          </EmptyState>
        </div>
      )}

      {s && total > 0 && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <Kpi
              index={0}
              label="Total scans"
              value={total}
              sub={`${delta >= 0 ? '+' : ''}${delta} vs previous 7 days`}
              icon={Activity}
              tone="text-ink-500"
            />
            <Kpi index={1} label="Safe" value={s.by_level.SAFE} sub={`${pct(s.by_level.SAFE)}% of scans`} icon={CheckCircle2} tone="text-safe-600" />
            <Kpi index={2} label="Suspicious" value={s.by_level.SUSPICIOUS} sub={`${pct(s.by_level.SUSPICIOUS)}% of scans`} icon={AlertTriangle} tone="text-warn-600" />
            <Kpi index={3} label="Dangerous" value={s.by_level.DANGEROUS} sub={`${pct(s.by_level.DANGEROUS)}% of scans`} icon={OctagonAlert} tone="text-danger-600" />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <section className="card min-w-0 p-5 lg:col-span-2" aria-labelledby="daily-heading">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 id="daily-heading" className="text-sm font-semibold">
                    Scans per day
                  </h2>
                  <p className="mt-0.5 text-xs text-ink-500">Last 14 days</p>
                </div>
                <SegmentedControl
                  label="Chart view"
                  size="sm"
                  options={[
                    { value: 'chart', label: 'Chart' },
                    { value: 'table', label: 'Table' },
                  ]}
                  value={view}
                  onChange={setView}
                />
              </div>
              <div className="mt-3">
                <Legend />
              </div>
              <div className="mt-3">
                {view === 'chart' ? (
                  <ScansOverTime data={daily} levels={LEVEL_ORDER} />
                ) : (
                  <div className="max-h-[240px] overflow-auto rounded-lg border border-ink-200">
                    <table className="w-full text-left text-[13px]">
                      <thead className="sticky top-0 bg-ink-50 text-xs text-ink-600">
                        <tr>
                          <th className="px-3 py-2 font-medium">Day</th>
                          {LEVEL_ORDER.map((l) => (
                            <th key={l} className="px-3 py-2 text-right font-medium">
                              {LEVEL_LABELS[l]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-150 font-mono tabular">
                        {daily
                          .slice()
                          .reverse()
                          .map((d) => (
                            <tr key={d.key}>
                              <td className="px-3 py-2 font-sans text-ink-800">{d.label}</td>
                              {LEVEL_ORDER.map((l) => (
                                <td key={l} className="px-3 py-2 text-right text-ink-900">
                                  {d[l]}
                                </td>
                              ))}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>

            <section className="card min-w-0 p-5" aria-labelledby="dist-heading">
              <h2 id="dist-heading" className="text-sm font-semibold">
                Threat distribution
              </h2>
              <p className="mt-0.5 text-xs text-ink-500">Risk scores are rule-based indices, not probabilities</p>
              <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-ink-100" role="img" aria-label={LEVEL_ORDER.map((l) => `${LEVEL_LABELS[l]} ${pct(s.by_level[l])}%`).join(', ')}>
                {LEVEL_ORDER.map((l) => (
                  <div key={l} style={{ width: `${pct(s.by_level[l])}%`, background: LEVEL_COLORS[l] }} className="border-r-2 border-surface last:border-0" />
                ))}
              </div>
              <div className="mt-2 flex justify-between text-xs text-ink-600">
                {LEVEL_ORDER.map((l) => (
                  <span key={l} className="flex items-center gap-1">
                    {LEVEL_LABELS[l]} <span className="font-mono text-ink-900">{pct(s.by_level[l])}%</span>
                  </span>
                ))}
              </div>
              <div className="mt-5">
                <RiskHistogram counts={s.histogram} />
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-ink-150 pt-3 text-center">
                {[
                  ['message', 'Messages'],
                  ['url', 'Links'],
                  ['payment', 'Payments'],
                ].map(([k, label]) => (
                  <div key={k}>
                    <dd className="font-mono text-base font-medium text-ink-900">{s.by_type[k] || 0}</dd>
                    <dt className="text-[11px] text-ink-500">{label}</dt>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        </>
      )}

      {(s ? total > 0 : stats.status !== 'loading') && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <section className="card min-w-0 p-5 lg:col-span-2" aria-labelledby="recent-heading">
            <div className="flex items-center justify-between">
              <h2 id="recent-heading" className="text-sm font-semibold">
                Recent scans
              </h2>
              <Link to="/history" className="inline-flex min-h-10 items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-800">
                Full history <ArrowRight size={14} />
              </Link>
            </div>
            {recent.status === 'loading' && (
              <div className="mt-3 space-y-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            )}
            {recent.status === 'error' && !recent.data && (
              <div className="mt-3">
                <ErrorState title="Couldn’t load recent scans" message={recent.error} onRetry={recent.retry} />
              </div>
            )}
            {recent.data && recent.data.items.length === 0 && (
              <div className="mt-3">
                <EmptyState icon={History} title="No scans yet">Scans you save appear here.</EmptyState>
              </div>
            )}
            {recent.data && recent.data.items.length > 0 && (
              <ul className="mt-1 divide-y divide-ink-150">
                {recent.data.items.map((scan) => (
                  <ScanRow key={scan.id} scan={scan} />
                ))}
              </ul>
            )}
          </section>

          <section className="card min-w-0 p-5" aria-labelledby="cat-heading">
            <h2 id="cat-heading" className="text-sm font-semibold">
              Common threat categories
            </h2>
            <p className="mt-0.5 mb-4 text-xs text-ink-500">Your suspicious and dangerous scans</p>
            <CategoryBars rows={s?.top_categories || []} />
          </section>
        </div>
      )}
    </Container>
  )
}
