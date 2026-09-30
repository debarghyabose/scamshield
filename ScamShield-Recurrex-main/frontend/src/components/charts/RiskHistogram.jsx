import { useMemo, useState } from 'react'
import { useElementWidth } from '../../hooks/useElementWidth'
import ChartTooltip from './Tooltip'
import { AXIS_TEXT, GRID, LEVEL_COLORS, LEVEL_LABELS, niceMax, topRoundedRect } from './chartTheme'

const H = 200
const PAD = { top: 12, right: 8, bottom: 26, left: 30 }

const bucketLevel = (i) => (i < 3 ? 'SAFE' : i < 7 ? 'SUSPICIOUS' : 'DANGEROUS')

/**
 * Distribution of risk scores in 10-point buckets, coloured by the band each bucket falls in.
 * `counts` is an array of 10 numbers (scores 0–9, 10–19, … 90–100) from GET /api/scans/stats.
 */
export default function RiskHistogram({ counts = [] }) {
  const [ref, width] = useElementWidth(400)
  const [hover, setHover] = useState(null)
  const buckets = useMemo(
    () => Array.from({ length: 10 }, (_, i) => ({ i, from: i * 10, to: i === 9 ? 100 : i * 10 + 9, count: counts[i] || 0 })),
    [counts],
  )
  const max = niceMax(Math.max(1, ...buckets.map((b) => b.count)))
  const innerW = width - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const band = innerW / 10
  const barW = band - 2

  return (
    <div ref={ref} className="relative w-full">
      <svg width={width} height={H} className="block max-w-full" role="img" aria-label="Histogram of risk scores">
        {[0, max / 2, max].map((t) => (
          <g key={t} transform={`translate(0 ${PAD.top + innerH - (t / max) * innerH})`}>
            <line x1={PAD.left} x2={width - PAD.right} style={{ stroke: GRID }} strokeDasharray={t === 0 ? '' : '2 3'} />
            <text x={PAD.left - 8} dy="0.32em" textAnchor="end" fontSize="11" style={{ fill: AXIS_TEXT }}>
              {t}
            </text>
          </g>
        ))}
        {buckets.map((b) => {
          const h = (b.count / max) * innerH
          const x = PAD.left + band * b.i + 1
          const dim = hover !== null && hover !== b.i
          return (
            <g
              key={b.i}
              tabIndex={0}
              role="img"
              aria-label={`Scores ${b.from} to ${b.to}: ${b.count} scans`}
              onMouseEnter={() => setHover(b.i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(b.i)}
              onBlur={() => setHover(null)}
              className="outline-none"
            >
              <rect x={x - 1} y={PAD.top} width={band} height={innerH} style={{ fill: hover === b.i ? 'var(--color-ink-100)' : 'transparent' }} />
              <path d={topRoundedRect(x, PAD.top + innerH - h, barW, h)} fill={LEVEL_COLORS[bucketLevel(b.i)]} opacity={dim ? 0.45 : 1} />
            </g>
          )
        })}
        {[0, 30, 70, 100].map((v) => (
          <text key={v} x={PAD.left + (v / 100) * innerW} y={H - 8} textAnchor={v === 0 ? 'start' : v === 100 ? 'end' : 'middle'} fontSize="11" style={{ fill: AXIS_TEXT }}>
            {v}
          </text>
        ))}
      </svg>
      {hover !== null && (
        <ChartTooltip x={PAD.left + band * hover + band / 2} y={16} containerWidth={width}>
          <div className="font-medium text-ink-900">
            Score {buckets[hover].from}–{buckets[hover].to}
          </div>
          <div className="mt-1 flex items-center justify-between gap-4 text-ink-600">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm" style={{ background: LEVEL_COLORS[bucketLevel(hover)] }} />
              {LEVEL_LABELS[bucketLevel(hover)]} band
            </span>
            <span className="font-mono text-ink-900">{buckets[hover].count}</span>
          </div>
        </ChartTooltip>
      )}
    </div>
  )
}
