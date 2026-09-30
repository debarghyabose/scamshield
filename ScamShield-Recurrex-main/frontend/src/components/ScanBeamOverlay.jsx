import { AnimatePresence, motion } from 'framer-motion'

/**
 * While a scan runs, a cyan beam sweeps down through the input it's reading —
 * visually tying the 3D shield's scan to the text being analysed.
 * Place inside a `relative` container. Purely decorative.
 */
export default function ScanBeamOverlay({ active }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-[inherit]"
        >
          <div className="absolute inset-0 bg-cyan-accent/[0.04]" />
          <div className="ss-beam absolute inset-x-0 h-10">
            <div className="h-full w-full bg-gradient-to-b from-transparent via-cyan-accent/20 to-cyan-accent/5" />
            <div className="h-[2px] w-full bg-cyan-accent shadow-[0_0_12px_2px_rgba(14,165,198,0.55)]" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
