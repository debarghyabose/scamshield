import { useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, Check, ChevronDown, ExternalLink, Flag, Loader2, Phone } from 'lucide-react'
import { Container, ErrorState, PageHeader, Skeleton } from '../components/ui'
import { useAppState } from '../context/AppState'
import { useApi } from '../hooks/useApi'
import { api } from '../services/api'
import { isPhone, parseUrl } from '../utils/validation'
import { SCAM_TYPES } from '../utils/constants'
import { timeAgo, truncate } from '../utils/format'

// Map scanner categories onto report types.
const CATEGORY_TO_TYPE = {
  'Prize / lottery': 'Prize / lottery',
  'Phishing link': 'Phishing link',
  'KYC / bank impersonation': 'Fake KYC / bank',
  'Job / task scam': 'Job / task scam',
  'Investment scam': 'Investment / crypto',
  Impersonation: 'Impersonation',
  'Remote access': 'Impersonation',
  'Delivery / courier': 'Delivery / courier',
  'UPI collect request': 'UPI collect request',
}

const EMPTY = { scam_type: '', content: '', phone_number: '', url: '', description: '', consent: false }

function validate(v) {
  const e = {}
  if (!v.scam_type) e.scam_type = 'Choose the type of scam.'
  if (v.content.trim().length < 10) e.content = 'Paste the message or describe what happened (at least 10 characters).'
  if (v.phone_number.trim() && !isPhone(v.phone_number)) e.phone_number = 'Enter a valid phone number, e.g. +91 98765 43210.'
  if (v.url.trim()) {
    const p = parseUrl(v.url)
    if (!p.ok) e.url = p.error
  }
  if (!v.consent) e.consent = 'Please confirm you’ve read how reports are stored.'
  return e
}

export default function ReportScam() {
  const location = useLocation()
  const prefill = location.state?.prefill
  const initial = useMemo(
    () => ({
      ...EMPTY,
      scam_type: prefill?.scam_type ? CATEGORY_TO_TYPE[prefill.scam_type] || (SCAM_TYPES.includes(prefill.scam_type) ? prefill.scam_type : 'Other') : '',
      content: prefill?.content || '',
      url: prefill?.url || '',
    }),
    [prefill],
  )
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | submitting | success | error
  const [saved, setSaved] = useState(null)
  const [submitError, setSubmitError] = useState('')
  const formRef = useRef(null)
  const { dataVersion, invalidate } = useAppState()
  const mine = useApi((signal) => api.listReports({ signal }), [dataVersion])

  const set = (k, v) => {
    setValues((s) => ({ ...s, [k]: v }))
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }))
  }

  const submit = async (e) => {
    e?.preventDefault()
    const errs = validate(values)
    setErrors(errs)
    if (Object.keys(errs).length) {
      formRef.current?.querySelector('[aria-invalid="true"]')?.focus()
      return
    }
    setStatus('submitting')
    setSubmitError('')
    try {
      const res = await api.submitReport({
        scam_type: values.scam_type,
        content: values.content.trim(),
        phone_number: values.phone_number.trim() || null,
        url: values.url.trim() || null,
        description: values.description.trim() || null,
      })
      invalidate()
      setSaved(res)
      setStatus('success')
    } catch (err) {
      setSubmitError(err)
      setStatus('error')
    }
  }

  const another = () => {
    setValues(EMPTY)
    setErrors({})
    setSaved(null)
    setStatus('idle')
  }

  return (
    <Container>
      <PageHeader
        eyebrow="Community"
        title="Report a scam"
        description="Tell us about a scam message, number or link. Your report is saved privately to your account and helps us track scam patterns."
      />

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
        <div className="min-w-0">
          <AnimatePresence mode="wait">
            {status === 'success' && saved ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="card p-6 sm:p-8"
                role="status"
              >
                <motion.span
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.05 }}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-safe-50 text-safe-600 ring-8 ring-safe-50/50"
                >
                  <Check size={24} strokeWidth={2.5} />
                </motion.span>
                <h2 className="mt-5 text-xl font-semibold tracking-[-0.01em]">Thank you. Your report has been submitted.</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-600">
                  Your reference is <span className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-sm text-ink-900">{saved.reference}</span>. It’s
                  stored privately with your account — it isn’t published or automatically forwarded to your bank or the police.
                </p>
                <p className="mt-4 text-sm leading-relaxed text-ink-600">
                  If you lost money, call <strong className="text-ink-900">1930</strong> or file a complaint at cybercrime.gov.in as soon as possible.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <button type="button" onClick={another} className="btn btn-secondary">
                    Report another
                  </button>
                  <Link to="/dashboard" className="btn btn-primary">
                    Go to dashboard
                  </Link>
                </div>
              </motion.div>
            ) : (
              <motion.form key="form" ref={formRef} onSubmit={submit} noValidate className="card p-5 sm:p-6" exit={{ opacity: 0 }}>
                {prefill && (
                  <p className="mb-5 rounded-lg bg-brand-50 px-3.5 py-2.5 text-[13px] text-brand-800">Pre-filled from your last scan. Review before submitting.</p>
                )}
                <div>
                  <div>
                    <label htmlFor="scam_type" className="field-label">
                      Scam type
                    </label>
                    <div className="relative">
                      <select
                        id="scam_type"
                        value={values.scam_type}
                        onChange={(e) => set('scam_type', e.target.value)}
                        aria-invalid={!!errors.scam_type}
                        className="input h-12 appearance-none pr-10 text-base sm:h-11 sm:text-[15px]"
                      >
                        <option value="">Select…</option>
                        {SCAM_TYPES.map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-500" />
                    </div>
                    {errors.scam_type && (
                      <p className="field-error" role="alert">
                        <AlertCircle size={13} /> {errors.scam_type}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="phone_number" className="field-label">
                      Phone number <span className="font-normal text-ink-500">(optional)</span>
                    </label>
                    <input
                      id="phone_number"
                      type="tel"
                      inputMode="tel"
                      value={values.phone_number}
                      onChange={(e) => set('phone_number', e.target.value.slice(0, 32))}
                      placeholder="+91 98765 43210"
                      autoComplete="off"
                      aria-invalid={!!errors.phone_number}
                      className="input h-12 text-base sm:h-11 sm:text-[15px]"
                    />
                    {errors.phone_number && (
                      <p className="field-error" role="alert">
                        <AlertCircle size={13} /> {errors.phone_number}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="url" className="field-label">
                      URL <span className="font-normal text-ink-500">(optional)</span>
                    </label>
                    <input
                      id="url"
                      inputMode="url"
                      autoCapitalize="off"
                      spellCheck={false}
                      value={values.url}
                      onChange={(e) => set('url', e.target.value.slice(0, 2048))}
                      placeholder="suspicious-site.example"
                      autoComplete="off"
                      aria-invalid={!!errors.url}
                      className="input h-12 font-mono text-base sm:h-11 sm:text-[14px]"
                    />
                    {errors.url && (
                      <p className="field-error" role="alert">
                        <AlertCircle size={13} /> {errors.url}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-5">
                  <label htmlFor="content" className="field-label">
                    Message
                  </label>
                  <textarea
                    id="content"
                    rows={5}
                    value={values.content}
                    onChange={(e) => set('content', e.target.value.slice(0, 2000))}
                    placeholder="Paste the message you received, or describe the call."
                    aria-invalid={!!errors.content}
                    className="input resize-y leading-relaxed"
                  />
                  {errors.content && (
                    <p className="field-error" role="alert">
                      <AlertCircle size={13} /> {errors.content}
                    </p>
                  )}
                </div>

                <div className="mt-5">
                  <label htmlFor="description" className="field-label">
                    What happened? <span className="font-normal text-ink-500">(optional)</span>
                  </label>
                  <textarea
                    id="description"
                    rows={3}
                    value={values.description}
                    onChange={(e) => set('description', e.target.value.slice(0, 1000))}
                    placeholder="e.g. They called pretending to be from my bank and asked me to install an app."
                    className="input resize-y leading-relaxed"
                  />
                  <p className="field-hint">Don’t include your own OTPs, passwords or full card numbers.</p>
                </div>

                <label className="mt-5 flex min-h-11 cursor-pointer items-start gap-3 py-1 text-[13px] leading-relaxed text-ink-700">
                  <input
                    type="checkbox"
                    checked={values.consent}
                    onChange={(e) => set('consent', e.target.checked)}
                    aria-invalid={!!errors.consent}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-ink-900"
                  />
                  <span>
                    I understand this report is stored with my ScamShield account and isn’t published publicly, as described in the{' '}
                    <Link to="/privacy" className="font-medium text-brand-700 underline decoration-brand-200 underline-offset-2">
                      privacy policy
                    </Link>
                    .
                  </span>
                </label>
                {errors.consent && (
                  <p className="field-error" role="alert">
                    <AlertCircle size={13} /> {errors.consent}
                  </p>
                )}

                {status === 'error' && (
                  <div className="mt-5">
                    <ErrorState title="Report couldn’t be submitted" message={submitError} onRetry={submit} />
                  </div>
                )}

                <div className="mt-6 flex items-center gap-3 border-t border-ink-150 pt-5">
                  <button type="submit" className="btn btn-primary h-12 w-full px-5 text-[15px] sm:w-auto" disabled={status === 'submitting'}>
                    {status === 'submitting' ? <Loader2 size={16} className="animate-spin" /> : <Flag size={16} />}
                    {status === 'submitting' ? 'Submitting…' : 'Submit report'}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        <aside className="space-y-4">
          <section className="card p-5" aria-labelledby="official-heading">
            <h2 id="official-heading" className="text-sm font-semibold">
              Lost money? Act fast.
            </h2>
            <ul className="mt-3 space-y-3 text-[13px] leading-relaxed text-ink-600">
              <li className="flex gap-3">
                <Phone size={16} className="mt-0.5 shrink-0 text-ink-500" />
                <span>
                  Call <strong className="text-ink-900">1930</strong>, the national cyber-fraud helpline, and your bank.
                </span>
              </li>
              <li className="flex gap-3">
                <ExternalLink size={16} className="mt-0.5 shrink-0 text-ink-500" />
                <span>
                  File a complaint at{' '}
                  <a href="https://cybercrime.gov.in" target="_blank" rel="noreferrer noopener" className="font-medium text-brand-700 hover:underline">
                    cybercrime.gov.in
                  </a>
                </span>
              </li>
              <li className="flex gap-3">
                <ExternalLink size={16} className="mt-0.5 shrink-0 text-ink-500" />
                <span>
                  Report fraud calls and SMS via Chakshu on{' '}
                  <a href="https://sancharsaathi.gov.in" target="_blank" rel="noreferrer noopener" className="font-medium text-brand-700 hover:underline">
                    sancharsaathi.gov.in
                  </a>
                </span>
              </li>
            </ul>
          </section>

          <section className="card p-5" aria-labelledby="recent-reports-heading">
            <h2 id="recent-reports-heading" className="text-sm font-semibold">
              Your recent reports
            </h2>
            {mine.status === 'loading' && (
              <div className="mt-4 space-y-3">
                {[0, 1].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            )}
            {mine.status === 'error' && !mine.data && (
              <p className="mt-3 text-[13px] text-ink-500">
                Couldn’t load your reports.{' '}
                <button type="button" onClick={mine.retry} className="font-medium text-brand-700 hover:underline">
                  Retry
                </button>
              </p>
            )}
            {mine.data && mine.data.length === 0 && <p className="mt-3 text-[13px] text-ink-500">You haven’t submitted any reports yet.</p>}
            {mine.data && mine.data.length > 0 && (
              <ul className="mt-2 divide-y divide-ink-150">
                {mine.data.map((r) => (
                  <li key={r.id} className="py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-medium text-ink-900">{r.scam_type}</span>
                      <span className="shrink-0 font-mono text-[11px] text-ink-400">{timeAgo(r.created_at)}</span>
                    </div>
                    <p className="mt-0.5 text-[13px] leading-snug text-ink-600">{truncate(r.content, 90)}</p>
                    <span className="mt-1 inline-block font-mono text-[10px] text-ink-400">{r.reference}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs leading-relaxed text-ink-500">Only you can see your reports.</p>
          </section>
        </aside>
      </div>
    </Container>
  )
}
