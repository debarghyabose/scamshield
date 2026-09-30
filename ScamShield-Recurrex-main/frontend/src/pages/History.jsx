import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, History as HistoryIcon, ScanSearch } from 'lucide-react'
import { Container, EmptyState, ErrorState, PageHeader, SegmentedControl, Skeleton, Spinner, StatusBadge } from '../components/ui'
import { TYPE_META } from '../components/ScanRow'
import { useAppState } from '../context/AppState'
import { useApi } from '../hooks/useApi'
import { api } from '../services/api'
import { formatDateTime, truncate } from '../utils/format'

const PAGE = 20

const TYPE_FILTERS = [
  { value: '', label: 'All types' },
  { value: 'message', label: 'Message' },
  { value: 'url', label: 'URL' },
  { value: 'payment', label: 'Payment' },
]
const LEVEL_FILTERS = [
  { value: '', label: 'Any risk' },
  { value: 'SAFE', label: 'Safe', dot: 'bg-safe-500' },
  { value: 'SUSPICIOUS', label: 'Suspicious', dot: 'bg-warn-500' },
  { value: 'DANGEROUS', label: 'Dangerous', dot: 'bg-danger-500' },
]

function TypeLabel({ type }) {
  const meta = TYPE_META[type] || TYPE_META.message
  const Icon = meta.icon
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium tracking-wide text-ink-600 uppercase">
      <Icon size={14} strokeWidth={1.8} aria-hidden="true" /> {meta.label}
    </span>
  )
}

/** Phones: one card per scan. */
function HistoryCards({ items }) {
  return (
    <ul className="space-y-3 md:hidden">
      {items.map((s) => (
        <li key={s.id}>
          <Link to={`/history/${s.id}`} className="card block p-4 transition-colors active:bg-ink-50">
            <div className="flex items-center justify-between gap-3">
              <TypeLabel type={s.scan_type} />
              <span className="font-mono text-[11px] text-ink-400">{formatDateTime(s.created_at)}</span>
            </div>
            <p className="mt-2 line-clamp-2 text-sm leading-snug text-ink-900">{s.input_text}</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <StatusBadge level={s.risk_level} />
                <span className="font-mono text-sm font-medium text-ink-900 tabular">{s.risk_score}</span>
              </div>
              <span className="flex items-center gap-1 text-xs font-medium text-ink-500">
                View <ChevronRight size={14} />
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}

/** Tablets and up: a table. */
function HistoryTable({ items }) {
  const navigate = useNavigate()
  return (
    <div className="card hidden overflow-hidden md:block">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-ink-150 bg-ink-50 text-xs text-ink-600">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">Date</th>
            <th scope="col" className="px-4 py-3 font-medium">Type</th>
            <th scope="col" className="px-4 py-3 font-medium">Risk level</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Score</th>
            <th scope="col" className="px-4 py-3 font-medium">Summary</th>
            <th scope="col" className="w-10 px-2 py-3"><span className="sr-only">Open</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-150">
          {items.map((s) => (
            <tr key={s.id} onClick={() => navigate(`/history/${s.id}`)} className="cursor-pointer transition-colors hover:bg-ink-50">
              <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-ink-600">{formatDateTime(s.created_at)}</td>
              <td className="px-4 py-3"><TypeLabel type={s.scan_type} /></td>
              <td className="px-4 py-3"><StatusBadge level={s.risk_level} /></td>
              <td className="px-4 py-3 text-right font-mono font-medium text-ink-900 tabular">{s.risk_score}</td>
              <td className="max-w-0 px-4 py-3">
                <Link to={`/history/${s.id}`} onClick={(e) => e.stopPropagation()} className="block truncate text-ink-900 hover:underline">
                  {truncate(s.input_text, 120)}
                </Link>
                {s.category && <span className="mt-0.5 block truncate text-xs text-ink-500">{s.category}</span>}
              </td>
              <td className="px-2 py-3 text-ink-300"><ChevronRight size={16} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function History() {
  const { dataVersion } = useAppState()
  const [scanType, setScanType] = useState('')
  const [level, setLevel] = useState('')
  const [extra, setExtra] = useState([])
  const [moreState, setMoreState] = useState({ loading: false, error: null })

  const first = useApi(
    (signal) => api.listScans({ limit: PAGE, offset: 0, scan_type: scanType, risk_level: level }, { signal }),
    [scanType, level, dataVersion],
  )
  useEffect(() => setExtra([]), [scanType, level, dataVersion])

  const items = [...(first.data?.items || []), ...extra]
  const total = first.data?.total ?? 0
  const filtered = Boolean(scanType || level)

  const loadMore = async () => {
    setMoreState({ loading: true, error: null })
    try {
      const page = await api.listScans({ limit: PAGE, offset: items.length, scan_type: scanType, risk_level: level })
      setExtra((prev) => [...prev, ...page.items])
      setMoreState({ loading: false, error: null })
    } catch (error) {
      setMoreState({ loading: false, error })
    }
  }

  return (
    <Container>
      <PageHeader
        eyebrow="Activity"
        title="Scan history"
        description="Every scan you’ve saved while signed in. Only you can see this list."
        actions={
          <Link to="/scan/message" className="btn btn-primary hidden sm:inline-flex">
            <ScanSearch size={16} /> New scan
          </Link>
        }
      />

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row">
          <SegmentedControl label="Filter by type" options={TYPE_FILTERS} value={scanType} onChange={setScanType} />
          <SegmentedControl label="Filter by risk" options={LEVEL_FILTERS} value={level} onChange={setLevel} />
        </div>
        {first.data && (
          <span className="font-mono text-xs text-ink-500">
            {total} scan{total === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <div className="mt-5">
        {first.status === 'loading' && (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 md:h-14" />
            ))}
          </div>
        )}
        {first.status === 'error' && !first.data && <ErrorState title="Couldn’t load your history" message={first.error} onRetry={first.retry} />}
        {first.data && items.length === 0 && (
          <EmptyState
            icon={HistoryIcon}
            title={filtered ? 'No scans match these filters' : 'No saved scans yet'}
            action={
              filtered ? (
                <button type="button" className="btn btn-secondary" onClick={() => { setScanType(''); setLevel('') }}>
                  Clear filters
                </button>
              ) : (
                <Link to="/scan/message" className="btn btn-primary">Run a scan</Link>
              )
            }
          >
            {filtered ? 'Try a different type or risk level.' : 'Scans you run while signed in are saved here automatically.'}
          </EmptyState>
        )}
        {items.length > 0 && (
          <>
            <HistoryCards items={items} />
            <HistoryTable items={items} />
            {moreState.error && (
              <div className="mt-4">
                <ErrorState title="Couldn’t load more scans" message={moreState.error} onRetry={loadMore} />
              </div>
            )}
            {items.length < total && !moreState.error && (
              <button type="button" onClick={loadMore} disabled={moreState.loading} className="btn btn-secondary mt-4 h-12 w-full">
                {moreState.loading && <Spinner />}
                {moreState.loading ? 'Loading…' : `Show more (${total - items.length} remaining)`}
              </button>
            )}
          </>
        )}
      </div>
    </Container>
  )
}
