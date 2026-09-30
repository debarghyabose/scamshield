export function LogoMark({ className = 'h-8 w-8' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d="M16 2.5 27 6v8.6c0 7-4.6 12.3-11 14.9C9.6 26.9 5 21.6 5 14.6V6l11-3.5Z" className="fill-ink-900" />
      <path d="M16 7.2 22.6 9.3v5.2c0 4.3-2.7 7.6-6.6 9.3-3.9-1.7-6.6-5-6.6-9.3V9.3L16 7.2Z" fill="#1F57E6" />
      <circle cx="16" cy="13.4" r="2.2" fill="#fff" />
      <path d="M15 15h2l.6 4.2h-3.2L15 15Z" fill="#fff" />
    </svg>
  )
}

export default function Logo({ collapsed = false }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      {!collapsed && <span className="text-[17px] font-semibold tracking-[-0.01em] text-ink-900">ScamShield</span>}
    </span>
  )
}
