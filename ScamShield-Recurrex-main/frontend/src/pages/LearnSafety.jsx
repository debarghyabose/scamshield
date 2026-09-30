import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Building2, Check, Gift, KeyRound, Link2, RotateCcw, Smartphone, X } from 'lucide-react'
import { Container, Modal, PageHeader } from '../components/ui'

const TOPICS = [
  {
    id: 'otp',
    icon: KeyRound,
    title: 'Never share OTPs',
    summary: 'An OTP is the final key to your account. Anyone asking for it is trying to get in.',
    how: 'Scammers trigger a real login or payment on your account, then call or message pretending to be your bank, a delivery agent or customer support and ask you to “confirm” the code.',
    signs: ['Someone calls asking you to read out a code you just received', 'The SMS says “Do not share” but the caller insists it’s fine', 'You’re told the OTP is needed to cancel a charge or receive a refund'],
    actions: ['Never read out or type an OTP for someone else', 'Hang up and call your bank using the number on your card', 'If you shared one, call your bank and 1930 immediately'],
  },
  {
    id: 'phishing',
    icon: Link2,
    title: 'Recognising phishing links',
    summary: 'Fake sites copy real brands. The address bar tells you where you really are.',
    how: 'Links in SMS, email or WhatsApp lead to lookalike pages that capture your login, card or UPI details. Many use HTTPS, so the padlock alone proves nothing.',
    signs: ['Misspelt brand names such as amaz0n or hdfcbannk', 'Brand names in the wrong place, e.g. sbi.kyc-update.xyz', 'Shortened links you can’t preview', 'Unusual endings like .xyz, .top or .shop for a bank'],
    actions: ['Type the official address yourself instead of tapping links', 'Use the bank’s official app for anything account-related', 'Check suspicious links with ScamShield first'],
  },
  {
    id: 'prize',
    icon: Gift,
    title: 'Fake prize messages',
    summary: 'You can’t win a draw you never entered. Prizes that need a fee are never real.',
    how: 'Messages announce lottery wins, KBC prizes or cashback, then ask for a “processing fee”, tax or your bank details to release the money.',
    signs: ['Congratulations for a contest you never entered', 'A fee or tax to claim your prize', 'Deadlines like “claim within 2 hours”', 'Requests to scan a QR code to receive money'],
    actions: ['Don’t reply or click', 'Never pay to receive money', 'Report the number via Chakshu on sancharsaathi.gov.in'],
  },
  {
    id: 'bank',
    icon: Building2,
    title: 'Bank impersonation',
    summary: 'Banks don’t threaten to block accounts over SMS or ask for KYC by phone.',
    how: 'Callers or messages claim your account, card or KYC is about to be blocked and push you to update details, install an app or move money to a “safe account”.',
    signs: ['Threats of blocking, penalties or arrest', 'Requests to install AnyDesk, TeamViewer or an APK', 'Being asked to move money to a “safe” or “RBI” account', 'Callers who already know some of your details'],
    actions: ['End the call — genuine bank staff won’t mind', 'Visit your branch or use the official app to check', 'Never install apps at a caller’s request'],
  },
  {
    id: 'payments',
    icon: Smartphone,
    title: 'Safe digital payments',
    summary: 'In UPI, entering your PIN always sends money. It never receives it.',
    how: 'Fraudsters send collect requests or QR codes labelled “refund” or “prize”. Approving them debits your account. Others pressure you into large transfers to new payees.',
    signs: ['A collect request you didn’t expect', 'Being told to scan a QR code to get money', 'Pressure to pay quickly to a new payee', 'Anyone asking for your UPI PIN'],
    actions: ['Decline unexpected collect requests', 'Check the payee name before you confirm', 'Send a small test amount to new payees', 'Set daily limits in your UPI app'],
  },
]

const QUIZ = [
  {
    q: '“Your SBI account will be blocked today. Update your PAN at sbi-kyc-update.xyz.” What should you do?',
    options: ['Update quickly to avoid the block', 'Ignore the link and check in the official SBI app', 'Reply asking for more details'],
    answer: 1,
    why: 'The threat is designed to rush you, and the domain isn’t SBI’s. Check through official channels only.',
  },
  {
    q: 'A buyer on a marketplace sends a UPI request saying “Enter your PIN to receive ₹5,000.” Is this safe?',
    options: ['Yes, it’s how UPI refunds work', 'No — entering a PIN always sends money'],
    answer: 1,
    why: 'You never need a PIN to receive money. This is a collect-request scam.',
  },
  {
    q: 'You get: “Your OTP for login is 482913. Do not share it with anyone.” You did just try to log in. Is the SMS itself a scam?',
    options: ['Likely genuine — just don’t share the code', 'Definitely a scam'],
    answer: 0,
    why: 'Genuine OTP messages look like this. The danger is someone asking you for the code afterwards.',
  },
  {
    q: 'A caller from “customer care” asks you to install AnyDesk so they can process your refund. What’s the risk?',
    options: ['None, it just speeds things up', 'They can see your screen, OTPs and control your phone'],
    answer: 1,
    why: 'Remote-access apps give a stranger full view of your phone, including OTPs and banking apps.',
  },
  {
    q: 'Which link is most likely to be the real Amazon India?',
    options: ['amazon.in', 'amaz0n-offers.shop', 'amazon-india.gift-rewards.top'],
    answer: 0,
    why: 'The registered domain — the part just before the ending — must be exactly the brand’s.',
  },
]

function Quiz() {
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState(null)
  const [score, setScore] = useState(0)
  const done = i >= QUIZ.length
  const item = QUIZ[i]

  const choose = (idx) => {
    if (picked !== null) return
    setPicked(idx)
    if (idx === item.answer) setScore((s) => s + 1)
  }
  const next = () => {
    setPicked(null)
    setI((n) => n + 1)
  }
  const restart = () => {
    setI(0)
    setPicked(null)
    setScore(0)
  }

  return (
    <section className="card overflow-hidden" aria-labelledby="quiz-heading">
      <div className="flex items-center justify-between border-b border-ink-150 px-5 py-4 sm:px-6">
        <div>
          <h2 id="quiz-heading" className="text-base font-semibold">
            Scam or safe? Quick quiz
          </h2>
          <p className="text-xs text-ink-500">5 real-world scenarios</p>
        </div>
        <span className="font-mono text-xs text-ink-500">{done ? 'Done' : `${i + 1} / ${QUIZ.length}`}</span>
      </div>
      <div className="h-1 bg-ink-100">
        <motion.div className="h-1 bg-ink-900" animate={{ width: `${(Math.min(i + (picked !== null ? 1 : 0), QUIZ.length) / QUIZ.length) * 100}%` }} />
      </div>

      <div className="p-5 sm:p-6">
        <AnimatePresence mode="wait">
          {done ? (
            <motion.div key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="py-4 text-center">
              <div className="font-mono text-4xl font-medium text-ink-900">
                {score}/{QUIZ.length}
              </div>
              <p className="mt-2 text-sm text-ink-600">
                {score === QUIZ.length
                  ? 'Perfect. You know the warning signs.'
                  : score >= 3
                    ? 'Good instincts. Review the topics above for the ones you missed.'
                    : 'Worth a second look — the topics above cover each of these scams.'}
              </p>
              <button type="button" onClick={restart} className="btn btn-secondary mt-5">
                <RotateCcw size={15} /> Try again
              </button>
            </motion.div>
          ) : (
            <motion.div key={i} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
              <p className="text-[15px] leading-relaxed font-medium text-ink-900">{item.q}</p>
              <div className="mt-4 grid gap-2" role="group" aria-label="Answers">
                {item.options.map((opt, idx) => {
                  const isAnswer = idx === item.answer
                  const isPicked = idx === picked
                  const reveal = picked !== null
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => choose(idx)}
                      disabled={reveal}
                      aria-pressed={isPicked}
                      className={`flex min-h-12 items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors disabled:cursor-default ${
                        reveal && isAnswer
                          ? 'border-safe-500 bg-safe-50 text-safe-700'
                          : reveal && isPicked
                            ? 'border-danger-500 bg-danger-50 text-danger-700'
                            : reveal
                              ? 'border-ink-200 text-ink-400'
                              : 'border-ink-200 text-ink-800 hover:border-ink-400 hover:bg-ink-50'
                      }`}
                    >
                      {opt}
                      {reveal && isAnswer && <Check size={16} className="shrink-0" />}
                      {reveal && isPicked && !isAnswer && <X size={16} className="shrink-0" />}
                    </button>
                  )
                })}
              </div>
              <AnimatePresence>
                {picked !== null && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                    <div className="mt-4 flex flex-col gap-3 rounded-lg bg-ink-50 p-4 sm:flex-row sm:items-center">
                      <p className="flex-1 text-[13px] leading-relaxed text-ink-700" aria-live="polite">
                        <strong className={picked === item.answer ? 'text-safe-700' : 'text-danger-700'}>{picked === item.answer ? 'Correct. ' : 'Not quite. '}</strong>
                        {item.why}
                      </p>
                      <button type="button" onClick={next} className="btn btn-primary shrink-0" autoFocus>
                        {i === QUIZ.length - 1 ? 'See score' : 'Next'} <ArrowRight size={15} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}

export default function LearnSafety() {
  const [open, setOpen] = useState(null)
  const topic = TOPICS.find((t) => t.id === open)

  return (
    <Container>
      <PageHeader
        eyebrow="Resources"
        title="Learn safety"
        description="Five habits that stop most scams in India. Each takes less than a minute to read."
      />

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOPICS.map((t, idx) => {
          const Icon = t.icon
          return (
            <motion.button
              key={t.id}
              type="button"
              onClick={() => setOpen(t.id)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.4 }}
              whileHover={{ y: -3 }}
              className="group card flex flex-col p-5 text-left transition-[box-shadow,border-color] hover:border-ink-300 hover:shadow-[var(--shadow-raised)]"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-ink-200 bg-ink-50 text-ink-700 group-hover:border-brand-100 group-hover:bg-brand-50 group-hover:text-brand-700">
                  <Icon size={18} strokeWidth={1.75} />
                </span>
                <span className="font-mono text-[11px] text-ink-400">0{idx + 1}</span>
              </div>
              <h3 className="mt-4 text-base font-semibold text-ink-900">{t.title}</h3>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-ink-600">{t.summary}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-900">
                Warning signs <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </motion.button>
          )
        })}
        <div className="light-scope card flex flex-col justify-between bg-ink-900 p-5 text-white">
          <div>
            <p className="eyebrow text-ink-400">If you’ve been scammed</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">Call 1930</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-300">India’s national cyber-fraud helpline. Reporting within the first hour gives the best chance of freezing the money.</p>
          </div>
          <a href="https://cybercrime.gov.in" target="_blank" rel="noreferrer noopener" className="mt-5 text-sm font-medium text-white underline decoration-ink-600 underline-offset-4 hover:decoration-white">
            cybercrime.gov.in ↗
          </a>
        </div>
      </div>

      <div className="mt-10">
        <Quiz />
      </div>

      <Modal open={!!topic} onClose={() => setOpen(null)} title={topic?.title || ''}>
        {topic && (
          <div className="space-y-5">
            <p className="text-[15px] leading-relaxed text-ink-700">{topic.how}</p>
            <div>
              <h3 className="eyebrow">Warning signs</h3>
              <ul className="mt-2 space-y-2">
                {topic.signs.map((s) => (
                  <li key={s} className="flex gap-2.5 text-sm text-ink-800">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-warn-500" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="eyebrow">What to do</h3>
              <ul className="mt-2 space-y-2">
                {topic.actions.map((s) => (
                  <li key={s} className="flex gap-2.5 text-sm text-ink-800">
                    <Check size={15} className="mt-0.5 shrink-0 text-safe-600" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </Container>
  )
}
