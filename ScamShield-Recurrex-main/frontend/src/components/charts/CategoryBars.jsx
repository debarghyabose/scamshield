import { motion } from 'framer-motion'

/** Horizontal bars of the most common threat categories (single hue, direct labels). `rows` is [[category, count], …]. */
export default function CategoryBars({ rows = [], limit = 6 }) {
  const items = rows.slice(0, limit)
  const max = Math.max(1, ...items.map((r) => r[1]))

  if (!items.length) {
    return <p className="py-8 text-center text-sm text-ink-500">No threats in this selection.</p>
  }

  return (
    <ul className="space-y-3">
      {items.map(([cat, n], i) => (
        <li key={cat} className="group" title={`${cat}: ${n} scans`}>
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate text-ink-800">{cat}</span>
            <span className="font-mono text-ink-900 tabular">{n}</span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-ink-100">
            <motion.div
              className="h-2 rounded-full bg-brand-500 transition-colors group-hover:bg-brand-700"
              initial={{ width: 0 }}
              animate={{ width: `${(n / max) * 100}%` }}
              transition={{ duration: 0.7, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
