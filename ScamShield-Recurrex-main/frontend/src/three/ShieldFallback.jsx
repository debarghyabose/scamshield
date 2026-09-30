import { STATUS_COLORS } from './shieldColors'

/*
  Lightweight SVG shield used when WebGL isn't available, while the 3D scene
  loads, or when the device can't render 3D smoothly (?3d=off forces it).
*/
const SHIELD_PATH =
  'M100 14 C128 30 158 24 180 28 L180 110 C180 164 140 194 100 218 C60 194 20 164 20 110 L20 28 C42 24 72 30 100 14 Z'

function Emblem({ status, color }) {
  if (status === 'safe') {
    return <path d="M70 118 L92 140 L134 96" fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
  }
  if (status === 'suspicious' || status === 'dangerous') {
    return (
      <g fill={color}>
        <rect x="93" y="76" width="14" height="52" rx="7" />
        <circle cx="100" cy="146" r="8" />
      </g>
    )
  }
  return (
    <g fill={color}>
      <circle cx="100" cy="100" r="16" />
      <path d="M92 108 h16 l6 36 h-28 Z" />
    </g>
  )
}

export default function ShieldFallback({ status = 'idle', loading = false }) {
  const color = STATUS_COLORS[status] || STATUS_COLORS.idle
  const alert = status === 'suspicious' || status === 'dangerous'
  return (
    <div className="flex h-full w-full items-center justify-center">
      <svg viewBox="-40 -30 280 300" className="h-full max-h-[420px] w-full max-w-[380px]" aria-hidden="true">
        <defs>
          <linearGradient id="fb-rim" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.5" stopColor="#d7dde7" />
            <stop offset="1" stopColor="#aeb8c7" />
          </linearGradient>
          <linearGradient id="fb-face" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor={color} stopOpacity="0.14" />
          </linearGradient>
          <clipPath id="fb-clip">
            <path d={SHIELD_PATH} />
          </clipPath>
        </defs>

        {/* Platform */}
        <ellipse cx="100" cy="254" rx="96" ry="14" fill="#eef1f6" stroke={color} strokeOpacity="0.35" />
        <ellipse cx="100" cy="254" rx="64" ry="9" fill="none" stroke={color} strokeOpacity="0.5" strokeDasharray="4 5" />

        {/* Orbit */}
        <ellipse cx="100" cy="116" rx="128" ry="36" fill="none" stroke={color} strokeOpacity="0.25" transform="rotate(-12 100 116)" />
        {status === 'dangerous' && (
          <ellipse cx="100" cy="130" rx="118" ry="30" fill="none" stroke={color} strokeWidth="2.5" className="ss-pulse" />
        )}

        <g className={loading ? '' : 'ss-float'}>
          <path d={SHIELD_PATH} fill="url(#fb-rim)" stroke="#9aa6b8" strokeWidth="1" />
          <path d={SHIELD_PATH} transform="translate(100 116) scale(0.8) translate(-100 -116)" fill="url(#fb-face)" stroke={color} strokeWidth="2" />
          <path d={SHIELD_PATH} fill="none" stroke={color} strokeWidth="2.5" strokeOpacity="0.9" />
          <g className={alert ? 'ss-pulse' : ''}>
            <Emblem status={status} color={color} />
          </g>
          {status === 'scanning' && (
            <g clipPath="url(#fb-clip)">
              <rect x="0" y="110" width="200" height="4" fill={STATUS_COLORS.scanning} className="ss-sweep" />
            </g>
          )}
        </g>
      </svg>
    </div>
  )
}
