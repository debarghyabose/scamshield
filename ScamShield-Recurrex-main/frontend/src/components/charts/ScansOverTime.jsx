import { useMemo, useState } from 'react'
import { useElementWidth } from '../../hooks/useElementWidth'
import ChartTooltip from './Tooltip'
import { AXIS_TEXT, GRID, LEVEL_COLORS, LEVEL_LABELS, LEVEL_ORDER, niceMax, topRoundedRect } from './chartTheme'

const H = 220
const PAD = { top: 12, right: 8, bottom: 26, left: 30 }
const GAP = 2

/** Stacked daily columns by risk level, with hover/focus tooltips. */
export default function ScansOverTime({ data, levels }) {
  const [ref, width] = useElementWidth()
  const [hover, setHover] = useState(null)
  const innerW = width - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const shown = LEVEL_ORDER.filter((l) => levels.includes(l))
  const max = useMemo(() => niceMax(Math.max(1, ...data.map((d) => shown.reduce((s, l) => s + d[l], 0)))), [data, shown])
  const band = innerW / data.length
  const barW = Math.max(6, Math.min(28, band * 0.62))
  const y = (v) => (v / max) * innerH
  const ticks = [0, max / 2, max]
  const labelEvery = width < 480 ? 4 : 2

  return (
    <div ref={ref} className="relative w-full">
      <svg width={width} height={H} className="block max-w-full" role="img" aria-label="Scans per day for the last 14 days, stacked by risk level">
        {ticks.map((t) => (
          <g key={t} transform={`translate(0 ${PAD.top + innerH - y(t)})`}>
            <line x1={PAD.left} x2={width - PAD.right} style={{ stroke: GRID }} strokeDasharray={t === 0 ? '' : '2 3'} />
            <text x={PAD.left - 8} dy="0.32em" textAnchor="end" fontSize="11" style={{ fill: AXIS_TEXT }} className="tabular">
              {t}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = PAD.left + band * i + band / 2
          const x = cx - barW / 2
          let acc = 0
          const segs = shown.filter((l) => d[l] > 0)
          const dim = hover !== null && hover !== i
          return (
            <g
              key={d.key}
              tabIndex={0}
              role="img"
              aria-label={`${d.label}: ${shown.map((l) => `${d[l]} ${LEVEL_LABELS[l].toLowerCase()}`).join(', ')}`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className="outline-none"
            >
              <rect x={PAD.left + band * i} y={PAD.top} width={band} height={innerH} style={{ fill: hover === i ? 'var(--color-ink-100)' : 'transparent' }} />
              {segs.map((l, si) => {
                const h = y(d[l])
                const top = PAD.top + innerH - acc - h
                acc += h
                const isTop = si === segs.length - 1
                const gapH = Math.max(0, h - (si > 0 ? GAP : 0))
                return isTop ? (
                  <path key={l} d={topRoundedRect(x, top, barW, gapH)} fill={LEVEL_COLORS[l]} opacity={dim ? 0.45 : 1} />
                ) : (
                  <rect key={l} x={x} y={top} width={barW} height={gapH} fill={LEVEL_COLORS[l]} opacity={dim ? 0.45 : 1} />
                )
              })}
              {(i % labelEvery === (data.length - 1) % labelEvery) && (
                <text x={cx} y={H - 8} textAnchor="middle" fontSize="11" style={{ fill: AXIS_TEXT }}>
                  {d.short}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      {hover !== null && data[hover] && (
        <ChartTooltip x={PAD.left + band * hover + band / 2} y={20} containerWidth={width}>
          <div className="mb-1.5 font-medium text-ink-900">{data[hover].label}</div>
          {shown
            .slice()
            .reverse()
            .map((l) => (
              <div key={l} className="flex items-center justify-between gap-4 py-0.5 text-ink-600">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm" style={{ background: LEVEL_COLORS[l] }} />
                  {LEVEL_LABELS[l]}
                </span>
                <span className="font-mono text-ink-900 tabular">{data[hover][l]}</span>
              </div>
            ))}
          <div className="mt-1.5 flex justify-between border-t border-ink-150 pt-1.5 text-ink-600">
            <span>Total</span>
            <span className="font-mono text-ink-900 tabular">{shown.reduce((s, l) => s + data[hover][l], 0)}</span>
          </div>
        </ChartTooltip>
      )}
    </div>
  )
}
