import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Loader2 } from 'lucide-react'

/** Step-by-step scanning progress shown while the API call is running. */
export default function LoadingAnimation({ steps, title = 'Scanning' }) {
  const [active, setActive] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setActive((a) => Math.min(a + 1, steps.length - 1)), 420)
    return () => clearInterval(id)
  }, [steps.length])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="card overflow-hidden"
      role="status"
      aria-live="polite"
    >
      <div className="relative h-1 overflow-hidden bg-ink-100">
        <motion.div
          className="absolute inset-y-0 left-0 bg-cyan-accent"
          initial={{ width: '4%' }}
          animate={{ width: '92%' }}
          transition={{ duration: 2.2, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <div className="p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-ink-900">
          <Loader2 size={16} className="animate-spin text-cyan-accent" />
          {title}…
        </div>
        <ol className="mt-4 space-y-2.5">
          {steps.map((s, i) => (
            <li key={s} className="flex items-center gap-2.5 text-[13px]">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${
                  i < active ? 'border-ink-900 bg-ink-900 text-surface' : i === active ? 'border-cyan-accent' : 'border-ink-200'
                }`}
              >
                {i < active ? <Check size={11} strokeWidth={3} /> : i === active ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-accent" /> : null}
              </span>
              <span className={i <= active ? 'text-ink-800' : 'text-ink-400'}>{s}</span>
            </li>
          ))}
        </ol>
      </div>
    </motion.div>
  )
}
