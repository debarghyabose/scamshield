import { revealResult } from '../utils/format'
import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, ClipboardPaste, MessageSquareText, ScanSearch, X } from 'lucide-react'
import ScannerLayout, { CheckList } from '../components/ScannerLayout'
import LoadingAnimation from '../components/LoadingAnimation'
import RiskResult from '../components/RiskResult'
import { Container, EmptyState, ErrorState, PageHeader } from '../components/ui'
import { useScan } from '../hooks/useScan'
import { api } from '../services/api'
import { EXAMPLE_MESSAGES } from '../data/examples'
import ScanTypeTabs from '../components/ScanTypeTabs'
import ScanBeamOverlay from '../components/ScanBeamOverlay'
import SaveOption from '../components/SaveOption'
import { useAuth } from '../context/AuthContext'

const MAX = 2000
const STEPS = ['Normalising text', 'Matching scam-language patterns', 'Checking links and numbers', 'Scoring risk']

export default function MessageScanner() {
  const [text, setText] = useState('')
  const [touched, setTouched] = useState(false)
  const [notice, setNotice] = useState('')
  const [save, setSave] = useState(true)
  const { isAuthenticated } = useAuth()
  const inputRef = useRef(null)
  const resultRef = useRef(null)
  const { phase, result, error, run, reset, shieldStatus } = useScan(api.scanMessage, 'message')

  const empty = !text.trim()
  const showError = touched && empty

  const submit = (e) => {
    e?.preventDefault()
    setTouched(true)
    if (empty) {
      inputRef.current?.focus()
      return
    }
    run({ text: text.trim(), save }).then(() => revealResult(resultRef))
  }

  const paste = async () => {
    setNotice('')
    try {
      const clip = await navigator.clipboard.readText()
      if (!clip.trim()) {
        setNotice('Your clipboard is empty.')
        return
      }
      setText(clip.slice(0, MAX))
      reset()
    } catch {
      setNotice('Clipboard access was blocked by the browser. Press Ctrl+V (⌘V on Mac) in the box instead.')
    }
    inputRef.current?.focus()
  }

  const clear = () => {
    setText('')
    setTouched(false)
    setNotice('')
    reset()
    inputRef.current?.focus()
  }

  const again = () => {
    reset()
    inputRef.current?.focus()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <Container>
      <PageHeader
        eyebrow="Scanner 01 · Message"
        title="Scan a message"
        description="Paste an SMS, WhatsApp or email message. ScamShield looks for the language, links and requests scammers typically use."
      />

      <div className="mt-6">
        <ScanTypeTabs />
      </div>

      <div className="mt-6">
        <ScannerLayout
          status={shieldStatus}
          aside={
            <CheckList
              items={['Prize, reward and lottery language', 'Urgency and pressure tactics', 'Requests for OTP, PIN or KYC details', 'Bank or authority impersonation', 'Links inside the message']}
            />
          }
        >
          <form onSubmit={submit} className="card p-5 sm:p-6" noValidate>
            <label htmlFor="message" className="field-label">
              Message text
            </label>
            <div className={`relative rounded-lg border bg-surface transition-[border-color,box-shadow] focus-within:border-brand-500 focus-within:shadow-[0_0_0_3px_rgba(47,107,255,0.16)] ${showError ? 'border-danger-500' : 'border-ink-300 hover:border-ink-400'}`}>
              <textarea
                id="message"
                ref={inputRef}
                value={text}
                onChange={(e) => {
                  setText(e.target.value.slice(0, MAX))
                  if (phase !== 'scanning' && phase !== 'idle') reset()
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e)
                }}
                rows={6}
                readOnly={phase === 'scanning'}
                placeholder="e.g. Congratulations! You have won ₹50,000. Click this link immediately to claim your reward."
                aria-invalid={showError}
                aria-describedby="message-help message-count"
                className="block w-full resize-y rounded-t-lg bg-transparent px-3.5 py-3 text-[15px] leading-relaxed text-ink-900 outline-none placeholder:text-ink-400"
              />
              <ScanBeamOverlay active={phase === 'scanning'} />
              <div className="flex items-center gap-1 border-t border-ink-150 px-2 py-1.5">
                <button type="button" onClick={paste} className="inline-flex h-10 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-ink-600 hover:bg-ink-100 hover:text-ink-900">
                  <ClipboardPaste size={15} /> Paste
                </button>
                <button
                  type="button"
                  onClick={clear}
                  disabled={!text}
                  className="inline-flex h-10 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-ink-600 hover:bg-ink-100 hover:text-ink-900 disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <X size={15} /> Clear
                </button>
                <span id="message-count" className={`ml-auto pr-1.5 font-mono text-[11px] tabular ${text.length > MAX * 0.9 ? 'text-warn-600' : 'text-ink-400'}`}>
                  {text.length.toLocaleString('en-IN')} / {MAX.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
            {showError ? (
              <p className="field-error" role="alert">
                <AlertCircle size={13} /> Paste or type a message to scan.
              </p>
            ) : (
              <p id="message-help" className="field-hint">
                Remove personal details like account numbers before scanning.
              </p>
            )}
            {notice && <p className="field-hint text-warn-700">{notice}</p>}

            <div className="mt-5">
              <span className="text-xs font-medium text-ink-500">Try an example</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {EXAMPLE_MESSAGES.map((ex) => (
                  <button
                    key={ex.label}
                    type="button"
                    onClick={() => {
                      setText(ex.text)
                      setTouched(false)
                      reset()
                    }}
                    className={`min-h-9 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      text === ex.text ? 'border-ink-900 bg-ink-900 text-surface' : 'border-ink-200 bg-surface text-ink-700 hover:border-ink-400'
                    }`}
                  >
                    {ex.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <SaveOption save={save} onChange={setSave} />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-ink-150 pt-5">
              <button type="submit" className="btn btn-primary h-12 w-full px-5 text-[15px] sm:w-auto" disabled={phase === 'scanning'}>
                <ScanSearch size={16} /> {phase === 'scanning' ? 'Analyzing…' : 'Analyze Message'}
              </button>
              <span className="hidden items-center gap-1 text-xs text-ink-400 sm:flex">
                <kbd className="kbd">Ctrl</kbd>
                <kbd className="kbd">↵</kbd>
              </span>
            </div>
          </form>

          <div ref={resultRef} className="scroll-mt-24">
            <AnimatePresence mode="wait">
              {phase === 'idle' && (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <EmptyState icon={MessageSquareText} title="Your result will appear here">
                    You’ll see a risk level, the specific signals found and what to do next.
                  </EmptyState>
                </motion.div>
              )}
              {phase === 'scanning' && <LoadingAnimation key="loading" steps={STEPS} title="Analyzing message" />}
              {phase === 'error' && (
                <motion.div key="error">
                  <ErrorState message={error} onRetry={submit} />
                </motion.div>
              )}
              {phase === 'done' && result && (
                <motion.div key="result">
                  <RiskResult
                    result={result}
                    onScanAgain={again}
                    signedIn={isAuthenticated}
                    reportPrefill={{ scam_type: result.category, content: text, url: result.links?.[0] || '' }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScannerLayout>
      </div>
    </Container>
  )
}
