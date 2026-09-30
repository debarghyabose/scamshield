import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Trash2 } from 'lucide-react'
import ScannerLayout from '../components/ScannerLayout'
import RiskResult from '../components/RiskResult'
import { TYPE_META } from '../components/ScanRow'
import { Container, ErrorState, Modal, Skeleton, Spinner } from '../components/ui'
import { useAppState } from '../context/AppState'
import { useApi } from '../hooks/useApi'
import { api } from '../services/api'
import { formatDateTime, LEVEL_TO_SHIELD } from '../utils/format'

function reportPrefill(scan) {
  if (scan.scan_type === 'url') return { scam_type: 'Phishing link', url: scan.input_text }
  if (scan.scan_type === 'payment') return { scam_type: 'UPI collect request', content: `Payment request: ${scan.input_text}` }
  return { scam_type: scan.category, content: scan.input_text }
}

export default function ScanDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { invalidate } = useAppState()
  const { data: scan, status, error, retry } = useApi((signal) => api.getScan(id, { signal }), [id])
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  const remove = async () => {
    setDeleting(true)
    setDeleteError(null)
    try {
      await api.deleteScan(id)
      invalidate()
      navigate('/history', { replace: true })
    } catch (e) {
      setDeleteError(e)
      setDeleting(false)
    }
  }

  const meta = scan ? TYPE_META[scan.scan_type] || TYPE_META.message : null
  const Icon = meta?.icon

  return (
    <Container>
      <Link to="/history" className="-ml-1 inline-flex min-h-11 items-center gap-1.5 rounded-md px-1 text-sm font-medium text-ink-600 hover:text-ink-900">
        <ArrowLeft size={16} /> Scan history
      </Link>

      {status === 'loading' && (
        <div className="mt-4 space-y-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-80" />
        </div>
      )}
      {status === 'error' && (
        <div className="mt-4">
          <ErrorState
            title={error?.status === 404 ? 'Scan not found' : 'Couldn’t load this scan'}
            message={error?.status === 404 ? 'It may have been deleted, or it belongs to a different account.' : error}
            onRetry={error?.status === 404 ? undefined : retry}
          />
        </div>
      )}

      {scan && (
        <div className="mt-3">
          <ScannerLayout status={LEVEL_TO_SHIELD[scan.risk_level]}>
            <section className="card p-5 sm:p-6" aria-labelledby="input-heading">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h1 id="input-heading" className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                  <Icon size={16} strokeWidth={1.8} /> {meta.label} scan
                </h1>
                <span className="font-mono text-xs text-ink-500">{formatDateTime(scan.scanned_at)}</span>
              </div>
              <p className="mt-3 rounded-lg border border-ink-150 bg-ink-50 px-3.5 py-3 font-mono text-[13px] leading-relaxed break-words whitespace-pre-wrap text-ink-800">
                {scan.input_text}
              </p>
            </section>

            <RiskResult result={scan} signedIn showSaveStatus={false} reportPrefill={reportPrefill(scan)} />

            <div className="flex justify-end">
              <button type="button" onClick={() => setConfirming(true)} className="btn btn-ghost text-danger-600 hover:bg-danger-50">
                <Trash2 size={15} /> Delete this scan
              </button>
            </div>
          </ScannerLayout>
        </div>
      )}

      <Modal open={confirming} onClose={() => !deleting && setConfirming(false)} title="Delete this scan?" labelledBy="delete-title">
        <p className="text-[15px] leading-relaxed text-ink-700">It will be permanently removed from your history and dashboard.</p>
        {deleteError && <p className="mt-3 text-sm text-danger-600" role="alert">{deleteError.message}</p>}
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button type="button" className="btn btn-secondary" onClick={() => setConfirming(false)} disabled={deleting}>
            Cancel
          </button>
          <button type="button" className="btn bg-danger-500 text-white hover:bg-danger-600" onClick={remove} disabled={deleting}>
            {deleting && <Spinner />} Delete
          </button>
        </div>
      </Modal>
    </Container>
  )
}
