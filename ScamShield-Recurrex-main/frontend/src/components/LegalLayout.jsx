import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Container } from './ui'

/** Shared layout for legal pages: sticky contents list + readable prose column. */
export default function LegalLayout({ eyebrow, title, updated, intro, sections, other }) {
  const [active, setActive] = useState(sections[0]?.id)

  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter(Boolean)
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: '-80px 0px -60% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [sections])

  return (
    <Container>
      <div className="max-w-3xl">
        <div className="eyebrow mb-2">{eyebrow}</div>
        <h1 className="text-[32px] leading-tight font-semibold tracking-[-0.02em]">{title}</h1>
        <p className="mt-2 font-mono text-xs text-ink-500">Last updated {updated}</p>
        <p className="mt-5 text-[15px] leading-relaxed text-ink-700">{intro}</p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="On this page" className="hidden lg:block">
          <div className="sticky top-24">
            <p className="eyebrow mb-3">On this page</p>
            <ol className="space-y-1 border-l border-ink-200">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className={`-ml-px block border-l py-1 pl-3 text-[13px] leading-snug transition-colors ${
                      active === s.id ? 'border-ink-900 font-medium text-ink-900' : 'border-transparent text-ink-500 hover:text-ink-800'
                    }`}
                  >
                    {i + 1}. {s.title}
                  </a>
                </li>
              ))}
            </ol>
            <Link to={other.to} className="mt-6 block text-[13px] font-medium text-brand-700 hover:underline">
              {other.label} →
            </Link>
          </div>
        </nav>

        <article className="max-w-[68ch] min-w-0">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-24 border-t border-ink-150 py-7 first:border-0 first:pt-0">
              <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink-900">
                <span className="mr-2 font-mono text-sm text-ink-400">{String(i + 1).padStart(2, '0')}</span>
                {s.title}
              </h2>
              <div className="legal-prose mt-3 space-y-3 text-[15px] leading-relaxed text-ink-700">{s.body}</div>
            </section>
          ))}
          <p className="border-t border-ink-150 pt-6 text-sm text-ink-500 lg:hidden">
            See also: <Link to={other.to} className="font-medium text-brand-700">{other.label}</Link>
          </p>
        </article>
      </div>
    </Container>
  )
}
