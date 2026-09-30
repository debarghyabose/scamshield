import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, CircleAlert, CircleCheck, CircleX, CloudOff, Copy, Flag, History, Info, RotateCcw } from 'lucide-react'
import { useCountUp } from '../hooks/useCountUp'
import { DemoNotice, StatusBadge } from './ui'
import { formatDateTime } from '../utils/format'
import { DEFAULT_THRESHOLDS } from '../utils/constants'

const TONE = {
  SAFE: { stroke: '#0f9f6e', text: 'text-safe-700', bar: 'bg-safe-500', word: 'Safe' },
  SUSPICIOUS: { stroke: '#d98b06', text: 'text-warn-700', bar: 'bg-warn-500', word: 'Suspicious' },
  DANGEROUS: { stroke: '#d92d3a', text: 'text-danger-700', bar: 'bg-danger-500', word: 'Dangerous' },
}

const SEVERITY = {
  high: { cls: 'bg-danger-500', label: 'High' },
  medium: { cls: 'bg-warn-500', label: 'Medium' },
  low: { cls: 'bg-ink-400', label: 'Low' },
  info: { cls: 'bg-brand-400', label: 'Info' },
}

const CHECK_ICON = {
  pass: { icon: CircleCheck, cls: 'text-safe-600', label: 'No signal' },
  warn: { icon: CircleAlert, cls: 'text-warn-600', label: 'Caution' },
  fail: { icon: CircleX, cls: 'text-danger-600', label: 'Risk signal' },
  info: { icon: Info, cls: 'text-ink-400', label: 'Info' },
}

/** Semi-circular gauge with threshold ticks and a count-up score. */
function ScoreGauge({ score, level, thresholds }) {
  const shown = useCountUp(score)
  const tone = TONE[level]
  const R = 80
  const arc = `M ${100 - R} 100 A ${R} ${R} 0 0 1 ${100 + R} 100`
  const tick = (v) => {
    const a = Math.PI * (1 - v / 100)
    return { x1: 100 + Math.cos(a) * (R - 12), y1: 100 - Math.sin(a) * (R - 12), x2: 100 + Math.cos(a) * (R + 6), y2: 100 - Math.sin(a) * (R + 6) }
  }
  return (
    <div className="relative w-[200px] shrink-0">
      <svg viewBox="0 0 200 112" className="w-full" aria-hidden="true">
        <path d={arc} fill="none" style={{ stroke: 'var(--color-ink-150)' }} strokeWidth="12" strokeLinecap="round" />
        <motion.path
          d={arc}
          fill="none"
          stroke={tone.stroke}
          strokeWidth="12"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: Math.max(0.02, score / 100) }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
        {[thresholds.suspicious, thresholds.dangerous].map((v) => {
          const t = tick(v)
          return <line key={v} {...t} style={{ stroke: 'var(--color-surface)' }} strokeWidth="2.5" />
        })}
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
        <div className="flex items-baseline gap-0.5">
          <span className={`font-mono text-[44px] leading-none font-medium tracking-tight tabular ${tone.text}`}>{shown}</span>
          <span className="font-mono text-sm text-ink-400">/100</span>
        </div>
      </div>
    </div>
  )
}

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
}

function SaveStatus({ result, signedIn }) {
  if (result.saved && result.id) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-ink-600">
        <History size={13} className="shrink-0" />
        Saved to your history.
        <Link to={`/history/${result.id}`} className="font-medium text-brand-700 hover:underline">
          View
        </Link>
      </p>
    )
  }
  if (result.save_error) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-warn-700">
        <CloudOff size={13} className="shrink-0" /> {result.save_error}
      </p>
    )
  }
  if (!signedIn && !result.saved) {
    return (
      <p className="text-xs text-ink-600">
        <Link to="/login" className="font-medium text-brand-700 hover:underline">
          Sign in
        </Link>{' '}
        to keep a private history of your scans.
      </p>
    )
  }
  return null
}

export default function RiskResult({ result, onScanAgain, reportPrefill, signedIn = false, showActions = true, showSaveStatus = true }) {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const tone = TONE[result.risk_level]
  const thresholds = result.thresholds || DEFAULT_THRESHOLDS
  const indicators = result.indicators?.length
    ? result.indicators
    : result.reasons.map((r) => ({ label: r, severity: result.risk_level === 'SAFE' ? 'info' : 'medium' }))

  const copySummary = async () => {
    const text = [
      `ScamShield result: ${tone.word} (risk score ${result.risk_score}/100${result.is_demo ? ', demo' : ''})`,
      result.summary,
      '',
      'Indicators:',
      ...result.reasons.map((r) => `- ${r}`),
      '',
      'Recommended:',
      ...result.recommendations.map((r) => `- ${r}`),
    ].join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <motion.section
      aria-labelledby="result-heading"
      variants={{ show: { transition: { staggerChildren: 0.07 } } }}
      initial="hidden"
      animate="show"
      className="card ss-reveal overflow-hidden"
      style={{ '--reveal-color': `${tone.stroke}55` }}
    >
      <div className={`h-[3px] ${tone.bar}`} />
      {result.is_demo && (
        <div className="px-5 pt-5 sm:px-6">
          <DemoNotice>Demonstration result. Generated by transparent local rules, not a trained AI model.</DemoNotice>
        </div>
      )}

      {/* Header */}
      <motion.div variants={item} className="flex flex-col gap-6 p-5 sm:flex-row sm:items-center sm:p-6">
        <ScoreGauge score={result.risk_score} level={result.risk_level} thresholds={thresholds} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge level={result.risk_level} size="lg" />
            {result.category && <span className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-700">{result.category}</span>}
          </div>
          <h2 id="result-heading" className={`mt-3 text-2xl font-semibold tracking-[-0.02em] ${tone.text}`}>
            {result.risk_level === 'DANGEROUS' ? 'High risk — don’t engage' : result.risk_level === 'SUSPICIOUS' ? 'Proceed with caution' : 'No major risk signals'}
          </h2>
          <p className="mt-1.5 text-[15px] leading-relaxed text-ink-700">{result.summary}</p>
          <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-ink-500">
            <Info size={13} className="mt-px shrink-0" />
            Risk score is a 0–100 index from weighted rules ({thresholds.suspicious}+ suspicious, {thresholds.dangerous}+ dangerous). It is not a probability or a confidence percentage.
          </p>
        </div>
      </motion.div>

      <div className="grid border-t border-ink-150 md:grid-cols-2">
        {/* Indicators */}
        <motion.div variants={item} className="border-ink-150 p-5 sm:p-6 md:border-r">
          <h3 className="eyebrow">Detected indicators</h3>
          {indicators.length ? (
            <ul className="mt-3 space-y-3">
              {indicators.map((ind, i) => (
                <li key={i} className="flex gap-3">
                  <span className={`mt-[7px] h-2 w-2 shrink-0 rounded-full ${SEVERITY[ind.severity]?.cls || 'bg-ink-400'}`} title={`${SEVERITY[ind.severity]?.label} severity`} />
                  <div>
                    <p className="text-sm font-medium text-ink-900">
                      {ind.label}
                      <span className="sr-only"> ({SEVERITY[ind.severity]?.label} severity)</span>
                    </p>
                    {ind.detail && <p className="mt-0.5 text-[13px] leading-relaxed text-ink-600">{ind.detail}</p>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-ink-600">No risk indicators were triggered.</p>
          )}
        </motion.div>

        {/* Recommendations */}
        <motion.div variants={item} className="border-t border-ink-150 p-5 sm:p-6 md:border-t-0">
          <h3 className="eyebrow">Recommended next steps</h3>
          <ol className="mt-3 space-y-2.5">
            {result.recommendations.map((r, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed text-ink-800">
                <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-100 font-mono text-[11px] text-ink-600">
                  {i + 1}
                </span>
                {r}
              </li>
            ))}
          </ol>
        </motion.div>
      </div>

      {/* URL checks */}
      {result.checks?.length > 0 && (
        <motion.div variants={item} className="border-t border-ink-150 p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="eyebrow">Link signals</h3>
            <span className="text-xs text-ink-500">Signals indicate risk; none of them alone proves a site is malicious.</span>
          </div>
          <ul className="mt-3 divide-y divide-ink-150 rounded-lg border border-ink-200">
            {result.checks.map((c) => {
              const ci = CHECK_ICON[c.status]
              const Icon = ci.icon
              return (
                <li key={c.id} className="flex gap-3 px-4 py-3">
                  <Icon size={18} className={`mt-px shrink-0 ${ci.cls}`} aria-label={ci.label} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-900">{c.label}</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed break-words text-ink-600">{c.detail}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        </motion.div>
      )}

      {/* Actions */}
      <motion.div variants={item} className="flex flex-col gap-3 border-t border-ink-150 bg-ink-50 px-5 py-4 sm:px-6">
        {showActions && (
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {onScanAgain && (
              <button type="button" onClick={onScanAgain} className="btn btn-secondary">
                <RotateCcw size={15} /> Scan again
              </button>
            )}
            <button type="button" onClick={() => navigate('/report', { state: { prefill: reportPrefill } })} className="btn btn-primary">
              <Flag size={15} /> Report scam
            </button>
            <button type="button" onClick={copySummary} className="btn btn-ghost col-span-2 sm:col-span-1" aria-live="polite">
              {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy summary'}
            </button>
          </div>
        )}
        {showSaveStatus && <SaveStatus result={result} signedIn={signedIn} />}
        <p className="font-mono text-[11px] text-ink-400">
          {result.is_demo ? 'DEMO · ' : ''}
          {result.engine} · {formatDateTime(result.scanned_at)}
        </p>
      </motion.div>
    </motion.section>
  )
}
