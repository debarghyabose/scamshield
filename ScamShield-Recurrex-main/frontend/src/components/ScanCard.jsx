import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { usePrefersReducedMotion } from '../hooks/useMediaQuery'

const MotionLink = motion.create(Link)

/** Large clickable module card with a subtle 3D tilt. The whole card is one link. */
export default function ScanCard({ to, icon: Icon, title, description, cta, index = 0, meta }) {
  const reduced = usePrefersReducedMotion()
  const ref = useRef(null)
  const rx = useMotionValue(0)
  const ry = useMotionValue(0)
  const rotateX = useSpring(rx, { stiffness: 220, damping: 22 })
  const rotateY = useSpring(ry, { stiffness: 220, damping: 22 })

  const onMove = (e) => {
    if (reduced || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    ry.set(px * 7)
    rx.set(-py * 7)
  }
  const onLeave = () => {
    rx.set(0)
    ry.set(0)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      style={{ perspective: 1000 }}
      className="h-full"
    >
      <MotionLink
        ref={ref}
        to={to}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        whileHover={reduced ? undefined : { y: -4 }}
        whileTap={{ scale: 0.99 }}
        className="group card relative flex h-full flex-col overflow-hidden p-6 transition-[box-shadow,border-color] duration-200 hover:border-ink-300 hover:shadow-[var(--shadow-raised)] focus-visible:border-brand-500"
      >
        <span className="absolute inset-x-0 top-0 h-[2px] origin-left scale-x-0 bg-brand-600 transition-transform duration-300 ease-[var(--ease-out-quint)] group-hover:scale-x-100 group-focus-visible:scale-x-100" />
        <div className="flex items-start justify-between">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-ink-200 bg-ink-50 text-ink-700 transition-colors duration-200 group-hover:border-brand-100 group-hover:bg-brand-50 group-hover:text-brand-700">
            <Icon size={20} strokeWidth={1.75} />
          </span>
          {meta && <span className="font-mono text-[11px] text-ink-400">{meta}</span>}
        </div>
        <h3 className="mt-5 text-lg font-semibold tracking-[-0.01em] text-ink-900">{title}</h3>
        <p className="mt-1.5 flex-1 text-sm leading-relaxed text-ink-600">{description}</p>
        <span className="mt-6 inline-flex items-center gap-2 self-start rounded-lg border border-ink-300 px-3.5 py-2 text-sm font-medium text-ink-800 transition-colors duration-200 group-hover:border-ink-900 group-hover:bg-ink-900 group-hover:text-surface">
          {cta}
          <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" />
        </span>
      </MotionLink>
    </motion.div>
  )
}
