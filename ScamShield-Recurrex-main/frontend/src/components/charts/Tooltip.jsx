export default function ChartTooltip({ x, y, containerWidth, children }) {
  const flip = x > containerWidth - 180
  return (
    <div
      className="pointer-events-none absolute z-10 min-w-[150px] rounded-lg border border-ink-200 bg-surface px-3 py-2.5 text-xs shadow-[var(--shadow-pop)]"
      style={{ left: flip ? undefined : x + 12, right: flip ? containerWidth - x + 12 : undefined, top: Math.max(0, y) }}
      role="presentation"
    >
      {children}
    </div>
  )
}
