import { useState } from 'react'
import { initials } from '../utils/format'

const SIZES = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-20 w-20 text-2xl', xl: 'h-24 w-24 text-3xl' }

/** Profile picture with an initials fallback (also used if the image fails to load). */
export default function Avatar({ src, name, email, size = 'sm', className = '' }) {
  const [failed, setFailed] = useState(null)
  const showImg = src && failed !== src
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 font-semibold text-brand-800 ${SIZES[size]} ${className}`}
    >
      {showImg ? (
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={() => setFailed(src)}
        />
      ) : (
        <span aria-hidden="true">{initials(name, email)}</span>
      )}
    </span>
  )
}
