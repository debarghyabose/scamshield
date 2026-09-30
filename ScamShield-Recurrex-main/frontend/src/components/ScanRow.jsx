import { Link } from 'react-router-dom'
import { ChevronRight, CreditCard, Link2, MessageSquareText } from 'lucide-react'
import { StatusBadge } from './ui'
import { timeAgo, truncate } from '../utils/format'

export const TYPE_META = {
  message: { icon: MessageSquareText, label: 'Message' },
  url: { icon: Link2, label: 'URL' },
  payment: { icon: CreditCard, label: 'Payment' },
}

/** One saved scan (from GET /api/scans) as a tappable row that opens the full result. */
export default function ScanRow({ scan, compact = false }) {
  const meta = TYPE_META[scan.scan_type] || TYPE_META.message
  const Icon = meta.icon
  return (
    <li>
      <Link
        to={`/history/${scan.id}`}
        className="group -mx-2 flex min-h-14 items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-ink-50 focus-visible:bg-ink-50"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ink-200 bg-surface text-ink-600" title={meta.label}>
          <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
          <span className="sr-only">{meta.label}</span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-ink-900">{truncate(scan.input_text, compact ? 60 : 90)}</p>
          <p className="mt-0.5 truncate text-xs text-ink-500">
            {scan.category || meta.label} · {timeAgo(scan.created_at)}
          </p>
        </div>
        <span className="hidden font-mono text-xs text-ink-500 tabular sm:inline">{scan.risk_score}</span>
        <StatusBadge level={scan.risk_level} />
        <ChevronRight size={16} className="hidden shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5 sm:block" aria-hidden="true" />
      </Link>
    </li>
  )
}
