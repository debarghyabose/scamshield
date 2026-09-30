import { revealResult } from '../utils/format'
import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, CreditCard, Info, ScanSearch } from 'lucide-react'
import ScannerLayout, { CheckList } from '../components/ScannerLayout'
import LoadingAnimation from '../components/LoadingAnimation'
import RiskResult from '../components/RiskResult'
import { Container, EmptyState, ErrorState, PageHeader } from '../components/ui'
import { useScan } from '../hooks/useScan'
import { api } from '../services/api'
import { PAYMENT_FLAGS } from '../utils/constants'
import { EXAMPLE_PAYMENTS } from '../data/examples'
import ScanTypeTabs from '../components/ScanTypeTabs'
import ScanBeamOverlay from '../components/ScanBeamOverlay'
import SaveOption from '../components/SaveOption'
import { useAuth } from '../context/AuthContext'

const STEPS = ['Comparing with your usual amount', 'Checking payee history', 'Reviewing timing and frequency', 'Weighing reported behaviour', 'Scoring risk']

const nowTime = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const EMPTY = { amount: '', payee_type: 'new', time: nowTime(), frequency_24h: '1', average_amount: '', flags: [] }

function validate(v) {
  const e = {}
  const amount = Number(v.amount)
  if (!v.amount) e.amount = 'Enter the amount.'
  else if (!(amount > 0)) e.amount = 'Amount must be more than ₹0.'
  else if (amount > 10_000_000) e.amount = 'Amount looks too large (max ₹1 crore).'
  if (!v.average_amount) e.average_amount = 'Enter your typical payment amount.'
  else if (!(Number(v.average_amount) > 0)) e.average_amount = 'Must be more than ₹0.'
  if (!v.time) e.time = 'Choose a time.'
  const f = Number(v.frequency_24h)
  if (v.frequency_24h === '' || !Number.isInteger(f) || f < 0 || f > 200) e.frequency_24h = 'Enter a whole number from 0 to 200.'
  return e
}

function Field({ id, label, error, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {children}
      {error ? (
        <p className="field-error" role="alert">
          <AlertCircle size={13} /> {error}
        </p>
      ) : (
        hint && <p className="field-hint">{hint}</p>
      )}
    </div>
  )
}

const inr = (n) => '₹' + Number(n).toLocaleString('en-IN')

export default function PaymentScanner() {
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [save, setSave] = useState(true)
  const { isAuthenticated } = useAuth()
  const resultRef = useRef(null)
  const formRef = useRef(null)
  const { phase, result, error, run, reset, shieldStatus } = useScan(api.scanTransaction, 'payment')

  const set = (key, val) => {
    setValues((v) => ({ ...v, [key]: val }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
    if (phase === 'done' || phase === 'error') reset()
  }

  const toggleFlag = (id) =>
    set('flags', values.flags.includes(id) ? values.flags.filter((f) => f !== id) : [...values.flags, id])

  const submit = (e) => {
    e?.preventDefault()
    const errs = validate(values)
    setErrors(errs)
    if (Object.keys(errs).length) {
      formRef.current?.querySelector('[aria-invalid="true"]')?.focus()
      return
    }
    const payload = {
      ...values,
      amount: Number(values.amount),
      average_amount: Number(values.average_amount),
      frequency_24h: Number(values.frequency_24h),
    }
    run({ ...payload, save }).then(() => revealResult(resultRef))
  }

  const again = () => {
    reset()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <Container>
      <PageHeader
        eyebrow="Scanner 03 · Payment"
        title="Check a payment request"
        description="Describe the payment you’re about to make. ScamShield compares it with your usual activity and the tactics scammers use."
      />

      <div className="mt-6">
        <ScanTypeTabs />
      </div>

      <div className="mt-6">
        <ScannerLayout
          status={shieldStatus}
          aside={
            <CheckList
              items={['Amount compared with your average', 'New vs. existing payee', 'Time of day and payment frequency', 'Behaviour you report, e.g. “pay to receive”']}
            />
          }
        >
          <form ref={formRef} onSubmit={submit} className="card relative p-5 sm:p-6" noValidate>
            <ScanBeamOverlay active={phase === 'scanning'} />
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="amount" label="Transaction amount" error={errors.amount}>
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-500">₹</span>
                  <input
                    id="amount"
                    inputMode="decimal"
                    value={values.amount}
                    onChange={(e) => set('amount', e.target.value.replace(/[^\d.]/g, ''))}
                    placeholder="0"
                    aria-invalid={!!errors.amount}
                    className="input h-12 pl-8 font-mono text-base tabular sm:text-[15px]"
                  />
                </div>
              </Field>

              <Field id="average_amount" label="Your average payment" error={errors.average_amount} hint="Roughly what you usually send.">
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-500">₹</span>
                  <input
                    id="average_amount"
                    inputMode="decimal"
                    value={values.average_amount}
                    onChange={(e) => set('average_amount', e.target.value.replace(/[^\d.]/g, ''))}
                    placeholder="0"
                    aria-invalid={!!errors.average_amount}
                    className="input h-12 pl-8 font-mono text-base tabular sm:text-[15px]"
                  />
                </div>
              </Field>

              <fieldset className="sm:col-span-2">
                <legend className="field-label">Payee</legend>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['new', 'New payee', 'Never paid them before'],
                    ['existing', 'Existing payee', 'Paid them before'],
                  ].map(([val, title, sub]) => (
                    <label
                      key={val}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500 ${
                        values.payee_type === val ? 'border-ink-900 bg-ink-50' : 'border-ink-200 hover:border-ink-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payee_type"
                        value={val}
                        checked={values.payee_type === val}
                        onChange={() => set('payee_type', val)}
                        className="mt-0.5 accent-ink-900"
                      />
                      <span>
                        <span className="block text-sm font-medium text-ink-900">{title}</span>
                        <span className="block text-xs text-ink-500">{sub}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <Field id="time" label="Transaction time" error={errors.time}>
                <input id="time" type="time" value={values.time} onChange={(e) => set('time', e.target.value)} aria-invalid={!!errors.time} className="input h-12 font-mono text-base sm:text-[15px]" />
              </Field>

              <Field id="frequency_24h" label="Payments in the last 24 hours" error={errors.frequency_24h}>
                <input
                  id="frequency_24h"
                  type="number"
                  min="0"
                  max="200"
                  step="1"
                  value={values.frequency_24h}
                  onChange={(e) => set('frequency_24h', e.target.value)}
                  aria-invalid={!!errors.frequency_24h}
                  className="input h-12 font-mono text-base tabular sm:text-[15px]"
                />
              </Field>
            </div>

            <fieldset className="mt-6">
              <legend className="field-label">
                Anything unusual about this request? <span className="font-normal text-ink-500">(optional)</span>
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {PAYMENT_FLAGS.map((f) => {
                  const on = values.flags.includes(f.id)
                  return (
                    <label
                      key={f.id}
                      className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-[13px] leading-snug transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500 ${
                        on ? 'border-ink-900 bg-ink-50 text-ink-900' : 'border-ink-200 text-ink-700 hover:border-ink-400'
                      }`}
                    >
                      <input type="checkbox" checked={on} onChange={() => toggleFlag(f.id)} className="mt-0.5 h-4 w-4 shrink-0 accent-ink-900" />
                      {f.label}
                    </label>
                  )
                })}
              </div>
            </fieldset>

            <p className="mt-5 flex items-start gap-2 rounded-lg bg-ink-50 px-3.5 py-2.5 text-[13px] leading-relaxed text-ink-600">
              <Info size={15} className="mt-0.5 shrink-0 text-ink-500" />
              A high amount or an unusual hour is context, not evidence of fraud. On their own they can raise a payment to “suspicious” at most.
            </p>

            <div className="mt-5">
              <span className="text-xs font-medium text-ink-500">Try an example</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {EXAMPLE_PAYMENTS.map((ex) => (
                  <button
                    key={ex.label}
                    type="button"
                    onClick={() => {
                      setValues({ ...ex.values })
                      setErrors({})
                      reset()
                    }}
                    className="min-h-9 rounded-full border border-ink-200 bg-surface px-3 py-1.5 text-xs font-medium text-ink-700 transition-colors hover:border-ink-400"
                  >
                    {ex.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <SaveOption save={save} onChange={setSave} />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 border-t border-ink-150 pt-5 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
              <button type="submit" className="btn btn-primary h-12 w-full px-5 text-[15px] sm:w-auto" disabled={phase === 'scanning'}>
                <ScanSearch size={16} /> {phase === 'scanning' ? 'Analyzing…' : 'Analyze Payment'}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setValues({ ...EMPTY, time: nowTime() })
                  setErrors({})
                  reset()
                }}
              >
                Reset form
              </button>
            </div>
          </form>

          <div ref={resultRef} className="scroll-mt-24">
            <AnimatePresence mode="wait">
              {phase === 'idle' && (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <EmptyState icon={CreditCard} title="No payment analyzed yet">
                    Fill in the details above. Nothing is sent to your bank or payment app — this is a pre-payment check.
                  </EmptyState>
                </motion.div>
              )}
              {phase === 'scanning' && <LoadingAnimation key="loading" steps={STEPS} title="Analyzing payment" />}
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
                    reportPrefill={{
                      scam_type: values.flags.includes('pay_to_receive') || values.flags.includes('unknown_qr') ? 'UPI collect request' : 'Other',
                      content: `Payment request of ${inr(values.amount)} to a ${values.payee_type} payee.`,
                    }}
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
