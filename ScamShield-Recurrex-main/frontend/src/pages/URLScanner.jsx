import { revealResult } from '../utils/format'
import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, EyeOff, Link2, ScanSearch, X } from 'lucide-react'
import ScannerLayout, { CheckList } from '../components/ScannerLayout'
import LoadingAnimation from '../components/LoadingAnimation'
import RiskResult from '../components/RiskResult'
import { Container, EmptyState, ErrorState, PageHeader } from '../components/ui'
import { useScan } from '../hooks/useScan'
import { api } from '../services/api'
import { parseUrl } from '../utils/validation'
import { EXAMPLE_URLS } from '../data/examples'
import ScanTypeTabs from '../components/ScanTypeTabs'
import ScanBeamOverlay from '../components/ScanBeamOverlay'
import SaveOption from '../components/SaveOption'
import { useAuth } from '../context/AuthContext'

const STEPS = ['Parsing the address (without opening it)', 'Checking domain structure', 'Comparing with official domains', 'Checking sample blocklist', 'Scoring risk']

export default function URLScanner() {
  const [value, setValue] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [save, setSave] = useState(true)
  const { isAuthenticated } = useAuth()
  const inputRef = useRef(null)
  const resultRef = useRef(null)
  const { phase, result, error, run, reset, shieldStatus } = useScan(api.scanUrl, 'url')

  const validate = (v) => {
    const p = parseUrl(v)
    setFieldError(p.ok ? '' : p.error)
    return p.ok
  }

  const submit = (e) => {
    e?.preventDefault()
    if (!validate(value)) {
      inputRef.current?.focus()
      return
    }
    run({ url: value.trim(), save }).then(() => revealResult(resultRef))
  }

  const again = () => {
    reset()
    inputRef.current?.focus()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <Container>
      <PageHeader
        eyebrow="Scanner 02 · URL"
        title="Check a link"
        description="Paste a link you received. ScamShield inspects the address itself and never opens or visits the page."
      />

      <div className="mt-6">
        <ScanTypeTabs />
      </div>

      <div className="mt-6">
        <ScannerLayout
          status={shieldStatus}
          aside={
            <CheckList
              items={['Suspicious domain patterns (IPs, shorteners, risky TLDs)', 'HTTPS status', 'Brand lookalikes and domain mismatch', 'Sample blocklist match', 'Pressure keywords like “verify” or “claim”']}
            />
          }
        >
          <form onSubmit={submit} className="card p-5 sm:p-6" noValidate>
            <label htmlFor="url" className="field-label">
              Link or domain
            </label>
            <div className="relative rounded-lg">
              <ScanBeamOverlay active={phase === 'scanning'} />
              <Link2 size={17} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-400" />
              <input
                id="url"
                ref={inputRef}
                type="text"
                inputMode="url"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value)
                  if (fieldError) setFieldError('')
                  if (phase !== 'scanning' && phase !== 'idle') reset()
                }}
                onBlur={() => value && validate(value)}
                placeholder="https://example.com/login"
                aria-invalid={!!fieldError}
                aria-describedby="url-help"
                readOnly={phase === 'scanning'}
                className="input h-12 pr-12 pl-10 font-mono text-base sm:text-[14px]"
              />
              {value && (
                <button
                  type="button"
                  onClick={() => {
                    setValue('')
                    setFieldError('')
                    reset()
                    inputRef.current?.focus()
                  }}
                  className="absolute top-1/2 right-1 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-ink-400 hover:bg-ink-100 hover:text-ink-800"
                  aria-label="Clear URL"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            {fieldError ? (
              <p className="field-error" role="alert">
                <AlertCircle size={13} /> {fieldError}
              </p>
            ) : (
              <p id="url-help" className="field-hint flex items-center gap-1.5">
                <EyeOff size={13} /> The link is analysed as text only. It is never opened.
              </p>
            )}

            <div className="mt-5">
              <span className="text-xs font-medium text-ink-500">Try an example</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {EXAMPLE_URLS.map((ex) => (
                  <button
                    key={ex.label}
                    type="button"
                    onClick={() => {
                      setValue(ex.url)
                      setFieldError('')
                      reset()
                    }}
                    title={ex.url}
                    className={`min-h-9 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      value === ex.url ? 'border-ink-900 bg-ink-900 text-surface' : 'border-ink-200 bg-surface text-ink-700 hover:border-ink-400'
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

            <div className="mt-4 flex items-center gap-3 border-t border-ink-150 pt-5">
              <button type="submit" className="btn btn-primary h-12 w-full px-5 text-[15px] sm:w-auto" disabled={phase === 'scanning'}>
                <ScanSearch size={16} /> {phase === 'scanning' ? 'Analyzing…' : 'Analyze URL'}
              </button>
            </div>
          </form>

          <div ref={resultRef} className="scroll-mt-24">
            <AnimatePresence mode="wait">
              {phase === 'idle' && (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <EmptyState icon={Link2} title="No link checked yet">
                    Results list each signal separately. A signal is a reason for caution, not proof a site is malicious.
                  </EmptyState>
                </motion.div>
              )}
              {phase === 'scanning' && <LoadingAnimation key="loading" steps={STEPS} title="Analyzing link" />}
              {phase === 'error' && (
                <motion.div key="error">
                  <ErrorState message={error} onRetry={submit} />
                </motion.div>
              )}
              {phase === 'done' && result && (
                <motion.div key="result">
                  <RiskResult result={result} onScanAgain={again} signedIn={isAuthenticated} reportPrefill={{ scam_type: 'Phishing link', url: value.trim() }} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScannerLayout>
      </div>
    </Container>
  )
}
